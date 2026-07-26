create table public.sync_events (
  sequence bigint generated always as identity primary key,
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  branch_id uuid not null,
  repository text not null
    check (repository ~ '^[a-z][a-z0-9_]{0,79}$'),
  entity_id text not null
    check (char_length(trim(entity_id)) between 1 and 160),
  operation text not null
    check (operation in ('insert', 'update', 'delete')),
  payload_json jsonb not null,
  server_version bigint check (server_version is null or server_version > 0),
  client_mutation_id uuid,
  committed_at timestamptz not null default now(),
  constraint sync_events_branch_organization_fkey
    foreign key (organization_id, branch_id)
    references public.branches (organization_id, id)
    on delete cascade
);

create index sync_events_scope_cursor_idx
  on public.sync_events (organization_id, branch_id, sequence);
create index sync_events_client_mutation_id_idx
  on public.sync_events (client_mutation_id);
create index sync_events_committed_at_idx
  on public.sync_events (committed_at);

alter table public.sync_events enable row level security;
alter table public.sync_events force row level security;

create policy sync_events_member_select
on public.sync_events
for select
to authenticated
using ((select private.is_active_member(organization_id, branch_id)));

revoke all on table public.sync_events from anon, authenticated;

create or replace function private.set_sync_mutation_context()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config(
    'orderia.client_mutation_id',
    new.client_mutation_id::text,
    true
  );
  return null;
end;
$$;

create trigger client_mutations_set_sync_context
  after insert on public.client_mutations
  for each row execute function private.set_sync_mutation_context();

create or replace function private.capture_sync_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb;
  event_sequence bigint;
  event_organization_id uuid;
  event_branch_id uuid;
  event_entity_id text;
  event_server_version bigint;
  event_client_mutation_id uuid;
  event_topic text;
begin
  row_data := case
    when tg_op = 'DELETE' then to_jsonb(old)
    else to_jsonb(new)
  end;
  event_organization_id := (row_data ->> 'organization_id')::uuid;
  event_branch_id := (row_data ->> 'branch_id')::uuid;
  event_entity_id := row_data ->> 'id';

  if event_entity_id is null then
    raise exception using
      errcode = '23502',
      message = 'sync_event_entity_id_required';
  end if;

  event_server_version := case
    when coalesce(row_data ->> 'version', '') ~ '^[1-9][0-9]*$'
      then (row_data ->> 'version')::bigint
    else null
  end;
  event_client_mutation_id := case
    when coalesce(
      current_setting('orderia.client_mutation_id', true),
      ''
    ) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then current_setting('orderia.client_mutation_id', true)::uuid
    else null
  end;

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
    event_branch_id,
    tg_table_name,
    event_entity_id,
    lower(tg_op),
    row_data,
    event_server_version,
    event_client_mutation_id
  )
  returning sequence into event_sequence;

  event_topic := concat(
    'orderia:',
    event_organization_id,
    ':',
    event_branch_id,
    ':sync'
  );
  perform realtime.send(
    jsonb_build_object('cursor', event_sequence),
    'sync_hint',
    event_topic,
    true
  );

  return null;
end;
$$;

create trigger halls_capture_sync_event
  after insert or update or delete on public.halls
  for each row execute function private.capture_sync_event();
create trigger restaurant_tables_capture_sync_event
  after insert or update or delete on public.restaurant_tables
  for each row execute function private.capture_sync_event();
create trigger table_sessions_capture_sync_event
  after insert or update or delete on public.table_sessions
  for each row execute function private.capture_sync_event();
create trigger checks_capture_sync_event
  after insert or update or delete on public.checks
  for each row execute function private.capture_sync_event();
create trigger order_batches_capture_sync_event
  after insert or update or delete on public.order_batches
  for each row execute function private.capture_sync_event();
create trigger order_items_capture_sync_event
  after insert or update or delete on public.order_items
  for each row execute function private.capture_sync_event();
create trigger order_item_modifiers_capture_sync_event
  after insert or update or delete on public.order_item_modifiers
  for each row execute function private.capture_sync_event();
create trigger payments_capture_sync_event
  after insert or update or delete on public.payments
  for each row execute function private.capture_sync_event();
create trigger payment_allocations_capture_sync_event
  after insert or update or delete on public.payment_allocations
  for each row execute function private.capture_sync_event();
create trigger receipts_capture_sync_event
  after insert or update or delete on public.receipts
  for each row execute function private.capture_sync_event();

create or replace function public.pull_sync_events(
  requested_organization_id uuid,
  requested_branch_id uuid,
  after_sequence bigint,
  page_size integer default 200
)
returns table (
  cursor text,
  organization_id uuid,
  branch_id uuid,
  repository text,
  entity_id text,
  operation text,
  payload_json jsonb,
  server_version bigint,
  client_mutation_id uuid,
  committed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if not private.is_active_member(
    requested_organization_id,
    requested_branch_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'branch_access_denied';
  end if;

  if after_sequence < 0 then
    raise exception using
      errcode = '22023',
      message = 'invalid_sync_cursor';
  end if;

  if page_size < 1 or page_size > 500 then
    raise exception using
      errcode = '22023',
      message = 'invalid_sync_page_size';
  end if;

  return query
  select
    event.sequence::text,
    event.organization_id,
    event.branch_id,
    event.repository,
    event.entity_id,
    event.operation,
    event.payload_json,
    event.server_version,
    event.client_mutation_id,
    event.committed_at
  from public.sync_events as event
  where event.organization_id = requested_organization_id
    and event.branch_id = requested_branch_id
    and event.sequence > after_sequence
  order by event.sequence
  limit page_size;
end;
$$;

revoke execute on function public.pull_sync_events(uuid, uuid, bigint, integer)
  from public, anon;
grant execute on function public.pull_sync_events(uuid, uuid, bigint, integer)
  to authenticated;

create or replace function private.can_access_sync_topic(requested_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  topic_organization_id text;
  topic_branch_id text;
begin
  if requested_topic is null
    or requested_topic !~
      '^orderia:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}:sync$' then
    return false;
  end if;

  topic_organization_id := split_part(requested_topic, ':', 2);
  topic_branch_id := split_part(requested_topic, ':', 3);

  return private.is_active_member(
    topic_organization_id::uuid,
    topic_branch_id::uuid
  );
end;
$$;

create policy orderia_branch_sync_broadcast_select
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and (
    select private.can_access_sync_topic(
      (select realtime.topic())
    )
  )
);

revoke execute on function private.capture_sync_event()
  from public, anon, authenticated;
revoke execute on function private.set_sync_mutation_context()
  from public, anon, authenticated;
revoke execute on function private.can_access_sync_topic(text)
  from public, anon;
grant execute on function private.can_access_sync_topic(text)
  to authenticated;
