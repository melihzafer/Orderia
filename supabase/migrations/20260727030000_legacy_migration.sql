-- Audited, idempotent migration from the v1 AsyncStorage backup format.
-- The snapshot itself is never retained server-side; only its SHA-256 and reconciliation report.

create extension if not exists pgcrypto with schema extensions;

create table public.legacy_migration_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  branch_id uuid not null,
  snapshot_hash text not null check (snapshot_hash ~ '^[a-f0-9]{64}$'),
  source_version text not null check (char_length(trim(source_version)) between 1 and 40),
  status text not null check (status in ('dry_run', 'applying', 'completed', 'failed')),
  report_json jsonb not null check (jsonb_typeof(report_json) = 'object'),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint legacy_migration_runs_branch_scope_fkey
    foreign key (organization_id, branch_id)
    references public.branches (organization_id, id)
    on delete cascade,
  unique (organization_id, branch_id, snapshot_hash),
  unique (organization_id, branch_id, id)
);

create table public.legacy_migration_mappings (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  branch_id uuid not null,
  migration_run_id uuid not null,
  legacy_entity_type text not null
    check (char_length(trim(legacy_entity_type)) between 1 and 40),
  legacy_entity_id text not null
    check (char_length(trim(legacy_entity_id)) between 1 and 200),
  target_entity_type text not null
    check (char_length(trim(target_entity_type)) between 1 and 40),
  target_entity_id uuid not null,
  created_at timestamptz not null default now(),
  constraint legacy_migration_mappings_run_scope_fkey
    foreign key (organization_id, branch_id, migration_run_id)
    references public.legacy_migration_runs (organization_id, branch_id, id)
    on delete cascade,
  primary key (migration_run_id, legacy_entity_type, legacy_entity_id)
);

create index legacy_migration_runs_scope_created_idx
  on public.legacy_migration_runs (organization_id, branch_id, created_at desc);
create index legacy_migration_mappings_target_idx
  on public.legacy_migration_mappings (
    organization_id,
    branch_id,
    target_entity_type,
    target_entity_id
  );

alter table public.legacy_migration_runs enable row level security;
alter table public.legacy_migration_runs force row level security;
alter table public.legacy_migration_mappings enable row level security;
alter table public.legacy_migration_mappings force row level security;

create policy legacy_migration_runs_manager_select
on public.legacy_migration_runs
for select to authenticated
using ((select private.is_manager(organization_id, branch_id)));

create policy legacy_migration_mappings_manager_select
on public.legacy_migration_mappings
for select to authenticated
using ((select private.is_manager(organization_id, branch_id)));

revoke all on table
  public.legacy_migration_runs,
  public.legacy_migration_mappings
from anon, authenticated;
grant select on table
  public.legacy_migration_runs,
  public.legacy_migration_mappings
to authenticated;

create or replace function private.legacy_target_id(
  requested_organization_id uuid,
  requested_branch_id uuid,
  requested_entity_type text,
  requested_legacy_id text
)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
declare
  digest_text text := md5(concat_ws(
    ':',
    requested_organization_id::text,
    requested_branch_id::text,
    requested_entity_type,
    requested_legacy_id
  ));
begin
  return (
    substr(digest_text, 1, 8) || '-' ||
    substr(digest_text, 9, 4) || '-4' ||
    substr(digest_text, 14, 3) || '-8' ||
    substr(digest_text, 18, 3) || '-' ||
    substr(digest_text, 21, 12)
  )::uuid;
end;
$$;

