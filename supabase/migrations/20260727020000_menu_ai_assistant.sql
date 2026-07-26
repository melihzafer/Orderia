-- Manager-reviewed catalog editing and rate-limited AI menu drafts.

create table public.menu_item_translations (
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  branch_id uuid,
  menu_item_id uuid not null,
  locale text not null check (locale in ('tr', 'bg', 'en')),
  name text not null check (char_length(trim(name)) between 1 and 160),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_item_translations_branch_organization_fkey
    foreign key (organization_id, branch_id)
    references public.branches (organization_id, id),
  constraint menu_item_translations_item_organization_fkey
    foreign key (organization_id, menu_item_id)
    references public.menu_items (organization_id, id)
    on delete cascade,
  primary key (menu_item_id, locale)
);

create index menu_item_translations_scope_idx
  on public.menu_item_translations (
    organization_id,
    branch_id,
    locale,
    menu_item_id
  );

create table public.menu_ai_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  branch_id uuid not null,
  client_request_id uuid not null,
  created_by uuid not null references auth.users (id),
  input_text text not null check (char_length(trim(input_text)) between 3 and 500),
  status text not null default 'processing'
    check (status in ('processing', 'ready', 'published', 'rejected', 'failed')),
  model text not null check (char_length(trim(model)) between 1 and 80),
  suggestion_json jsonb,
  reviewed_json jsonb,
  error_code text,
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  published_item_id uuid,
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  published_at timestamptz,
  constraint menu_ai_requests_branch_organization_fkey
    foreign key (organization_id, branch_id)
    references public.branches (organization_id, id)
    on delete cascade,
  constraint menu_ai_requests_published_item_fkey
    foreign key (organization_id, published_item_id)
    references public.menu_items (organization_id, id),
  constraint menu_ai_requests_state_check
    check (
      (status = 'processing' and completed_at is null)
      or (status <> 'processing' and completed_at is not null)
    ),
  unique (organization_id, branch_id, created_by, client_request_id)
);

create index menu_ai_requests_scope_created_idx
  on public.menu_ai_requests (organization_id, branch_id, created_at desc);
create index menu_ai_requests_creator_rate_idx
  on public.menu_ai_requests (created_by, created_at desc);

insert into public.allergens (code, name)
values
  ('GLUTEN', 'Gluten'),
  ('CRUSTACEANS', 'Crustaceans'),
  ('EGGS', 'Eggs'),
  ('FISH', 'Fish'),
  ('PEANUTS', 'Peanuts'),
  ('SOY', 'Soy'),
  ('MILK', 'Milk'),
  ('NUTS', 'Tree nuts'),
  ('CELERY', 'Celery'),
  ('MUSTARD', 'Mustard'),
  ('SESAME', 'Sesame'),
  ('SULPHITES', 'Sulphites'),
  ('LUPIN', 'Lupin'),
  ('MOLLUSCS', 'Molluscs')
on conflict (code) do nothing;

alter table public.menu_item_translations enable row level security;
alter table public.menu_item_translations force row level security;
alter table public.menu_ai_requests enable row level security;
alter table public.menu_ai_requests force row level security;

create policy menu_item_translations_member_select
on public.menu_item_translations
for select to authenticated
using ((select private.is_active_member(organization_id, branch_id)));

create policy menu_item_translations_manager_insert
on public.menu_item_translations
for insert to authenticated
with check ((select private.is_manager(organization_id, branch_id)));

create policy menu_item_translations_manager_update
on public.menu_item_translations
for update to authenticated
using ((select private.is_manager(organization_id, branch_id)))
with check ((select private.is_manager(organization_id, branch_id)));

create policy menu_item_translations_manager_delete
on public.menu_item_translations
for delete to authenticated
using ((select private.is_manager(organization_id, branch_id)));

create policy menu_ai_requests_manager_select
on public.menu_ai_requests
for select to authenticated
using ((select private.is_manager(organization_id, branch_id)));

revoke all on table
  public.menu_item_translations,
  public.menu_ai_requests
from anon, authenticated;
grant select on table
  public.menu_item_translations,
  public.menu_ai_requests
to authenticated;
grant insert, update, delete on table public.menu_item_translations
to authenticated;

