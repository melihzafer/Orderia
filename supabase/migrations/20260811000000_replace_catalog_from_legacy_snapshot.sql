-- Catalog-only variant of the legacy migration: lets a manager re-import a
-- halls/tables/categories/menuItems backup into a branch that already has
-- data, archiving the branch's current catalog and replacing it with the
-- snapshot in a single transaction. Deliberately narrower than
-- apply_legacy_migration: it never touches tickets, sessions, payments, or
-- receipts, and rejects any snapshot that carries them.

create or replace function private.inspect_catalog_replace_snapshot(
  requested_snapshot jsonb
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  issues jsonb := '[]'::jsonb;
  error_count integer := 0;
  duplicate_count integer;
  orphan_count integer;
  collection text;
begin
  if jsonb_typeof(requested_snapshot) <> 'object'
    or requested_snapshot ->> 'schemaVersion' <> '1'
    or char_length(trim(coalesce(requested_snapshot ->> 'sourceVersion', ''))) not between 1 and 40
    or jsonb_typeof(requested_snapshot -> 'halls') <> 'array'
    or jsonb_typeof(requested_snapshot -> 'tables') <> 'array'
    or jsonb_typeof(requested_snapshot -> 'categories') <> 'array'
    or jsonb_typeof(requested_snapshot -> 'menuItems') <> 'array'
    or jsonb_typeof(requested_snapshot -> 'openTickets') <> 'array'
    or jsonb_typeof(requested_snapshot -> 'historyDays') <> 'array' then
    raise exception using errcode = '22023', message = 'legacy_snapshot_invalid';
  end if;
  if octet_length(requested_snapshot::text) > 5242880 then
    raise exception using errcode = '22023', message = 'legacy_snapshot_too_large';
  end if;

  if jsonb_array_length(requested_snapshot -> 'openTickets') > 0
    or jsonb_array_length(requested_snapshot -> 'historyDays') > 0 then
    issues := issues || jsonb_build_array(jsonb_build_object(
      'code', 'catalog_replace_requires_no_tickets',
      'severity', 'error',
      'path', 'openTickets',
      'message', 'Catalog replace does not accept open tickets or daily history; use the full legacy migration into an empty branch instead.'
    ));
    error_count := error_count + 1;
  end if;

  foreach collection in array array['halls', 'tables', 'categories', 'menuItems']
  loop
    execute format(
      'select count(*) - count(distinct value ->> ''id'')
       from jsonb_array_elements($1 -> %L)',
      collection
    )
    into duplicate_count
    using requested_snapshot;
    if duplicate_count > 0 then
      issues := issues || jsonb_build_array(jsonb_build_object(
        'code', 'duplicate_legacy_id',
        'severity', 'error',
        'path', collection,
        'message', concat(duplicate_count, ' duplicate IDs found.')
      ));
      error_count := error_count + duplicate_count;
    end if;
  end loop;

  select count(*)
  into orphan_count
  from jsonb_array_elements(requested_snapshot -> 'tables') as table_row
  where not exists (
    select 1
    from jsonb_array_elements(requested_snapshot -> 'halls') as hall_row
    where hall_row ->> 'id' = table_row ->> 'hallId'
  );
  if orphan_count > 0 then
    issues := issues || jsonb_build_array(jsonb_build_object(
      'code', 'orphan_table',
      'severity', 'error',
      'path', 'tables',
      'message', concat(orphan_count, ' tables reference a missing hall.')
    ));
    error_count := error_count + orphan_count;
  end if;

  select count(*)
  into orphan_count
  from jsonb_array_elements(requested_snapshot -> 'menuItems') as item_row
  where not exists (
    select 1
    from jsonb_array_elements(requested_snapshot -> 'categories') as category_row
    where category_row ->> 'id' = item_row ->> 'categoryId'
  );
  if orphan_count > 0 then
    issues := issues || jsonb_build_array(jsonb_build_object(
      'code', 'orphan_menu_item',
      'severity', 'error',
      'path', 'menuItems',
      'message', concat(orphan_count, ' menu items reference a missing category.')
    ));
    error_count := error_count + orphan_count;
  end if;

  return jsonb_build_object(
    'counts', jsonb_build_object(
      'halls', jsonb_array_length(requested_snapshot -> 'halls'),
      'tables', jsonb_array_length(requested_snapshot -> 'tables'),
      'categories', jsonb_array_length(requested_snapshot -> 'categories'),
      'menuItems', jsonb_array_length(requested_snapshot -> 'menuItems')
    ),
    'issues', issues,
    'blockingIssueCount', error_count
  );
end;
$$;

create or replace function public.replace_catalog_from_legacy_snapshot(
  requested_organization_id uuid,
  requested_branch_id uuid,
  requested_device_id uuid,
  requested_snapshot jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_user_id uuid := (select auth.uid());
  report jsonb;
  hall_row jsonb;
  table_row jsonb;
  category_row jsonb;
  menu_row jsonb;
  target_id uuid;
  target_hall_id uuid;
  target_category_id uuid;
  table_sequence integer := 0;
  table_label text;
  archived_at timestamptz := now();
  branch_row public.branches;
begin
  if not private.is_manager(requested_organization_id, requested_branch_id) then
    raise exception using errcode = '42501', message = 'manager_role_required';
  end if;
  if not exists (
    select 1
    from public.devices as device
    where device.organization_id = requested_organization_id
      and device.branch_id = requested_branch_id
      and device.id = requested_device_id
      and device.user_id = caller_user_id
      and device.revoked_at is null
  ) then
    raise exception using errcode = '42501', message = 'device_access_denied';
  end if;

  select branch.*
  into branch_row
  from public.branches as branch
  where branch.organization_id = requested_organization_id
    and branch.id = requested_branch_id
    and branch.status = 'active'
    and branch.deleted_at is null;
  if branch_row.id is null then
    raise exception using errcode = '22023', message = 'catalog_replace_target_branch_unavailable';
  end if;

  report := private.inspect_catalog_replace_snapshot(requested_snapshot);
  if coalesce((report ->> 'blockingIssueCount')::integer, 1) <> 0 then
    raise exception using
      errcode = '22023',
      message = 'catalog_replace_reconciliation_failed',
      detail = report::text;
  end if;

  update public.restaurant_tables
  set deleted_at = archived_at
  where organization_id = requested_organization_id
    and branch_id = requested_branch_id
    and deleted_at is null;
  update public.menu_items
  set deleted_at = archived_at
  where organization_id = requested_organization_id
    and branch_id = requested_branch_id
    and deleted_at is null;
  update public.menu_categories
  set deleted_at = archived_at
  where organization_id = requested_organization_id
    and branch_id = requested_branch_id
    and deleted_at is null;
  update public.halls
  set deleted_at = archived_at
  where organization_id = requested_organization_id
    and branch_id = requested_branch_id
    and deleted_at is null;

  for hall_row in
    select value from jsonb_array_elements(requested_snapshot -> 'halls')
  loop
    target_id := private.legacy_target_id(
      requested_organization_id, requested_branch_id, 'hall', hall_row ->> 'id'
    );
    insert into public.halls (
      id, organization_id, branch_id, name, sort_order, version, created_at, updated_at
    )
    values (
      target_id,
      requested_organization_id,
      requested_branch_id,
      left(trim(hall_row ->> 'name'), 120),
      greatest(coalesce((hall_row ->> 'nextTableSequence')::integer, 1) - 1, 0),
      1,
      to_timestamp((hall_row ->> 'createdAt')::double precision / 1000),
      now()
    )
    on conflict (id) do update
    set name = excluded.name,
        sort_order = excluded.sort_order,
        version = public.halls.version + 1,
        updated_at = now(),
        deleted_at = null;
  end loop;

  for category_row in
    select value from jsonb_array_elements(requested_snapshot -> 'categories')
  loop
    target_id := private.legacy_target_id(
      requested_organization_id, requested_branch_id, 'category', category_row ->> 'id'
    );
    insert into public.menu_categories (
      id, organization_id, branch_id, name, sort_order, is_active, version, created_by
    )
    values (
      target_id,
      requested_organization_id,
      requested_branch_id,
      left(trim(category_row ->> 'name'), 120),
      greatest(coalesce((category_row ->> 'order')::integer, 0), 0),
      true,
      1,
      caller_user_id
    )
    on conflict (id) do update
    set name = excluded.name,
        sort_order = excluded.sort_order,
        is_active = true,
        version = public.menu_categories.version + 1,
        updated_at = now(),
        deleted_at = null;
  end loop;

  for menu_row in
    select value from jsonb_array_elements(requested_snapshot -> 'menuItems')
  loop
    target_id := private.legacy_target_id(
      requested_organization_id, requested_branch_id, 'menu_item', menu_row ->> 'id'
    );
    target_category_id := private.legacy_target_id(
      requested_organization_id,
      requested_branch_id,
      'category',
      menu_row ->> 'categoryId'
    );
    insert into public.menu_items (
      id, organization_id, branch_id, category_id, name, description,
      price_minor, currency_code, tax_rate_basis_points, is_active,
      is_available, prep_time_minutes, fulfillment_group, version, created_by
    )
    values (
      target_id,
      requested_organization_id,
      requested_branch_id,
      target_category_id,
      left(trim(menu_row ->> 'name'), 160),
      nullif(left(trim(coalesce(menu_row ->> 'description', '')), 1000), ''),
      (menu_row ->> 'price')::bigint,
      branch_row.currency_code,
      0,
      coalesce((menu_row ->> 'isActive')::boolean, true),
      coalesce((menu_row ->> 'isActive')::boolean, true),
      (menu_row ->> 'prepTime')::integer,
      case
        when menu_row ->> 'fulfillmentGroup' in ('kitchen', 'drinks')
          then menu_row ->> 'fulfillmentGroup'
        else 'kitchen'
      end,
      1,
      caller_user_id
    )
    on conflict (id) do update
    set category_id = excluded.category_id,
        name = excluded.name,
        description = excluded.description,
        price_minor = excluded.price_minor,
        is_active = excluded.is_active,
        is_available = excluded.is_available,
        prep_time_minutes = excluded.prep_time_minutes,
        fulfillment_group = excluded.fulfillment_group,
        version = public.menu_items.version + 1,
        updated_at = now(),
        deleted_at = null;
  end loop;

  for table_row in
    select value from jsonb_array_elements(requested_snapshot -> 'tables')
  loop
    table_sequence := table_sequence + 1;
    target_id := private.legacy_target_id(
      requested_organization_id, requested_branch_id, 'table', table_row ->> 'id'
    );
    target_hall_id := private.legacy_target_id(
      requested_organization_id, requested_branch_id, 'hall', table_row ->> 'hallId'
    );
    table_label := left(coalesce(nullif(trim(table_row ->> 'label'), ''), concat(
      (select name from public.halls where id = target_hall_id),
      ' ',
      table_row ->> 'seq'
    )), 40);
    insert into public.restaurant_tables (
      id, organization_id, branch_id, hall_id, label,
      sequence_number, sort_order, version
    )
    values (
      target_id,
      requested_organization_id,
      requested_branch_id,
      target_hall_id,
      table_label,
      table_sequence,
      table_sequence - 1,
      1
    )
    on conflict (id) do update
    set hall_id = excluded.hall_id,
        label = excluded.label,
        sequence_number = excluded.sequence_number,
        sort_order = excluded.sort_order,
        version = public.restaurant_tables.version + 1,
        updated_at = now(),
        deleted_at = null;
  end loop;

  insert into public.audit_events (
    organization_id, branch_id, actor_user_id, device_id,
    entity_type, entity_id, action, after_json, reason,
    client_mutation_id, correlation_id
  )
  values (
    requested_organization_id,
    requested_branch_id,
    caller_user_id,
    requested_device_id,
    'catalog',
    requested_branch_id,
    'catalog.replace_from_legacy_snapshot',
    report,
    concat('source_version:', requested_snapshot ->> 'sourceVersion'),
    gen_random_uuid(),
    gen_random_uuid()
  );

  return jsonb_build_object(
    'status', 'completed',
    'report', report
  );
end;
$$;

revoke execute on function private.inspect_catalog_replace_snapshot(jsonb)
from public, anon, authenticated;
revoke execute on function public.replace_catalog_from_legacy_snapshot(uuid, uuid, uuid, jsonb)
from public, anon;
grant execute on function public.replace_catalog_from_legacy_snapshot(uuid, uuid, uuid, jsonb)
to authenticated;
