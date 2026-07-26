-- Offline catalog projection and atomic waiter order commands.
--
-- Catalog rows may be organization-wide (branch_id is null). The sync log is
-- branch-scoped, so catalog changes are fanned out to every applicable branch.

create or replace function private.capture_catalog_sync_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  event_organization_id uuid := (row_data ->> 'organization_id')::uuid;
  source_branch_id uuid := nullif(row_data ->> 'branch_id', '')::uuid;
  event_entity_id text := row_data ->> 'id';
  event_server_version bigint;
  event_client_mutation_id uuid;
  target_branch record;
  event_sequence bigint;
begin
  if event_entity_id is null then
    raise exception using errcode = '23502', message = 'sync_event_entity_id_required';
  end if;

  event_server_version := case
    when coalesce(row_data ->> 'version', '') ~ '^[1-9][0-9]*$'
      then (row_data ->> 'version')::bigint
    else null
  end;
  event_client_mutation_id := case
    when coalesce(current_setting('orderia.client_mutation_id', true), '') ~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then current_setting('orderia.client_mutation_id', true)::uuid
    else null
  end;

  for target_branch in
    select branch.id
    from public.branches as branch
    where branch.organization_id = event_organization_id
      and branch.status = 'active'
      and branch.deleted_at is null
      and (source_branch_id is null or branch.id = source_branch_id)
  loop
    insert into public.sync_events (
      organization_id,
      branch_id,
      repository,
      entity_id,
      operation,
      payload_json,
      server_version,
      client_mutation_id
    )
    values (
      event_organization_id,
      target_branch.id,
      tg_table_name,
      event_entity_id,
      lower(tg_op),
      row_data,
      event_server_version,
      event_client_mutation_id
    )
    returning sequence into event_sequence;

    perform realtime.send(
      jsonb_build_object('cursor', event_sequence),
      'sync_hint',
      concat('orderia:', event_organization_id, ':', target_branch.id, ':sync'),
      true
    );
  end loop;

  return null;
end;
$$;

create trigger menu_categories_capture_sync_event
  after insert or update or delete on public.menu_categories
  for each row execute function private.capture_catalog_sync_event();
create trigger menu_items_capture_sync_event
  after insert or update or delete on public.menu_items
  for each row execute function private.capture_catalog_sync_event();
create trigger modifier_groups_capture_sync_event
  after insert or update or delete on public.modifier_groups
  for each row execute function private.capture_catalog_sync_event();
create trigger modifier_options_capture_sync_event
  after insert or update or delete on public.modifier_options
  for each row execute function private.capture_catalog_sync_event();
create trigger cancellation_reasons_capture_sync_event
  after insert or update or delete on public.cancellation_reasons
  for each row execute function private.capture_sync_event();

create or replace function private.bootstrap_global_catalog_for_branch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'active' or new.deleted_at is not null then
    return null;
  end if;
  if tg_op = 'UPDATE' and old.status = 'active' and old.deleted_at is null then
    return null;
  end if;

  insert into public.sync_events (
    organization_id,
    branch_id,
    repository,
    entity_id,
    operation,
    payload_json,
    server_version
  )
  select
    new.organization_id,
    new.id,
    catalog.repository,
    catalog.entity_id,
    'insert',
    catalog.payload_json,
    catalog.server_version
  from (
    select
      'menu_categories'::text as repository,
      category.id::text as entity_id,
      to_jsonb(category) as payload_json,
      category.version as server_version
    from public.menu_categories as category
    where category.organization_id = new.organization_id
      and category.branch_id is null
    union all
    select
      'menu_items',
      item.id::text,
      to_jsonb(item),
      item.version
    from public.menu_items as item
    where item.organization_id = new.organization_id
      and item.branch_id is null
    union all
    select
      'modifier_groups',
      modifier_group.id::text,
      to_jsonb(modifier_group),
      modifier_group.version
    from public.modifier_groups as modifier_group
    where modifier_group.organization_id = new.organization_id
      and modifier_group.branch_id is null
    union all
    select
      'modifier_options',
      modifier_option.id::text,
      to_jsonb(modifier_option),
      modifier_option.version
    from public.modifier_options as modifier_option
    where modifier_option.organization_id = new.organization_id
      and modifier_option.branch_id is null
  ) as catalog;

  return null;