create or replace function private.inspect_legacy_snapshot(
  requested_organization_id uuid,
  requested_branch_id uuid,
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
  warning_count integer := 0;
  source_gross numeric := 0;
  computed_gross numeric := 0;
  open_gross numeric := 0;
  duplicate_count integer;
  orphan_count integer;
  missing_catalog_count integer;
  missing_actor_count integer;
  branch_row_count integer;
  collection text;
  history_day jsonb;
  ticket jsonb;
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

  select
    (select count(*) from public.halls
      where organization_id = requested_organization_id
        and branch_id = requested_branch_id
        and deleted_at is null)
    + (select count(*) from public.restaurant_tables
      where organization_id = requested_organization_id
        and branch_id = requested_branch_id
        and deleted_at is null)
    + (select count(*) from public.menu_categories
      where organization_id = requested_organization_id
        and branch_id = requested_branch_id
        and deleted_at is null)
    + (select count(*) from public.menu_items
      where organization_id = requested_organization_id
        and branch_id = requested_branch_id
        and deleted_at is null)
    + (select count(*) from public.table_sessions
      where organization_id = requested_organization_id
        and branch_id = requested_branch_id
        and deleted_at is null)
  into branch_row_count;
  if branch_row_count > 0 then
    issues := issues || jsonb_build_array(jsonb_build_object(
      'code', 'target_branch_not_empty',
      'severity', 'error',
      'path', 'branch',
      'message', 'Import requires a new empty branch.'
    ));
    error_count := error_count + 1;
  end if;

  foreach collection in array array[
    'halls', 'tables', 'categories', 'menuItems', 'openTickets'
  ]
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

  select count(*) - count(distinct ticket_row ->> 'id')
  into duplicate_count
  from (
    select value as ticket_row
    from jsonb_array_elements(requested_snapshot -> 'openTickets')
    union all
    select ticket_value
    from jsonb_array_elements(requested_snapshot -> 'historyDays') as day_row
    cross join lateral jsonb_array_elements(day_row -> 'tickets') as ticket_value
  ) as tickets;
  if duplicate_count > 0 then
    issues := issues || jsonb_build_array(jsonb_build_object(
      'code', 'duplicate_legacy_id',
      'severity', 'error',
      'path', 'tickets',
      'message', concat(duplicate_count, ' duplicate ticket IDs found.')
    ));
    error_count := error_count + duplicate_count;
  end if;

  select count(*) - count(distinct line_row ->> 'id')
  into duplicate_count
  from (
    select line_value as line_row
    from jsonb_array_elements(requested_snapshot -> 'openTickets') as ticket_row
    cross join lateral jsonb_array_elements(ticket_row -> 'lines') as line_value
    union all
    select line_value
    from jsonb_array_elements(requested_snapshot -> 'historyDays') as day_row
    cross join lateral jsonb_array_elements(day_row -> 'tickets') as ticket_row
    cross join lateral jsonb_array_elements(ticket_row -> 'lines') as line_value
  ) as lines;
  if duplicate_count > 0 then
    issues := issues || jsonb_build_array(jsonb_build_object(
      'code', 'duplicate_legacy_id',
      'severity', 'error',
      'path', 'tickets.lines',
      'message', concat(duplicate_count, ' duplicate order-line IDs found.')
    ));
    error_count := error_count + duplicate_count;
  end if;

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

  select count(*)
  into orphan_count
  from (
    select value as ticket_row
    from jsonb_array_elements(requested_snapshot -> 'openTickets')
    union all
    select ticket_value
    from jsonb_array_elements(requested_snapshot -> 'historyDays') as day_row
    cross join lateral jsonb_array_elements(day_row -> 'tickets') as ticket_value
  ) as tickets
  where not exists (
    select 1
    from jsonb_array_elements(requested_snapshot -> 'tables') as table_row
    where table_row ->> 'id' = tickets.ticket_row ->> 'tableId'
  );
  if orphan_count > 0 then
    issues := issues || jsonb_build_array(jsonb_build_object(
      'code', 'orphan_ticket',
      'severity', 'error',
      'path', 'tickets',
      'message', concat(orphan_count, ' tickets reference a missing table.')
    ));
    error_count := error_count + orphan_count;
  end if;

  select count(*)
  into missing_catalog_count
  from (
    select line_value
    from jsonb_array_elements(requested_snapshot -> 'openTickets') as open_ticket
    cross join lateral jsonb_array_elements(open_ticket -> 'lines') as line_value
    union all
    select line_value
    from jsonb_array_elements(requested_snapshot -> 'historyDays') as day_row
    cross join lateral jsonb_array_elements(day_row -> 'tickets') as closed_ticket
    cross join lateral jsonb_array_elements(closed_ticket -> 'lines') as line_value
  ) as lines
  where not exists (
    select 1
    from jsonb_array_elements(requested_snapshot -> 'menuItems') as item_row
    where item_row ->> 'id' = lines.line_value ->> 'menuItemId'
  );
  if missing_catalog_count > 0 then
    issues := issues || jsonb_build_array(jsonb_build_object(
      'code', 'missing_menu_snapshot',
      'severity', 'warning',
      'path', 'tickets.lines',
      'message', concat(
        missing_catalog_count,
        ' lines have no catalog item; their name and price snapshots will be preserved.'
      )
    ));
    warning_count := warning_count + 1;
  end if;

  select count(*)
  into missing_actor_count
  from (
    select line_value
    from jsonb_array_elements(requested_snapshot -> 'openTickets') as open_ticket
    cross join lateral jsonb_array_elements(open_ticket -> 'lines') as line_value
    union all
    select line_value
    from jsonb_array_elements(requested_snapshot -> 'historyDays') as day_row
    cross join lateral jsonb_array_elements(day_row -> 'tickets') as closed_ticket
    cross join lateral jsonb_array_elements(closed_ticket -> 'lines') as line_value
  ) as lines
  where nullif(trim(lines.line_value ->> 'createdByName'), '') is null;
  if missing_actor_count > 0 then
    issues := issues || jsonb_build_array(jsonb_build_object(
      'code', 'missing_waiter_attribution',
      'severity', 'warning',
      'path', 'tickets.lines',
      'message', concat(
        missing_actor_count,
        ' lines have no original waiter; the importing manager will be recorded.'
      )
    ));
    warning_count := warning_count + 1;
  end if;

  select count(*)
  into orphan_count
  from (
    select line_value
    from jsonb_array_elements(requested_snapshot -> 'openTickets') as open_ticket
    cross join lateral jsonb_array_elements(open_ticket -> 'lines') as line_value
    union all
    select line_value
    from jsonb_array_elements(requested_snapshot -> 'historyDays') as day_row
    cross join lateral jsonb_array_elements(day_row -> 'tickets') as closed_ticket
    cross join lateral jsonb_array_elements(closed_ticket -> 'lines') as line_value
  ) as lines
  where case
    when jsonb_typeof(lines.line_value -> 'priceSnapshot') <> 'number'
      or jsonb_typeof(lines.line_value -> 'quantity') <> 'number'
      or jsonb_typeof(lines.line_value -> 'createdAt') <> 'number'
      or jsonb_typeof(lines.line_value -> 'updatedAt') <> 'number'
      then true
    else
      (lines.line_value ->> 'priceSnapshot')::numeric < 0
      or trunc((lines.line_value ->> 'priceSnapshot')::numeric)
        <> (lines.line_value ->> 'priceSnapshot')::numeric
      or (lines.line_value ->> 'quantity')::numeric <= 0
      or (lines.line_value ->> 'createdAt')::numeric <= 0
      or (lines.line_value ->> 'updatedAt')::numeric <= 0
    end
    or nullif(trim(lines.line_value ->> 'id'), '') is null
    or nullif(trim(lines.line_value ->> 'nameSnapshot'), '') is null
    or lines.line_value ->> 'status'
      not in ('pending', 'delivered', 'paid', 'cancelled');
  if orphan_count > 0 then
    issues := issues || jsonb_build_array(jsonb_build_object(
      'code', 'invalid_order_line',
      'severity', 'error',
      'path', 'tickets.lines',
      'message', concat(orphan_count, ' order lines contain invalid values.')
    ));
    error_count := error_count + orphan_count;
  end if;

  select coalesce(sum((day_row ->> 'reportedGrossMinor')::numeric), 0)
  into source_gross
  from jsonb_array_elements(requested_snapshot -> 'historyDays') as day_row;
  select coalesce(sum(
    case
      when line_row ->> 'status' = 'cancelled' then 0
      else (line_row ->> 'priceSnapshot')::numeric
        * (line_row ->> 'quantity')::numeric
    end
  ), 0)
  into computed_gross
  from jsonb_array_elements(requested_snapshot -> 'historyDays') as day_row
  cross join lateral jsonb_array_elements(day_row -> 'tickets') as ticket_row
  cross join lateral jsonb_array_elements(ticket_row -> 'lines') as line_row;
  select coalesce(sum(
    case
      when line_row ->> 'status' = 'cancelled' then 0
      else (line_row ->> 'priceSnapshot')::numeric
        * (line_row ->> 'quantity')::numeric
    end
  ), 0)
  into open_gross
  from jsonb_array_elements(requested_snapshot -> 'openTickets') as ticket_row
  cross join lateral jsonb_array_elements(ticket_row -> 'lines') as line_row;

  if trunc(source_gross) <> source_gross
    or trunc(computed_gross) <> computed_gross
    or source_gross <> computed_gross then
    issues := issues || jsonb_build_array(jsonb_build_object(
      'code', 'financial_reconciliation_mismatch',
      'severity', 'error',
      'path', 'historyDays',
      'message', concat(
        'Reported gross ', source_gross, ' differs from computed gross ', computed_gross, '.'
      )
    ));
    error_count := error_count + 1;
  end if;

  for history_day in
    select value from jsonb_array_elements(requested_snapshot -> 'historyDays')
  loop
    if coalesce(history_day ->> 'businessDate', '') !~ '^\d{4}-\d{2}-\d{2}$' then
      raise exception using errcode = '22023', message = 'legacy_business_date_invalid';
    end if;
  end loop;
  for ticket in
    select value from jsonb_array_elements(requested_snapshot -> 'openTickets')
  loop
    if jsonb_typeof(ticket -> 'lines') <> 'array' then
      raise exception using errcode = '22023', message = 'legacy_ticket_lines_invalid';
    end if;
  end loop;

  return jsonb_build_object(
    'counts', jsonb_build_object(
      'halls', jsonb_array_length(requested_snapshot -> 'halls'),
      'tables', jsonb_array_length(requested_snapshot -> 'tables'),
      'categories', jsonb_array_length(requested_snapshot -> 'categories'),
      'menuItems', jsonb_array_length(requested_snapshot -> 'menuItems'),
      'openTickets', jsonb_array_length(requested_snapshot -> 'openTickets'),
      'closedTickets', (
        select coalesce(sum(jsonb_array_length(day_row -> 'tickets')), 0)
        from jsonb_array_elements(requested_snapshot -> 'historyDays') as day_row
      ),
      'orderItems', (
        select count(*)
        from (
          select line_row
          from jsonb_array_elements(requested_snapshot -> 'openTickets') as ticket_row
          cross join lateral jsonb_array_elements(ticket_row -> 'lines') as line_row
          union all
          select line_row
          from jsonb_array_elements(requested_snapshot -> 'historyDays') as day_row
          cross join lateral jsonb_array_elements(day_row -> 'tickets') as ticket_row
          cross join lateral jsonb_array_elements(ticket_row -> 'lines') as line_row
        ) as all_lines
      )
    ),
    'sourceClosedGrossMinor', source_gross::bigint,
    'computedClosedGrossMinor', computed_gross::bigint,
    'openOrderGrossMinor', open_gross::bigint,
    'issues', issues,
    'blockingIssueCount', error_count,
    'warningCount', warning_count,
    'reconciled', error_count = 0 and source_gross = computed_gross
  );
end;
$$;

create or replace function public.inspect_legacy_migration(
  requested_organization_id uuid,
  requested_branch_id uuid,
  requested_snapshot jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  snapshot_hash text;
  report jsonb;
  run_row public.legacy_migration_runs;
begin
  if not private.is_manager(requested_organization_id, requested_branch_id) then
    raise exception using errcode = '42501', message = 'manager_role_required';
  end if;
  snapshot_hash := encode(extensions.digest(requested_snapshot::text, 'sha256'), 'hex');
  select migration.*
  into run_row
  from public.legacy_migration_runs as migration
  where migration.organization_id = requested_organization_id
    and migration.branch_id = requested_branch_id
    and migration.snapshot_hash = snapshot_hash;
  if run_row.status = 'completed' then
    return jsonb_build_object(
      'runId', run_row.id,
      'status', run_row.status,
      'snapshotHash', run_row.snapshot_hash,
      'report', run_row.report_json
    );
  end if;

  report := private.inspect_legacy_snapshot(
    requested_organization_id,
    requested_branch_id,
    requested_snapshot
  );
  insert into public.legacy_migration_runs (
    organization_id,
    branch_id,
    snapshot_hash,
    source_version,
    status,
    report_json,
    created_by
  )
  values (
    requested_organization_id,
    requested_branch_id,
    snapshot_hash,
    requested_snapshot ->> 'sourceVersion',
    'dry_run',
    report,
    (select auth.uid())
  )
  on conflict (organization_id, branch_id, snapshot_hash) do update
  set report_json = excluded.report_json,
      status = case
        when public.legacy_migration_runs.status = 'completed'
          then public.legacy_migration_runs.status
        else 'dry_run'
      end
  returning * into run_row;

  return jsonb_build_object(
    'runId', run_row.id,
    'status', run_row.status,
    'snapshotHash', run_row.snapshot_hash,
    'report', run_row.report_json
  );
end;
$$;

create or replace function public.apply_legacy_migration(
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
  snapshot_hash text;
  report jsonb;
  run_row public.legacy_migration_runs;
  branch_row public.branches;
  organization_row public.organizations;
  hall_row jsonb;
  table_row jsonb;
  category_row jsonb;
  menu_row jsonb;
  ticket_row jsonb;
  line_row jsonb;
  day_row jsonb;
  target_id uuid;
  target_hall_id uuid;
  target_table_id uuid;
  target_category_id uuid;
  target_menu_id uuid;
  session_id uuid;
  check_id uuid;
  batch_id uuid;
  order_item_id uuid;
  cancellation_reason_id uuid;
  closed_at timestamptz;
  ticket_total numeric;
  receipt_id uuid;
  payment_id uuid;
  receipt_number text;
  snapshot_items jsonb;
  table_sequence integer := 0;
  table_label text;
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

  snapshot_hash := encode(extensions.digest(requested_snapshot::text, 'sha256'), 'hex');
  select migration.*
  into run_row
  from public.legacy_migration_runs as migration
  where migration.organization_id = requested_organization_id
    and migration.branch_id = requested_branch_id
    and migration.snapshot_hash = snapshot_hash
  for update;
  if run_row.status = 'completed' then
    return jsonb_build_object(
      'runId', run_row.id,
      'status', 'completed',
      'snapshotHash', run_row.snapshot_hash,
      'report', run_row.report_json,
      'idempotentReplay', true
    );
  end if;

  report := private.inspect_legacy_snapshot(
    requested_organization_id,
    requested_branch_id,
    requested_snapshot
  );
  if coalesce((report ->> 'blockingIssueCount')::integer, 1) <> 0
    or coalesce((report ->> 'reconciled')::boolean, false) is not true then
    raise exception using
      errcode = '22023',
      message = 'legacy_migration_reconciliation_failed',
      detail = report::text;
  end if;

  if run_row.id is null then
    insert into public.legacy_migration_runs (
      organization_id,
      branch_id,
      snapshot_hash,
      source_version,
      status,
      report_json,
      created_by
    )
    values (
      requested_organization_id,
      requested_branch_id,
      snapshot_hash,
      requested_snapshot ->> 'sourceVersion',
      'applying',
      report,
      caller_user_id
    )
    returning * into run_row;
  else
    update public.legacy_migration_runs
    set status = 'applying',
        report_json = report
    where id = run_row.id
    returning * into run_row;
  end if;

  -- PL/pgSQL bir record degiskenini cok ogeli INTO listesine koymaya izin
  -- vermez; sube ve organizasyon ayri ayri okunur.
  select branch.*
  into branch_row
  from public.branches as branch
  where branch.organization_id = requested_organization_id
    and branch.id = requested_branch_id
    and branch.status = 'active'
    and branch.deleted_at is null;
  if branch_row.id is null then
    raise exception using errcode = '22023', message = 'legacy_target_branch_unavailable';
  end if;

  select organization.*
  into organization_row
  from public.organizations as organization
  where organization.id = branch_row.organization_id;
  if organization_row.id is null then
    raise exception using errcode = '22023', message = 'legacy_target_branch_unavailable';
  end if;

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
    );
    insert into public.legacy_migration_mappings values (
      requested_organization_id, requested_branch_id, run_row.id,
      'hall', hall_row ->> 'id', 'hall', target_id, now()
    );
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
    );
    insert into public.legacy_migration_mappings values (
      requested_organization_id, requested_branch_id, run_row.id,
      'category', category_row ->> 'id', 'menu_category', target_id, now()
    );
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
      is_available, prep_time_minutes, version, created_by
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
      1,
      caller_user_id
    );
    insert into public.legacy_migration_mappings values (
      requested_organization_id, requested_branch_id, run_row.id,
      'menu_item', menu_row ->> 'id', 'menu_item', target_id, now()
    );
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
      (
        select name
        from public.halls
        where id = target_hall_id
      ),
      ' ',
      table_row ->> 'seq'
    )), 40);
    if exists (
      select 1
      from public.restaurant_tables
      where branch_id = requested_branch_id
        and lower(label) = lower(table_label)
        and deleted_at is null
    ) then
      table_label := left(table_label, 32) || ' ' || table_sequence::text;
    end if;
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
    );
    insert into public.legacy_migration_mappings values (
      requested_organization_id, requested_branch_id, run_row.id,
      'table', table_row ->> 'id', 'restaurant_table', target_id, now()
    );
  end loop;

  if exists (
    select 1
    from (
      select line_value
      from jsonb_array_elements(requested_snapshot -> 'openTickets') as open_ticket
      cross join lateral jsonb_array_elements(open_ticket -> 'lines') as line_value
      union all
      select line_value
      from jsonb_array_elements(requested_snapshot -> 'historyDays') as history_day
      cross join lateral jsonb_array_elements(history_day -> 'tickets') as closed_ticket
      cross join lateral jsonb_array_elements(closed_ticket -> 'lines') as line_value
    ) as all_lines
    where all_lines.line_value ->> 'status' = 'cancelled'
  ) then
    cancellation_reason_id := private.legacy_target_id(
      requested_organization_id, requested_branch_id, 'cancellation_reason', 'legacy'
    );
    insert into public.cancellation_reasons (
      id, organization_id, branch_id, name, requires_manager, is_active, version
    )
    values (
      cancellation_reason_id,
      requested_organization_id,
      requested_branch_id,
      'Legacy cancellation',
      false,
      true,
      1
    );
  end if;

  for ticket_row in
    select value from jsonb_array_elements(requested_snapshot -> 'openTickets')
  loop
    target_table_id := private.legacy_target_id(
      requested_organization_id, requested_branch_id, 'table', ticket_row ->> 'tableId'
    );
    session_id := private.legacy_target_id(
      requested_organization_id, requested_branch_id, 'open_session', ticket_row ->> 'tableId'
    );
    check_id := private.legacy_target_id(
      requested_organization_id, requested_branch_id, 'check', ticket_row ->> 'id'
    );
    batch_id := private.legacy_target_id(
      requested_organization_id, requested_branch_id, 'batch', ticket_row ->> 'id'
    );
    insert into public.table_sessions (
      id, organization_id, branch_id, table_id, status,
      opened_by, opened_at, version
    )
    values (
      session_id,
      requested_organization_id,
      requested_branch_id,
      target_table_id,
      'open',
      caller_user_id,
      to_timestamp((ticket_row ->> 'createdAt')::double precision / 1000),
      1
    )
    on conflict (id) do nothing;
    insert into public.checks (
      id, organization_id, branch_id, table_session_id, name,
      status, opened_by, opened_at, version
    )
    values (
      check_id,
      requested_organization_id,
      requested_branch_id,
      session_id,
      left(coalesce(nullif(trim(ticket_row ->> 'name'), ''), 'Hesap'), 80),
      'open',
      caller_user_id,
      to_timestamp((ticket_row ->> 'createdAt')::double precision / 1000),
      1
    );
    insert into public.order_batches (
      id, organization_id, branch_id, table_session_id, check_id,
      created_by, created_at, client_mutation_id
    )
    values (
      batch_id,
      requested_organization_id,
      requested_branch_id,
      session_id,
      check_id,
      caller_user_id,
      to_timestamp((ticket_row ->> 'createdAt')::double precision / 1000),
      private.legacy_target_id(
        requested_organization_id, requested_branch_id, 'mutation', ticket_row ->> 'id'
      )
    );
    for line_row in select value from jsonb_array_elements(ticket_row -> 'lines')
    loop
      order_item_id := private.legacy_target_id(
        requested_organization_id, requested_branch_id, 'order_item', line_row ->> 'id'
      );
      target_menu_id := private.legacy_target_id(
        requested_organization_id, requested_branch_id, 'menu_item', line_row ->> 'menuItemId'
      );
      if not exists (
        select 1 from public.menu_items
        where organization_id = requested_organization_id and id = target_menu_id
      ) then
        target_menu_id := null;
      end if;
      insert into public.order_items (
        id, organization_id, branch_id, table_session_id, check_id, order_batch_id,
        menu_item_id, name_snapshot, unit_price_minor, currency_code,
        tax_rate_basis_points, quantity, status, note, created_by, created_at,
        updated_by, updated_at, cancelled_by, cancelled_at, cancellation_reason_id,
        original_table_id, original_table_session_id, version
      )
      values (
        order_item_id,
        requested_organization_id,
        requested_branch_id,
        session_id,
        check_id,
        batch_id,
        target_menu_id,
        left(trim(line_row ->> 'nameSnapshot'), 160),
        (line_row ->> 'priceSnapshot')::bigint,
        branch_row.currency_code,
        0,
        (line_row ->> 'quantity')::numeric,
        case
          when line_row ->> 'status' = 'cancelled' then 'cancelled'
          when line_row ->> 'status' in ('delivered', 'paid') then 'served'
          else 'ordered'
        end,
        nullif(left(trim(coalesce(line_row ->> 'note', '')), 500), ''),
        caller_user_id,
        to_timestamp((line_row ->> 'createdAt')::double precision / 1000),
        caller_user_id,
        to_timestamp((line_row ->> 'updatedAt')::double precision / 1000),
        case when line_row ->> 'status' = 'cancelled' then caller_user_id else null end,
        case when line_row ->> 'status' = 'cancelled'
          then to_timestamp((line_row ->> 'updatedAt')::double precision / 1000)
          else null end,
        case when line_row ->> 'status' = 'cancelled' then cancellation_reason_id else null end,
        target_table_id,
        session_id,
        1
      );
      insert into public.legacy_migration_mappings values (
        requested_organization_id, requested_branch_id, run_row.id,
        'order_item', line_row ->> 'id', 'order_item', order_item_id, now()
      );
    end loop;
    insert into public.legacy_migration_mappings values (
      requested_organization_id, requested_branch_id, run_row.id,
      'ticket', ticket_row ->> 'id', 'check', check_id, now()
    );
  end loop;

  for day_row in
    select value from jsonb_array_elements(requested_snapshot -> 'historyDays')
  loop
    for ticket_row in select value from jsonb_array_elements(day_row -> 'tickets')
    loop
      target_table_id := private.legacy_target_id(
        requested_organization_id, requested_branch_id, 'table', ticket_row ->> 'tableId'
      );
      session_id := private.legacy_target_id(
        requested_organization_id, requested_branch_id, 'closed_session', ticket_row ->> 'id'
      );
      check_id := private.legacy_target_id(
        requested_organization_id, requested_branch_id, 'check', ticket_row ->> 'id'
      );
      batch_id := private.legacy_target_id(
        requested_organization_id, requested_branch_id, 'batch', ticket_row ->> 'id'
      );
      closed_at := to_timestamp(
        coalesce(
          (ticket_row ->> 'closedAt')::double precision,
          (ticket_row ->> 'createdAt')::double precision
        ) / 1000
      );
      insert into public.table_sessions (
        id, organization_id, branch_id, table_id, status,
        opened_by, opened_at, closed_by, closed_at, version
      )
      values (
        session_id,
        requested_organization_id,
        requested_branch_id,
        target_table_id,
        'closed',
        caller_user_id,
        to_timestamp((ticket_row ->> 'createdAt')::double precision / 1000),
        caller_user_id,
        closed_at,
        1
      );
      insert into public.checks (
        id, organization_id, branch_id, table_session_id, name,
        status, opened_by, opened_at, closed_at, version
      )
      values (
        check_id,
        requested_organization_id,
        requested_branch_id,
        session_id,
        left(coalesce(nullif(trim(ticket_row ->> 'name'), ''), 'Hesap'), 80),
        'paid',
        caller_user_id,
        to_timestamp((ticket_row ->> 'createdAt')::double precision / 1000),
        closed_at,
        1
      );
      insert into public.order_batches (
        id, organization_id, branch_id, table_session_id, check_id,
        created_by, created_at, client_mutation_id
      )
      values (
        batch_id,
        requested_organization_id,
        requested_branch_id,
        session_id,
        check_id,
        caller_user_id,
        to_timestamp((ticket_row ->> 'createdAt')::double precision / 1000),
        private.legacy_target_id(
          requested_organization_id, requested_branch_id, 'mutation', ticket_row ->> 'id'
        )
      );
      ticket_total := 0;
      snapshot_items := '[]'::jsonb;
      for line_row in select value from jsonb_array_elements(ticket_row -> 'lines')
      loop
        order_item_id := private.legacy_target_id(
          requested_organization_id, requested_branch_id, 'order_item', line_row ->> 'id'
        );
        target_menu_id := private.legacy_target_id(
          requested_organization_id, requested_branch_id, 'menu_item', line_row ->> 'menuItemId'
        );
        if not exists (
          select 1 from public.menu_items
          where organization_id = requested_organization_id and id = target_menu_id
        ) then
          target_menu_id := null;
        end if;
        insert into public.order_items (
          id, organization_id, branch_id, table_session_id, check_id, order_batch_id,
          menu_item_id, name_snapshot, unit_price_minor, currency_code,
          tax_rate_basis_points, quantity, status, note, created_by, created_at,
          updated_by, updated_at, cancelled_by, cancelled_at, cancellation_reason_id,
          original_table_id, original_table_session_id, version
        )
        values (
          order_item_id,
          requested_organization_id,
          requested_branch_id,
          session_id,
          check_id,
          batch_id,
          target_menu_id,
          left(trim(line_row ->> 'nameSnapshot'), 160),
          (line_row ->> 'priceSnapshot')::bigint,
          branch_row.currency_code,
          0,
          (line_row ->> 'quantity')::numeric,
          case
            when line_row ->> 'status' = 'cancelled' then 'cancelled'
            else 'served'
          end,
          nullif(left(trim(coalesce(line_row ->> 'note', '')), 500), ''),
          caller_user_id,
          to_timestamp((line_row ->> 'createdAt')::double precision / 1000),
          caller_user_id,
          to_timestamp((line_row ->> 'updatedAt')::double precision / 1000),
          case when line_row ->> 'status' = 'cancelled' then caller_user_id else null end,
          case when line_row ->> 'status' = 'cancelled'
            then to_timestamp((line_row ->> 'updatedAt')::double precision / 1000)
            else null end,
          case when line_row ->> 'status' = 'cancelled'
            then cancellation_reason_id else null end,
          target_table_id,
          session_id,
          1
        );
        if line_row ->> 'status' <> 'cancelled' then
          ticket_total := ticket_total
            + (line_row ->> 'priceSnapshot')::numeric
            * (line_row ->> 'quantity')::numeric;
          snapshot_items := snapshot_items || jsonb_build_array(jsonb_build_object(
            'orderItemId', order_item_id,
            'name', line_row ->> 'nameSnapshot',
            'modifiers', '[]'::jsonb,
            'unitPriceMinor', (line_row ->> 'priceSnapshot')::bigint,
            'quantity', (line_row ->> 'quantity')::numeric,
            'lineTotalMinor', (line_row ->> 'priceSnapshot')::numeric
              * (line_row ->> 'quantity')::numeric,
            'createdByDisplayName', coalesce(line_row ->> 'createdByName', 'Legacy waiter'),
            'createdAt', to_timestamp(
              (line_row ->> 'createdAt')::double precision / 1000
            )
          ));
        end if;
        insert into public.legacy_migration_mappings values (
          requested_organization_id, requested_branch_id, run_row.id,
          'order_item', line_row ->> 'id', 'order_item', order_item_id, now()
        );
      end loop;
      if ticket_total > 0 then
        payment_id := private.legacy_target_id(
          requested_organization_id,
          requested_branch_id,
          'legacy_payment',
          ticket_row ->> 'id'
        );
        insert into public.payments (
          id, organization_id, branch_id, table_session_id, method, status,
          amount_minor, currency_code, created_by, created_at, confirmed_at,
          idempotency_key, device_id
        )
        values (
          payment_id,
          requested_organization_id,
          requested_branch_id,
          session_id,
          case
            when ticket_row #>> '{paymentInfo,paymentMethod}' = 'card' then 'card'
            else 'cash'
          end,
          'confirmed',
          ticket_total::bigint,
          branch_row.currency_code,
          caller_user_id,
          closed_at,
          closed_at,
          concat('legacy:', ticket_row ->> 'id'),
          requested_device_id
        );
        insert into public.payment_allocations (
          id, organization_id, branch_id, payment_id, check_id, amount_minor, created_at
        )
        values (
          private.legacy_target_id(
            requested_organization_id,
            requested_branch_id,
            'legacy_payment_allocation',
            ticket_row ->> 'id'
          ),
          requested_organization_id,
          requested_branch_id,
          payment_id,
          check_id,
          ticket_total::bigint,
          closed_at
        );
      else
        payment_id := null;
      end if;
      receipt_id := private.legacy_target_id(
        requested_organization_id, requested_branch_id, 'receipt', ticket_row ->> 'id'
      );
      receipt_number := concat(
        'LEGACY-', left(replace(receipt_id::text, '-', ''), 20)
      );
      insert into public.receipts (
        id, organization_id, branch_id, table_session_id, check_id,
        receipt_number, business_date, issued_at, issued_by, total_minor,
        currency_code, snapshot_json, status
      )
      values (
        receipt_id,
        requested_organization_id,
        requested_branch_id,
        session_id,
        check_id,
        receipt_number,
        (day_row ->> 'businessDate')::date,
        closed_at,
        caller_user_id,
        ticket_total::bigint,
        branch_row.currency_code,
        jsonb_build_object(
          'schemaVersion', 1,
          'organizationName', organization_row.name,
          'branchName', branch_row.name,
          'branchTimezone', branch_row.timezone,
          'tableLabel', (
            select label from public.restaurant_tables where id = target_table_id
          ),
          'openedAt', to_timestamp(
            (ticket_row ->> 'createdAt')::double precision / 1000
          ),
          'issuedAt', closed_at,
          'waiterDisplayNames', coalesce((
            select jsonb_agg(distinct line_value ->> 'createdByName')
            from jsonb_array_elements(ticket_row -> 'lines') as line_value
            where nullif(trim(line_value ->> 'createdByName'), '') is not null
          ), jsonb_build_array('Legacy waiter')),
          'checks', jsonb_build_array(jsonb_build_object(
            'checkId', check_id,
            'name', coalesce(nullif(trim(ticket_row ->> 'name'), ''), 'Hesap'),
            'items', snapshot_items,
            'totalMinor', ticket_total::bigint
          )),
          'payments', case
            when ticket_total > 0 then jsonb_build_array(jsonb_build_object(
              'paymentId', payment_id,
              'method', coalesce(ticket_row #>> '{paymentInfo,paymentMethod}', 'cash'),
              'amountMinor', ticket_total::bigint,
              'confirmedAt', closed_at,
              'createdByDisplayName', 'Legacy import'
            ))
            else '[]'::jsonb
          end,
          'totalMinor', ticket_total::bigint,
          'currencyCode', branch_row.currency_code,
          'legacyImported', true
        ),
        'issued'
      );
      insert into public.legacy_migration_mappings values (
        requested_organization_id, requested_branch_id, run_row.id,
        'ticket', ticket_row ->> 'id', 'receipt', receipt_id, now()
      );
    end loop;
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
    'legacy_migration',
    run_row.id,
    'legacy_migration.apply',
    report,
    concat('snapshot_sha256:', snapshot_hash),
    run_row.id,
    run_row.id
  );

  update public.legacy_migration_runs
  set status = 'completed',
      report_json = report,
      completed_at = now()
  where id = run_row.id
  returning * into run_row;

  return jsonb_build_object(
    'runId', run_row.id,
    'status', run_row.status,
    'snapshotHash', run_row.snapshot_hash,
    'report', run_row.report_json,
    'idempotentReplay', false
  );
end;
$$;

revoke execute on function private.legacy_target_id(uuid, uuid, text, text)
from public, anon, authenticated;
revoke execute on function private.inspect_legacy_snapshot(uuid, uuid, jsonb)
from public, anon, authenticated;
revoke execute on function public.inspect_legacy_migration(uuid, uuid, jsonb)
from public, anon;
revoke execute on function public.apply_legacy_migration(uuid, uuid, uuid, jsonb)
from public, anon;
grant execute on function public.inspect_legacy_migration(uuid, uuid, jsonb)
to authenticated;
grant execute on function public.apply_legacy_migration(uuid, uuid, uuid, jsonb)
to authenticated;