create or replace function private.normalize_catalog_name(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(
    regexp_replace(
      trim(translate(coalesce(value, ''), 'ÇĞİIÖŞÜ', 'çğiıöşü')),
      '[[:space:]]+',
      ' ',
      'g'
    )
  );
$$;

create or replace function private.is_valid_menu_ai_suggestion(
  suggestion jsonb,
  expected_currency text
)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  item_json jsonb;
  entry jsonb;
begin
  if jsonb_typeof(suggestion) <> 'object'
    or suggestion ->> 'schemaVersion' <> '1'
    or jsonb_typeof(suggestion -> 'item') <> 'object'
    or jsonb_typeof(suggestion -> 'translations') <> 'array'
    or jsonb_typeof(suggestion -> 'modifierGroups') <> 'array'
    or jsonb_typeof(suggestion -> 'allergenSuggestions') <> 'array'
    or jsonb_typeof(suggestion -> 'warnings') <> 'array'
    or jsonb_array_length(suggestion -> 'translations') > 3
    or jsonb_array_length(suggestion -> 'modifierGroups') > 10
    or jsonb_array_length(suggestion -> 'allergenSuggestions') > 14
    or jsonb_array_length(suggestion -> 'warnings') > 10 then
    return false;
  end if;

  item_json := suggestion -> 'item';
  if char_length(trim(coalesce(item_json ->> 'name', ''))) not between 1 and 160
    or char_length(trim(coalesce(item_json ->> 'categoryName', ''))) not between 1 and 120
    or coalesce(item_json ->> 'currencyCode', '') <> expected_currency
    or coalesce(item_json ->> 'priceMinor', '') !~ '^[0-9]{1,12}$'
    or (item_json ->> 'priceMinor')::numeric > 999999999
    or (
      item_json -> 'prepTimeMinutes' <> 'null'::jsonb
      and coalesce(item_json ->> 'prepTimeMinutes', '') !~ '^[0-9]{1,4}$'
    )
    or coalesce((item_json ->> 'prepTimeMinutes')::integer, 0) > 1440 then
    return false;
  end if;

  for entry in select value from jsonb_array_elements(suggestion -> 'translations')
  loop
    if jsonb_typeof(entry) <> 'object'
      or coalesce(entry ->> 'locale', '') not in ('tr', 'bg', 'en')
      or char_length(trim(coalesce(entry ->> 'name', ''))) not between 1 and 160 then
      return false;
    end if;
  end loop;

  for entry in select value from jsonb_array_elements(suggestion -> 'allergenSuggestions')
  loop
    if jsonb_typeof(entry) <> 'object'
      or coalesce(entry ->> 'code', '') !~ '^[A-Z0-9_]{1,32}$'
      or entry ->> 'status' <> 'unknown'
      or char_length(trim(coalesce(entry ->> 'reason', ''))) not between 1 and 240 then
      return false;
    end if;
  end loop;

  return true;
exception
  when others then
    return false;
end;
$$;

create or replace function public.reserve_menu_ai_request(
  requested_organization_id uuid,
  requested_branch_id uuid,
  requested_client_request_id uuid,
  requested_input_text text,
  requested_model text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_request public.menu_ai_requests;
  organization_plan text;
  daily_limit integer;
  request_row public.menu_ai_requests;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not private.is_manager(requested_organization_id, requested_branch_id) then
    raise exception using errcode = '42501', message = 'manager_role_required';
  end if;
  if requested_client_request_id is null
    or char_length(trim(coalesce(requested_input_text, ''))) not between 3 and 500
    or char_length(trim(coalesce(requested_model, ''))) not between 1 and 80 then
    raise exception using errcode = '22023', message = 'invalid_menu_ai_request';
  end if;

  select request.*
  into existing_request
  from public.menu_ai_requests as request
  where request.organization_id = requested_organization_id
    and request.branch_id = requested_branch_id
    and request.created_by = (select auth.uid())
    and request.client_request_id = requested_client_request_id;
  if existing_request.id is not null then
    return jsonb_build_object(
      'id', existing_request.id,
      'status', existing_request.status,
      'version', existing_request.version,
      'replayed', true
    );
  end if;

  if (
    select count(*)
    from public.menu_ai_requests as request
    where request.created_by = (select auth.uid())
      and request.created_at >= now() - interval '10 minutes'
  ) >= 10 then
    raise exception using errcode = 'P0001', message = 'menu_ai_burst_limit_reached';
  end if;

  select organization.plan
  into organization_plan
  from public.organizations as organization
  where organization.id = requested_organization_id
    and organization.status = 'active';
  daily_limit := case organization_plan
    when 'trial' then 20
    when 'starter' then 50
    when 'growth' then 200
    when 'enterprise' then 1000
    else 0
  end;
  if (
    select count(*)
    from public.menu_ai_requests as request
    where request.organization_id = requested_organization_id
      and request.created_at >= now() - interval '24 hours'
  ) >= daily_limit then
    raise exception using errcode = 'P0001', message = 'menu_ai_daily_quota_reached';
  end if;

  insert into public.menu_ai_requests (
    organization_id,
    branch_id,
    client_request_id,
    created_by,
    input_text,
    model
  )
  values (
    requested_organization_id,
    requested_branch_id,
    requested_client_request_id,
    (select auth.uid()),
    trim(requested_input_text),
    trim(requested_model)
  )
  returning * into request_row;

  return jsonb_build_object(
    'id', request_row.id,
    'status', request_row.status,
    'version', request_row.version,
    'replayed', false
  );
end;
$$;

create or replace function public.complete_menu_ai_request(
  requested_organization_id uuid,
  requested_branch_id uuid,
  requested_request_id uuid,
  requested_suggestion jsonb,
  requested_model text,
  requested_input_tokens integer,
  requested_output_tokens integer,
  requested_latency_ms integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  branch_currency text;
  request_row public.menu_ai_requests;
begin
  if not private.is_manager(requested_organization_id, requested_branch_id) then
    raise exception using errcode = '42501', message = 'manager_role_required';
  end if;
  select branch.currency_code
  into branch_currency
  from public.branches as branch
  where branch.organization_id = requested_organization_id
    and branch.id = requested_branch_id
    and branch.deleted_at is null;
  if branch_currency is null
    or not private.is_valid_menu_ai_suggestion(requested_suggestion, branch_currency)
    or requested_input_tokens < 0
    or requested_output_tokens < 0
    or requested_latency_ms < 0 then
    raise exception using errcode = '22023', message = 'invalid_menu_ai_suggestion';
  end if;

  update public.menu_ai_requests as request
  set
    status = 'ready',
    model = trim(requested_model),
    suggestion_json = requested_suggestion,
    input_tokens = requested_input_tokens,
    output_tokens = requested_output_tokens,
    latency_ms = requested_latency_ms,
    completed_at = now(),
    version = request.version + 1
  where request.organization_id = requested_organization_id
    and request.branch_id = requested_branch_id
    and request.id = requested_request_id
    and request.created_by = (select auth.uid())
    and request.status = 'processing'
  returning * into request_row;
  if request_row.id is null then
    raise exception using errcode = 'P0001', message = 'menu_ai_request_not_processing';
  end if;

  return jsonb_build_object(
    'id', request_row.id,
    'status', request_row.status,
    'version', request_row.version,
    'suggestion', request_row.suggestion_json
  );
end;
$$;

create or replace function public.fail_menu_ai_request(
  requested_organization_id uuid,
  requested_branch_id uuid,
  requested_request_id uuid,
  requested_error_code text,
  requested_latency_ms integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_manager(requested_organization_id, requested_branch_id) then
    raise exception using errcode = '42501', message = 'manager_role_required';
  end if;
  update public.menu_ai_requests as request
  set
    status = 'failed',
    error_code = left(coalesce(requested_error_code, 'unknown_error'), 80),
    latency_ms = greatest(coalesce(requested_latency_ms, 0), 0),
    completed_at = now(),
    version = request.version + 1
  where request.organization_id = requested_organization_id
    and request.branch_id = requested_branch_id
    and request.id = requested_request_id
    and request.created_by = (select auth.uid())
    and request.status = 'processing';
end;
$$;

create or replace function public.save_catalog_item(
  requested_organization_id uuid,
  requested_branch_id uuid,
  requested_item_id uuid,
  requested_expected_version bigint,
  requested_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  branch_row public.branches;
  category_row public.menu_categories;
  item_row public.menu_items;
  translation jsonb;
  modifier_group jsonb;
  modifier_option jsonb;
  allergen jsonb;
  created_group_id uuid;
  duplicate_id uuid;
  payload_name text := trim(coalesce(requested_payload ->> 'name', ''));
  payload_category_name text := trim(coalesce(requested_payload ->> 'categoryName', ''));
  payload_currency text := coalesce(requested_payload ->> 'currencyCode', '');
  payload_price bigint;
  payload_prep integer;
begin
  if not private.is_manager(requested_organization_id, requested_branch_id) then
    raise exception using errcode = '42501', message = 'manager_role_required';
  end if;
  select branch.*
  into branch_row
  from public.branches as branch
  where branch.organization_id = requested_organization_id
    and branch.id = requested_branch_id
    and branch.status = 'active'
    and branch.deleted_at is null;
  if branch_row.id is null then
    raise exception using errcode = '22023', message = 'catalog_branch_not_found';
  end if;
  if jsonb_typeof(requested_payload) <> 'object'
    or char_length(payload_name) not between 1 and 160
    or coalesce(requested_payload ->> 'priceMinor', '') !~ '^[0-9]{1,12}$'
    or payload_currency <> branch_row.currency_code
    or jsonb_typeof(coalesce(requested_payload -> 'translations', '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(requested_payload -> 'modifierGroups', '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(requested_payload -> 'confirmedAllergens', '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(requested_payload -> 'modifierGroups', '[]'::jsonb)) > 10
    or jsonb_array_length(coalesce(requested_payload -> 'confirmedAllergens', '[]'::jsonb)) > 14 then
    raise exception using errcode = '22023', message = 'invalid_catalog_item_payload';
  end if;
  payload_price := (requested_payload ->> 'priceMinor')::bigint;
  if payload_price > 999999999 then
    raise exception using errcode = '22023', message = 'invalid_catalog_item_price';
  end if;
  if requested_payload -> 'prepTimeMinutes' is null
    or requested_payload -> 'prepTimeMinutes' = 'null'::jsonb then
    payload_prep := null;
  elsif coalesce(requested_payload ->> 'prepTimeMinutes', '') ~ '^[0-9]{1,4}$' then
    payload_prep := (requested_payload ->> 'prepTimeMinutes')::integer;
  else
    raise exception using errcode = '22023', message = 'invalid_catalog_prep_time';
  end if;
  if payload_prep is not null and payload_prep > 1440 then
    raise exception using errcode = '22023', message = 'invalid_catalog_prep_time';
  end if;

  if nullif(requested_payload ->> 'categoryId', '') is not null then
    select category.*
    into category_row
    from public.menu_categories as category
    where category.organization_id = requested_organization_id
      and (category.branch_id is null or category.branch_id = requested_branch_id)
      and category.id = (requested_payload ->> 'categoryId')::uuid
      and category.deleted_at is null;
  else
    if char_length(payload_category_name) not between 1 and 120 then
      raise exception using errcode = '22023', message = 'catalog_category_required';
    end if;
    select category.*
    into category_row
    from public.menu_categories as category
    where category.organization_id = requested_organization_id
      and (category.branch_id is null or category.branch_id = requested_branch_id)
      and lower(trim(category.name)) = lower(payload_category_name)
      and category.deleted_at is null
    order by (category.branch_id is null), category.id
    limit 1;
    if category_row.id is null then
      insert into public.menu_categories (
        organization_id,
        branch_id,
        name,
        sort_order,
        created_by
      )
      values (
        requested_organization_id,
        requested_branch_id,
        payload_category_name,
        (
          select coalesce(max(category.sort_order), -1) + 1
          from public.menu_categories as category
          where category.organization_id = requested_organization_id
            and category.branch_id = requested_branch_id
            and category.deleted_at is null
        ),
        (select auth.uid())
      )
      returning * into category_row;
    end if;
  end if;
  if category_row.id is null then
    raise exception using errcode = '22023', message = 'catalog_category_not_found';
  end if;

  select item.id
  into duplicate_id
  from public.menu_items as item
  where item.organization_id = requested_organization_id
    and (item.branch_id is null or item.branch_id = requested_branch_id)
    and item.deleted_at is null
    and item.id <> coalesce(requested_item_id, '00000000-0000-0000-0000-000000000000')
    and private.normalize_catalog_name(item.name)
      = private.normalize_catalog_name(payload_name)
  order by item.id
  limit 1;
  if duplicate_id is not null then
    raise exception using
      errcode = '23505',
      message = 'catalog_item_duplicate',
      detail = jsonb_build_object('existingItemId', duplicate_id)::text;
  end if;

  if requested_item_id is null then
    insert into public.menu_items (
      organization_id,
      branch_id,
      category_id,
      name,
      description,
      price_minor,
      currency_code,
      tax_rate_basis_points,
      is_active,
      is_available,
      prep_time_minutes,
      created_by
    )
    values (
      requested_organization_id,
      requested_branch_id,
      category_row.id,
      payload_name,
      nullif(trim(coalesce(requested_payload ->> 'description', '')), ''),
      payload_price,
      branch_row.currency_code,
      coalesce((requested_payload ->> 'taxRateBasisPoints')::integer, 0),
      coalesce((requested_payload ->> 'isActive')::boolean, true),
      coalesce((requested_payload ->> 'isAvailable')::boolean, true),
      payload_prep,
      (select auth.uid())
    )
    returning * into item_row;
  else
    select item.*
    into item_row
    from public.menu_items as item
    where item.organization_id = requested_organization_id
      and item.branch_id = requested_branch_id
      and item.id = requested_item_id
      and item.deleted_at is null
    for update;
    if item_row.id is null then
      raise exception using errcode = 'P0001', message = 'catalog_item_not_found';
    end if;
    if requested_expected_version is null or item_row.version <> requested_expected_version then
      raise exception using
        errcode = 'P0001',
        message = 'catalog_item_version_conflict',
        detail = jsonb_build_object('serverVersion', item_row.version)::text;
    end if;
    update public.menu_items as item
    set
      category_id = category_row.id,
      name = payload_name,
      description = nullif(trim(coalesce(requested_payload ->> 'description', '')), ''),
      price_minor = payload_price,
      tax_rate_basis_points =
        coalesce((requested_payload ->> 'taxRateBasisPoints')::integer, 0),
      is_active = coalesce((requested_payload ->> 'isActive')::boolean, item.is_active),
      is_available =
        coalesce((requested_payload ->> 'isAvailable')::boolean, item.is_available),
      prep_time_minutes = payload_prep,
      updated_at = now(),
      version = item.version + 1
    where item.id = requested_item_id
    returning * into item_row;

    update public.modifier_options as option
    set
      deleted_at = now(),
      updated_at = now(),
      version = option.version + 1
    where option.organization_id = requested_organization_id
      and option.branch_id = requested_branch_id
      and option.modifier_group_id in (
        select modifier.id
        from public.modifier_groups as modifier
        where modifier.organization_id = requested_organization_id
          and modifier.branch_id = requested_branch_id
          and modifier.menu_item_id = item_row.id
          and modifier.deleted_at is null
      )
      and option.deleted_at is null;
    update public.modifier_groups as modifier
    set
      deleted_at = now(),
      updated_at = now(),
      version = modifier.version + 1
    where modifier.organization_id = requested_organization_id
      and modifier.branch_id = requested_branch_id
      and modifier.menu_item_id = item_row.id
      and modifier.deleted_at is null;
  end if;

  delete from public.menu_item_translations as existing_translation
  where existing_translation.organization_id = requested_organization_id
    and existing_translation.branch_id = requested_branch_id
    and existing_translation.menu_item_id = item_row.id;
  for translation in
    select value
    from jsonb_array_elements(coalesce(requested_payload -> 'translations', '[]'::jsonb))
  loop
    if coalesce(translation ->> 'locale', '') not in ('tr', 'bg', 'en')
      or char_length(trim(coalesce(translation ->> 'name', ''))) not between 1 and 160 then
      raise exception using errcode = '22023', message = 'invalid_catalog_translation';
    end if;
    insert into public.menu_item_translations (
      organization_id,
      branch_id,
      menu_item_id,
      locale,
      name,
      description
    )
    values (
      requested_organization_id,
      requested_branch_id,
      item_row.id,
      translation ->> 'locale',
      trim(translation ->> 'name'),
      nullif(trim(coalesce(translation ->> 'description', '')), '')
    );
  end loop;

  for modifier_group in
    select value
    from jsonb_array_elements(coalesce(requested_payload -> 'modifierGroups', '[]'::jsonb))
  loop
    if char_length(trim(coalesce(modifier_group ->> 'name', ''))) not between 1 and 120
      or coalesce(modifier_group ->> 'selectionType', '') not in ('single', 'multiple')
      or jsonb_typeof(modifier_group -> 'options') <> 'array'
      or jsonb_array_length(modifier_group -> 'options') > 20 then
      raise exception using errcode = '22023', message = 'invalid_catalog_modifier_group';
    end if;
    insert into public.modifier_groups (
      organization_id,
      branch_id,
      menu_item_id,
      name,
      selection_type,
      minimum_choices,
      maximum_choices,
      is_required,
      sort_order
    )
    values (
      requested_organization_id,
      requested_branch_id,
      item_row.id,
      trim(modifier_group ->> 'name'),
      modifier_group ->> 'selectionType',
      coalesce((modifier_group ->> 'minimumChoices')::integer, 0),
      (modifier_group ->> 'maximumChoices')::integer,
      coalesce((modifier_group ->> 'isRequired')::boolean, false),
      coalesce((modifier_group ->> 'sortOrder')::integer, 0)
    )
    returning id into created_group_id;

    for modifier_option in
      select value from jsonb_array_elements(modifier_group -> 'options')
    loop
      if char_length(trim(coalesce(modifier_option ->> 'name', ''))) not between 1 and 120
        or coalesce(modifier_option ->> 'priceDeltaMinor', '') !~ '^-?[0-9]{1,12}$' then
        raise exception using errcode = '22023', message = 'invalid_catalog_modifier_option';
      end if;
      insert into public.modifier_options (
        organization_id,
        branch_id,
        modifier_group_id,
        name,
        price_delta_minor,
        is_default,
        sort_order
      )
      values (
        requested_organization_id,
        requested_branch_id,
        created_group_id,
        trim(modifier_option ->> 'name'),
        (modifier_option ->> 'priceDeltaMinor')::bigint,
        coalesce((modifier_option ->> 'isDefault')::boolean, false),
        coalesce((modifier_option ->> 'sortOrder')::integer, 0)
      );
    end loop;
  end loop;

  delete from public.menu_item_allergens as existing_allergen
  where existing_allergen.organization_id = requested_organization_id
    and existing_allergen.branch_id = requested_branch_id
    and existing_allergen.menu_item_id = item_row.id;
  for allergen in
    select value
    from jsonb_array_elements(coalesce(requested_payload -> 'confirmedAllergens', '[]'::jsonb))
  loop
    if coalesce(allergen ->> 'presence', '') not in (
      'contains',
      'may_contain',
      'free_from'
    ) then
      raise exception using errcode = '22023', message = 'invalid_catalog_allergen';
    end if;
    insert into public.menu_item_allergens (
      organization_id,
      branch_id,
      menu_item_id,
      allergen_id,
      presence,
      source,
      confirmed_by,
      confirmed_at
    )
    select
      requested_organization_id,
      requested_branch_id,
      item_row.id,
      allergen_definition.id,
      allergen ->> 'presence',
      'manager',
      (select auth.uid()),
      now()
    from public.allergens as allergen_definition
    where allergen_definition.code = allergen ->> 'code';
    if not found then
      raise exception using errcode = '22023', message = 'catalog_allergen_not_found';
    end if;
  end loop;

  return jsonb_build_object(
    'id', item_row.id,
    'categoryId', category_row.id,
    'name', item_row.name,
    'version', item_row.version,
    'priceMinor', item_row.price_minor,
    'currencyCode', item_row.currency_code,
    'isAvailable', item_row.is_available
  );
end;
$$;

create or replace function public.publish_menu_ai_draft(
  requested_organization_id uuid,
  requested_branch_id uuid,
  requested_request_id uuid,
  requested_expected_version bigint,
  requested_reviewed_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.menu_ai_requests;
  item_result jsonb;
begin
  if not private.is_manager(requested_organization_id, requested_branch_id) then
    raise exception using errcode = '42501', message = 'manager_role_required';
  end if;
  select request.*
  into request_row
  from public.menu_ai_requests as request
  where request.organization_id = requested_organization_id
    and request.branch_id = requested_branch_id
    and request.id = requested_request_id
  for update;
  if request_row.id is null then
    raise exception using errcode = 'P0001', message = 'menu_ai_draft_not_found';
  end if;
  if request_row.status <> 'ready' then
    raise exception using errcode = 'P0001', message = 'menu_ai_draft_not_ready';
  end if;
  if request_row.version <> requested_expected_version then
    raise exception using
      errcode = 'P0001',
      message = 'menu_ai_draft_version_conflict',
      detail = jsonb_build_object('serverVersion', request_row.version)::text;
  end if;

  item_result := public.save_catalog_item(
    requested_organization_id,
    requested_branch_id,
    null,
    null,
    requested_reviewed_payload
  );

  update public.menu_ai_requests as request
  set
    status = 'published',
    reviewed_json = requested_reviewed_payload,
    published_item_id = (item_result ->> 'id')::uuid,
    published_at = now(),
    version = request.version + 1
  where request.id = request_row.id;

  return jsonb_build_object(
    'requestId', request_row.id,
    'status', 'published',
    'item', item_result
  );
end;
$$;

create or replace function public.bulk_set_menu_item_availability(
  requested_organization_id uuid,
  requested_branch_id uuid,
  requested_item_ids uuid[],
  requested_is_available boolean
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if not private.is_manager(requested_organization_id, requested_branch_id) then
    raise exception using errcode = '42501', message = 'manager_role_required';
  end if;
  if requested_item_ids is null
    or cardinality(requested_item_ids) not between 1 and 100
    or requested_is_available is null then
    raise exception using errcode = '22023', message = 'invalid_catalog_bulk_update';
  end if;
  update public.menu_items as item
  set
    is_available = requested_is_available,
    updated_at = now(),
    version = item.version + 1
  where item.organization_id = requested_organization_id
    and item.branch_id = requested_branch_id
    and item.id = any(requested_item_ids)
    and item.deleted_at is null
    and item.is_available <> requested_is_available;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke execute on function private.is_valid_menu_ai_suggestion(jsonb, text)
from public, anon, authenticated;
revoke execute on function private.normalize_catalog_name(text)
from public, anon, authenticated;
revoke execute on function public.reserve_menu_ai_request(
  uuid,
  uuid,
  uuid,
  text,
  text
) from public, anon;
revoke execute on function public.complete_menu_ai_request(
  uuid,
  uuid,
  uuid,
  jsonb,
  text,
  integer,
  integer,
  integer
) from public, anon;
revoke execute on function public.fail_menu_ai_request(
  uuid,
  uuid,
  uuid,
  text,
  integer
) from public, anon;
revoke execute on function public.save_catalog_item(
  uuid,
  uuid,
  uuid,
  bigint,
  jsonb
) from public, anon;
revoke execute on function public.publish_menu_ai_draft(
  uuid,
  uuid,
  uuid,
  bigint,
  jsonb
) from public, anon;
revoke execute on function public.bulk_set_menu_item_availability(
  uuid,
  uuid,
  uuid[],
  boolean
) from public, anon;

grant execute on function public.reserve_menu_ai_request(
  uuid,
  uuid,
  uuid,
  text,
  text
) to authenticated;
grant execute on function public.complete_menu_ai_request(
  uuid,
  uuid,
  uuid,
  jsonb,
  text,
  integer,
  integer,
  integer
) to authenticated;
grant execute on function public.fail_menu_ai_request(
  uuid,
  uuid,
  uuid,
  text,
  integer
) to authenticated;
grant execute on function public.save_catalog_item(
  uuid,
  uuid,
  uuid,
  bigint,
  jsonb
) to authenticated;
grant execute on function public.publish_menu_ai_draft(
  uuid,
  uuid,
  uuid,
  bigint,
  jsonb
) to authenticated;
grant execute on function public.bulk_set_menu_item_availability(
  uuid,
  uuid,
  uuid[],
  boolean
) to authenticated;