end;
$$;

create trigger branches_bootstrap_global_catalog
  after insert or update of status, deleted_at on public.branches
  for each row execute function private.bootstrap_global_catalog_for_branch();

-- Rows created before the catalog triggers existed need an initial projection.
insert into public.sync_events (
  organization_id,
  branch_id,
  repository,
  entity_id,
  operation,
  payload_json,
  server_version
)
select
  category.organization_id,
  branch.id,
  'menu_categories',
  category.id::text,
  'insert',
  to_jsonb(category),
  category.version
from public.menu_categories as category
join public.branches as branch
  on branch.organization_id = category.organization_id
 and branch.status = 'active'
 and branch.deleted_at is null
 and (category.branch_id is null or category.branch_id = branch.id);

insert into public.sync_events (
  organization_id,
  branch_id,
  repository,
  entity_id,
  operation,
  payload_json,
  server_version
)
select
  item.organization_id,
  branch.id,
  'menu_items',
  item.id::text,
  'insert',
  to_jsonb(item),
  item.version
from public.menu_items as item
join public.branches as branch
  on branch.organization_id = item.organization_id
 and branch.status = 'active'
 and branch.deleted_at is null
 and (item.branch_id is null or item.branch_id = branch.id);

insert into public.sync_events (
  organization_id,
  branch_id,
  repository,
  entity_id,
  operation,
  payload_json,
  server_version
)
select
  modifier_group.organization_id,
  branch.id,
  'modifier_groups',
  modifier_group.id::text,
  'insert',
  to_jsonb(modifier_group),
  modifier_group.version
from public.modifier_groups as modifier_group
join public.branches as branch
  on branch.organization_id = modifier_group.organization_id
 and branch.status = 'active'
 and branch.deleted_at is null
 and (modifier_group.branch_id is null or modifier_group.branch_id = branch.id);

insert into public.sync_events (
  organization_id,
  branch_id,
  repository,
  entity_id,
  operation,
  payload_json,
  server_version
)
select
  modifier_option.organization_id,
  branch.id,
  'modifier_options',
  modifier_option.id::text,
  'insert',
  to_jsonb(modifier_option),
  modifier_option.version
from public.modifier_options as modifier_option
join public.branches as branch
  on branch.organization_id = modifier_option.organization_id
 and branch.status = 'active'
 and branch.deleted_at is null
 and (modifier_option.branch_id is null or modifier_option.branch_id = branch.id);

insert into public.sync_events (
  organization_id,
  branch_id,
  repository,
  entity_id,
  operation,
  payload_json,
  server_version
)
select
  reason.organization_id,
  reason.branch_id,
  'cancellation_reasons',
  reason.id::text,
  'insert',
  to_jsonb(reason),
  reason.version
from public.cancellation_reasons as reason;

create or replace function public.apply_client_mutation(
  requested_organization_id uuid,
  requested_branch_id uuid,
  requested_device_id uuid,
  requested_client_mutation_id uuid,
  requested_mutation_type text,
  requested_entity_id uuid,
  requested_payload jsonb,
  requested_base_version bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_user_id uuid := (select auth.uid());
  fingerprint text;
  claimed_mutation_id uuid;
  prior_mutation public.client_mutations;
  prior_hall public.halls;
  canonical_hall public.halls;
  target_table public.restaurant_tables;
  active_session public.table_sessions;
  canonical_session public.table_sessions;
  canonical_check public.checks;
  canonical_batch public.order_batches;
  prior_order_item public.order_items;
  canonical_order_item public.order_items;
  catalog_item public.menu_items;
  catalog_category public.menu_categories;
  modifier_group public.modifier_groups;
  cancellation_reason public.cancellation_reasons;
  item_payload jsonb;
  selection_count integer;
  selection_total integer;
  minimum_choices integer;
  maximum_choices integer;
  requested_session_id uuid;
  requested_check_id uuid;
  requested_batch_id uuid;
  requested_item_id uuid;
  requested_created_at timestamptz;
  mutation_result jsonb;
  audit_before jsonb;
  audit_after jsonb;
  audit_entity_type text;
begin
  if caller_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if requested_payload is null or jsonb_typeof(requested_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'mutation_payload_must_be_an_object';
  end if;

  if octet_length(requested_payload::text) > 65536 then
    raise exception using errcode = '22023', message = 'mutation_payload_too_large';
  end if;

  if not private.is_active_member(requested_organization_id, requested_branch_id) then
    raise exception using errcode = '42501', message = 'branch_access_denied';
  end if;

  if not exists (
    select 1
    from public.devices as device
    where device.id = requested_device_id
      and device.organization_id = requested_organization_id
      and device.branch_id = requested_branch_id
      and device.user_id = caller_user_id
      and device.revoked_at is null
  ) then
    raise exception using errcode = '42501', message = 'device_access_denied';
  end if;

  fingerprint := md5(concat_ws(
    ':',
    requested_organization_id::text,
    requested_branch_id::text,
    requested_device_id::text,
    requested_client_mutation_id::text,
    requested_mutation_type,
    requested_entity_id::text,
    requested_payload::text,
    coalesce(requested_base_version::text, 'null')
  ));

  insert into public.client_mutations (
    organization_id,
    branch_id,
    device_id,
    client_mutation_id,
    mutation_type,
    entity_id,
    request_fingerprint,
    result_json
  )
  values (
    requested_organization_id,
    requested_branch_id,
    requested_device_id,
    requested_client_mutation_id,
    requested_mutation_type,
    requested_entity_id,
    fingerprint,
    '{}'::jsonb
  )
  on conflict (device_id, client_mutation_id) do nothing
  returning id into claimed_mutation_id;

  if claimed_mutation_id is null then
    select mutation.*
    into prior_mutation
    from public.client_mutations as mutation
    where mutation.device_id = requested_device_id
      and mutation.client_mutation_id = requested_client_mutation_id;

    if prior_mutation.id is null then
      raise exception using
        errcode = '40001',
        message = 'idempotency_result_temporarily_unavailable';
    end if;
    if prior_mutation.request_fingerprint <> fingerprint then
      raise exception using
        errcode = '22023',
        message = 'client_mutation_id_reused_with_different_content';
    end if;
    return prior_mutation.result_json;
  end if;

  case requested_mutation_type
    when 'halls.put' then
      if not private.is_manager(requested_organization_id, requested_branch_id) then
        raise exception using errcode = '42501', message = 'manager_role_required';
      end if;
      if requested_payload - array['name', 'sortOrder', 'deletedAt'] <> '{}'::jsonb then
        raise exception using errcode = '22023', message = 'unsupported_hall_payload_field';
      end if;
      if nullif(trim(requested_payload ->> 'name'), '') is null then
        raise exception using errcode = '22023', message = 'hall_name_required';
      end if;

      select hall.*
      into prior_hall
      from public.halls as hall
      where hall.organization_id = requested_organization_id
        and hall.branch_id = requested_branch_id
        and hall.id = requested_entity_id
      for update;

      if prior_hall.id is null then
        if requested_base_version is not null and requested_base_version <> 0 then
          raise exception using errcode = 'P0001', message = 'version_conflict';
        end if;
        insert into public.halls (
          id, organization_id, branch_id, name, sort_order, version, deleted_at
        )
        values (
          requested_entity_id,
          requested_organization_id,
          requested_branch_id,
          trim(requested_payload ->> 'name'),
          coalesce((requested_payload ->> 'sortOrder')::integer, 0),
          1,
          (requested_payload ->> 'deletedAt')::timestamptz
        )
        returning * into canonical_hall;
      else
        if requested_base_version is null or requested_base_version <> prior_hall.version then
          raise exception using errcode = 'P0001', message = 'version_conflict';
        end if;
        update public.halls
        set name = trim(requested_payload ->> 'name'),
            sort_order = coalesce(
              (requested_payload ->> 'sortOrder')::integer,
              prior_hall.sort_order
            ),
            version = prior_hall.version + 1,
            updated_at = now(),
            deleted_at = case
              when requested_payload ? 'deletedAt'
                then (requested_payload ->> 'deletedAt')::timestamptz
              else prior_hall.deleted_at
            end
        where id = prior_hall.id
        returning * into canonical_hall;
      end if;

      mutation_result := jsonb_build_object(
        'status', 'applied',
        'repository', 'halls',
        'entityId', canonical_hall.id,
        'serverVersion', canonical_hall.version,
        'committedAt', now()
      );
      audit_entity_type := 'halls';
      audit_before := case when prior_hall.id is null then null else to_jsonb(prior_hall) end;
      audit_after := to_jsonb(canonical_hall);

    when 'orders.send_batch' then
      if requested_payload - array['tableId', 'session', 'check', 'batch', 'items']
        <> '{}'::jsonb then
        raise exception using errcode = '22023', message = 'unsupported_order_payload_field';
      end if;
      if jsonb_typeof(requested_payload -> 'session') is distinct from 'object'
        or jsonb_typeof(requested_payload -> 'check') is distinct from 'object'
        or jsonb_typeof(requested_payload -> 'batch') is distinct from 'object'
        or jsonb_typeof(requested_payload -> 'items') is distinct from 'array' then
        raise exception using errcode = '22023', message = 'invalid_order_payload_shape';
      end if;
      if jsonb_array_length(requested_payload -> 'items') < 1
        or jsonb_array_length(requested_payload -> 'items') > 100 then
        raise exception using errcode = '22023', message = 'invalid_order_item_count';
      end if;
      if (requested_payload -> 'session') - array['id', 'openedAt'] <> '{}'::jsonb
        or (requested_payload -> 'check') - array['id', 'name', 'openedAt'] <> '{}'::jsonb
        or (requested_payload -> 'batch') - array['id', 'createdAt'] <> '{}'::jsonb then
        raise exception using errcode = '22023', message = 'unsupported_order_header_field';
      end if;

      requested_session_id := (requested_payload #>> '{session,id}')::uuid;
      requested_check_id := (requested_payload #>> '{check,id}')::uuid;
      requested_batch_id := (requested_payload #>> '{batch,id}')::uuid;
      requested_created_at := (requested_payload #>> '{batch,createdAt}')::timestamptz;
      if requested_batch_id <> requested_entity_id then
        raise exception using errcode = '22023', message = 'order_batch_entity_mismatch';
      end if;
      if nullif(trim(requested_payload #>> '{check,name}'), '') is null then
        raise exception using errcode = '22023', message = 'check_name_required';
      end if;
      if char_length(trim(requested_payload #>> '{check,name}')) > 80 then
        raise exception using errcode = '22023', message = 'check_name_too_long';
      end if;
      if requested_created_at < now() - interval '30 days'
        or requested_created_at > now() + interval '5 minutes' then
        raise exception using errcode = '22023', message = 'invalid_order_timestamp';
      end if;

      select restaurant_table.*
      into target_table
      from public.restaurant_tables as restaurant_table
      where restaurant_table.organization_id = requested_organization_id
        and restaurant_table.branch_id = requested_branch_id
        and restaurant_table.id = (requested_payload ->> 'tableId')::uuid
        and restaurant_table.deleted_at is null
      for update;
      if target_table.id is null then
        raise exception using errcode = '22023', message = 'table_not_found';
      end if;

      select session.*
      into active_session
      from public.table_sessions as session
      where session.organization_id = requested_organization_id
        and session.branch_id = requested_branch_id
        and session.table_id = target_table.id
        and session.status in ('open', 'payment_pending')
        and session.deleted_at is null
      order by session.opened_at desc
      limit 1;

      if active_session.id is null then
        insert into public.table_sessions (
          id,
          organization_id,
          branch_id,
          table_id,
          status,
          opened_by,
          opened_at,
          version
        )
        values (
          requested_session_id,
          requested_organization_id,
          requested_branch_id,
          target_table.id,
          'open',
          caller_user_id,
          (requested_payload #>> '{session,openedAt}')::timestamptz,
          1
        )
        returning * into canonical_session;
      elsif active_session.id <> requested_session_id then
        raise exception using errcode = 'P0001', message = 'version_conflict';
      else
        canonical_session := active_session;
      end if;

      select check_row.*
      into canonical_check
      from public.checks as check_row
      where check_row.organization_id = requested_organization_id
        and check_row.branch_id = requested_branch_id
        and check_row.id = requested_check_id
      for update;
      if canonical_check.id is null then
        insert into public.checks (
          id,
          organization_id,
          branch_id,
          table_session_id,
          name,
          status,
          opened_by,
          opened_at,
          version
        )
        values (
          requested_check_id,
          requested_organization_id,
          requested_branch_id,
          canonical_session.id,
          trim(requested_payload #>> '{check,name}'),
          'open',
          caller_user_id,
          (requested_payload #>> '{check,openedAt}')::timestamptz,
          1
        )
        returning * into canonical_check;
      elsif canonical_check.table_session_id <> canonical_session.id
        or canonical_check.status not in ('open', 'partially_paid') then
        raise exception using errcode = '22023', message = 'check_not_open_for_session';
      end if;

      insert into public.order_batches (
        id,
        organization_id,
        branch_id,
        table_session_id,
        check_id,
        created_by,
        created_at,
        client_mutation_id
      )
      values (
        requested_batch_id,
        requested_organization_id,
        requested_branch_id,
        canonical_session.id,
        canonical_check.id,
        caller_user_id,
        requested_created_at,
        requested_client_mutation_id
      )
      returning * into canonical_batch;

      for item_payload in
        select value from jsonb_array_elements(requested_payload -> 'items')
      loop
        if jsonb_typeof(item_payload) is distinct from 'object'
          or item_payload - array[
            'id',
            'menuItemId',
            'menuItemVersion',
            'quantity',
            'note',
            'modifierSelections'
          ] <> '{}'::jsonb
          or jsonb_typeof(item_payload -> 'modifierSelections') is distinct from 'array' then
          raise exception using errcode = '22023', message = 'invalid_order_item_payload';
        end if;
        requested_item_id := (item_payload ->> 'id')::uuid;
        if coalesce((item_payload ->> 'quantity')::numeric, 0) <= 0
          or (item_payload ->> 'quantity')::numeric > 999 then
          raise exception using errcode = '22023', message = 'invalid_order_quantity';
        end if;
        if char_length(coalesce(item_payload ->> 'note', '')) > 500 then
          raise exception using errcode = '22023', message = 'order_note_too_long';
        end if;

        select menu_item.*
        into catalog_item
        from public.menu_items as menu_item
        where menu_item.organization_id = requested_organization_id
          and menu_item.id = (item_payload ->> 'menuItemId')::uuid
          and (menu_item.branch_id is null or menu_item.branch_id = requested_branch_id)
          and menu_item.is_active
          and menu_item.is_available
          and menu_item.deleted_at is null;
        if catalog_item.id is null then
          raise exception using errcode = '22023', message = 'menu_item_unavailable';
        end if;
        if catalog_item.version <> (item_payload ->> 'menuItemVersion')::bigint then
          raise exception using errcode = 'P0001', message = 'version_conflict';
        end if;

        select category.*
        into catalog_category
        from public.menu_categories as category
        where category.organization_id = requested_organization_id
          and category.id = catalog_item.category_id
          and (category.branch_id is null or category.branch_id = requested_branch_id)
          and category.is_active
          and category.deleted_at is null;
        if catalog_category.id is null then
          raise exception using errcode = '22023', message = 'menu_category_unavailable';
        end if;

        selection_total := jsonb_array_length(item_payload -> 'modifierSelections');
        if selection_total <> (
          select count(distinct selection ->> 'optionId')
          from jsonb_array_elements(item_payload -> 'modifierSelections') as selection
        ) then
          raise exception using errcode = '22023', message = 'duplicate_modifier_selection';
        end if;
        if selection_total <> (
          select count(*)
          from jsonb_array_elements(item_payload -> 'modifierSelections') as selection
          join public.modifier_options as modifier_option
            on modifier_option.id = (selection ->> 'optionId')::uuid
           and modifier_option.organization_id = requested_organization_id
           and (modifier_option.branch_id is null
             or modifier_option.branch_id = requested_branch_id)
           and modifier_option.is_active
           and modifier_option.deleted_at is null
          join public.modifier_groups as selected_group
            on selected_group.id = modifier_option.modifier_group_id
           and selected_group.organization_id = requested_organization_id
           and selected_group.menu_item_id = catalog_item.id
           and (selected_group.branch_id is null
             or selected_group.branch_id = requested_branch_id)
           and selected_group.deleted_at is null
        ) then
          raise exception using errcode = '22023', message = 'invalid_modifier_selection';
        end if;

        for modifier_group in
          select group_row.*
          from public.modifier_groups as group_row
          where group_row.organization_id = requested_organization_id
            and group_row.menu_item_id = catalog_item.id
            and (group_row.branch_id is null or group_row.branch_id = requested_branch_id)
            and group_row.deleted_at is null
        loop
          select count(*)
          into selection_count
          from jsonb_array_elements(item_payload -> 'modifierSelections') as selection
          join public.modifier_options as modifier_option
            on modifier_option.id = (selection ->> 'optionId')::uuid
           and modifier_option.modifier_group_id = modifier_group.id;
          minimum_choices := greatest(
            modifier_group.minimum_choices,
            case when modifier_group.is_required then 1 else 0 end
          );
          maximum_choices := case
            when modifier_group.selection_type = 'single' then 1
            else coalesce(modifier_group.maximum_choices, 2147483647)
          end;
          if selection_count < minimum_choices or selection_count > maximum_choices then
            raise exception using errcode = '22023', message = 'modifier_choice_rule_failed';
          end if;
        end loop;

        insert into public.order_items (
          id,
          organization_id,
          branch_id,
          table_session_id,
          check_id,
          order_batch_id,
          menu_item_id,
          name_snapshot,
          category_id_snapshot,
          category_name_snapshot,
          unit_price_minor,
          currency_code,
          tax_rate_basis_points,
          quantity,
          status,
          note,
          created_by,
          created_at,
          updated_by,
          updated_at,
          original_table_id,
          original_table_session_id,
          version
        )
        values (
          requested_item_id,
          requested_organization_id,
          requested_branch_id,
          canonical_session.id,
          canonical_check.id,
          canonical_batch.id,
          catalog_item.id,
          catalog_item.name,
          catalog_category.id,
          catalog_category.name,
          catalog_item.price_minor,
          catalog_item.currency_code,
          catalog_item.tax_rate_basis_points,
          (item_payload ->> 'quantity')::numeric,
          'ordered',
          nullif(trim(item_payload ->> 'note'), ''),
          caller_user_id,
          requested_created_at,
          caller_user_id,
          requested_created_at,
          target_table.id,
          canonical_session.id,
          1
        );

        insert into public.order_item_modifiers (
          id,
          organization_id,
          branch_id,
          order_item_id,
          modifier_group_name_snapshot,
          modifier_option_name_snapshot,
          price_delta_minor,
          quantity
        )
        select
          (selection ->> 'id')::uuid,
          requested_organization_id,
          requested_branch_id,
          requested_item_id,
          selected_group.name,
          modifier_option.name,
          modifier_option.price_delta_minor,
          1
        from jsonb_array_elements(item_payload -> 'modifierSelections') as selection
        join public.modifier_options as modifier_option
          on modifier_option.id = (selection ->> 'optionId')::uuid
        join public.modifier_groups as selected_group
          on selected_group.id = modifier_option.modifier_group_id;
      end loop;

      mutation_result := jsonb_build_object(
        'status', 'applied',
        'repository', 'orderBatches',
        'entityId', canonical_batch.id,
        'serverVersion', 1,
        'committedAt', now(),
        'sessionId', canonical_session.id,
        'checkId', canonical_check.id,
        'itemCount', jsonb_array_length(requested_payload -> 'items')
      );
      audit_entity_type := 'order_batches';
      audit_before := null;
      audit_after := jsonb_build_object(
        'batchId', canonical_batch.id,
        'tableSessionId', canonical_session.id,
        'checkId', canonical_check.id,
        'itemCount', jsonb_array_length(requested_payload -> 'items')
      );

    when 'order_items.cancel' then
      if requested_payload - array['reasonId'] <> '{}'::jsonb then
        raise exception using errcode = '22023', message = 'unsupported_cancellation_payload_field';
      end if;
      if requested_base_version is null then
        raise exception using errcode = '22023', message = 'base_version_required';
      end if;

      select order_item.*
      into prior_order_item
      from public.order_items as order_item
      where order_item.organization_id = requested_organization_id
        and order_item.branch_id = requested_branch_id
        and order_item.id = requested_entity_id
        and order_item.deleted_at is null
      for update;
      if prior_order_item.id is null then
        raise exception using errcode = '22023', message = 'order_item_not_found';
      end if;
      if prior_order_item.version <> requested_base_version then
        raise exception using errcode = 'P0001', message = 'version_conflict';
      end if;
      if prior_order_item.status not in ('draft', 'ordered', 'served') then
        raise exception using errcode = '22023', message = 'order_item_cannot_be_cancelled';
      end if;

      select reason.*
      into cancellation_reason
      from public.cancellation_reasons as reason
      where reason.organization_id = requested_organization_id
        and reason.branch_id = requested_branch_id
        and reason.id = (requested_payload ->> 'reasonId')::uuid
        and reason.is_active
        and reason.deleted_at is null;
      if cancellation_reason.id is null then
        raise exception using errcode = '22023', message = 'cancellation_reason_not_found';
      end if;
      if cancellation_reason.requires_manager
        and not private.is_manager(requested_organization_id, requested_branch_id) then
        raise exception using errcode = '42501', message = 'manager_role_required';
      end if;

      update public.order_items
      set status = 'cancelled',
          updated_by = caller_user_id,
          updated_at = now(),
          cancelled_by = caller_user_id,
          cancelled_at = now(),
          cancellation_reason_id = cancellation_reason.id,
          version = prior_order_item.version + 1
      where id = prior_order_item.id
      returning * into canonical_order_item;

      mutation_result := jsonb_build_object(
        'status', 'applied',
        'repository', 'orderItems',
        'entityId', canonical_order_item.id,
        'serverVersion', canonical_order_item.version,
        'committedAt', now()
      );
      audit_entity_type := 'order_items';
      audit_before := to_jsonb(prior_order_item);
      audit_after := to_jsonb(canonical_order_item);

    else
      raise exception using errcode = '22023', message = 'unsupported_mutation_type';
  end case;

  insert into public.audit_events (
    organization_id,
    branch_id,
    actor_user_id,
    device_id,
    entity_type,
    entity_id,
    action,
    before_json,
    after_json,
    reason,
    client_mutation_id,
    correlation_id
  )
  values (
    requested_organization_id,
    requested_branch_id,
    caller_user_id,
    requested_device_id,
    audit_entity_type,
    requested_entity_id,
    requested_mutation_type,
    audit_before,
    audit_after,
    case
      when requested_mutation_type = 'order_items.cancel' then cancellation_reason.name
      else null
    end,
    requested_client_mutation_id,
    requested_client_mutation_id
  );

  update public.client_mutations
  set result_json = mutation_result,
      committed_at = now()
  where id = claimed_mutation_id;

  return mutation_result;
end;
$$;

revoke execute on function private.capture_catalog_sync_event()
  from public, anon, authenticated;
revoke execute on function private.bootstrap_global_catalog_for_branch()
  from public, anon, authenticated;
