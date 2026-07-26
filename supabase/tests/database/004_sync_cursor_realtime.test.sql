begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '13000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'sync-waiter@example.com',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Sync Waiter"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '13000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'sync-manager@example.com',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Sync Manager"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '13000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'sync-other-tenant@example.com',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Other Tenant Waiter"}',
    now(),
    now()
  );

insert into public.organizations (id, name, slug, plan, status)
values
  (
    '23000000-0000-4000-8000-000000000001',
    'Sync Tenant A',
    'sync-tenant-a',
    'growth',
    'active'
  ),
  (
    '23000000-0000-4000-8000-000000000002',
    'Sync Tenant B',
    'sync-tenant-b',
    'growth',
    'active'
  );

insert into public.branches (
  id,
  organization_id,
  name,
  timezone,
  currency_code,
  business_day_cutoff,
  receipt_prefix
)
values
  (
    '33000000-0000-4000-8000-000000000001',
    '23000000-0000-4000-8000-000000000001',
    'Sync A / Branch 1',
    'Europe/Sofia',
    'EUR',
    time '04:00',
    'SA1'
  ),
  (
    '33000000-0000-4000-8000-000000000002',
    '23000000-0000-4000-8000-000000000001',
    'Sync A / Branch 2',
    'Europe/Sofia',
    'EUR',
    time '04:00',
    'SA2'
  ),
  (
    '33000000-0000-4000-8000-000000000003',
    '23000000-0000-4000-8000-000000000002',
    'Sync B / Branch 1',
    'Europe/Sofia',
    'EUR',
    time '04:00',
    'SB1'
  );

insert into public.memberships (
  organization_id,
  branch_id,
  user_id,
  role,
  status
)
values
  (
    '23000000-0000-4000-8000-000000000001',
    '33000000-0000-4000-8000-000000000001',
    '13000000-0000-4000-8000-000000000001',
    'waiter',
    'active'
  ),
  (
    '23000000-0000-4000-8000-000000000001',
    null,
    '13000000-0000-4000-8000-000000000002',
    'manager',
    'active'
  ),
  (
    '23000000-0000-4000-8000-000000000002',
    '33000000-0000-4000-8000-000000000003',
    '13000000-0000-4000-8000-000000000003',
    'waiter',
    'active'
  );

insert into public.devices (
  id,
  organization_id,
  branch_id,
  user_id,
  platform,
  app_version
)
values (
  '43000000-0000-4000-8000-000000000002',
  '23000000-0000-4000-8000-000000000001',
  '33000000-0000-4000-8000-000000000001',
  '13000000-0000-4000-8000-000000000002',
  'web',
  '2.0.0'
);

select is(
  (
    select count(*)
    from pg_catalog.pg_trigger as trigger_definition
    join pg_catalog.pg_class as relation
      on relation.oid = trigger_definition.tgrelid
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and not trigger_definition.tgisinternal
      and trigger_definition.tgname like '%_capture_sync_event'
  ),
  10::bigint,
  'all currently supported repositories emit durable sync events'
);
select ok(
  (
    select relation.relrowsecurity and relation.relforcerowsecurity
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'sync_events'
  ),
  'the durable event stream has forced RLS'
);

insert into public.halls (
  id,
  organization_id,
  branch_id,
  name,
  sort_order
)
values
  (
    '53000000-0000-4000-8000-000000000001',
    '23000000-0000-4000-8000-000000000001',
    '33000000-0000-4000-8000-000000000001',
    'Sync Hall A1',
    1
  ),
  (
    '53000000-0000-4000-8000-000000000002',
    '23000000-0000-4000-8000-000000000001',
    '33000000-0000-4000-8000-000000000002',
    'Sync Hall A2',
    1
  ),
  (
    '53000000-0000-4000-8000-000000000003',
    '23000000-0000-4000-8000-000000000002',
    '33000000-0000-4000-8000-000000000003',
    'Sync Hall B1',
    1
  );

select is(
  (select count(*) from public.sync_events),
  3::bigint,
  'business writes append one durable event each'
);
select is(
  (
    select count(*)
    from realtime.messages
    where event = 'sync_hint'
      and topic =
        'orderia:23000000-0000-4000-8000-000000000001:33000000-0000-4000-8000-000000000001:sync'
      and private
  ),
  1::bigint,
  'the database emits only a private branch-scoped sync hint'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"13000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (
    select count(*)
    from public.pull_sync_events(
      '23000000-0000-4000-8000-000000000001',
      '33000000-0000-4000-8000-000000000001',
      0,
      200
    )
  ),
  1::bigint,
  'waiter pulls only missed events from the assigned branch'
);
select is(
  (
    select payload_json ->> 'name'
    from public.pull_sync_events(
      '23000000-0000-4000-8000-000000000001',
      '33000000-0000-4000-8000-000000000001',
      0,
      200
    )
  ),
  'Sync Hall A1',
  'pull returns the canonical server payload'
);
select throws_ok(
  $$
    select *
    from public.pull_sync_events(
      '23000000-0000-4000-8000-000000000001',
      '33000000-0000-4000-8000-000000000002',
      0,
      200
    )
  $$,
  '42501',
  'branch_access_denied',
  'waiter cannot pull another branch'
);
select throws_ok(
  $$
    select *
    from public.pull_sync_events(
      '23000000-0000-4000-8000-000000000002',
      '33000000-0000-4000-8000-000000000003',
      0,
      200
    )
  $$,
  '42501',
  'branch_access_denied',
  'waiter cannot pull another tenant'
);
select ok(
  private.can_access_sync_topic(
    'orderia:23000000-0000-4000-8000-000000000001:33000000-0000-4000-8000-000000000001:sync'
  ),
  'waiter can subscribe to the assigned private branch topic'
);
select is(
  private.can_access_sync_topic(
    'orderia:23000000-0000-4000-8000-000000000001:33000000-0000-4000-8000-000000000002:sync'
  ),
  false,
  'waiter cannot subscribe to another private branch topic'
);
select throws_ok(
  $$
    select *
    from public.pull_sync_events(
      '23000000-0000-4000-8000-000000000001',
      '33000000-0000-4000-8000-000000000001',
      -1,
      200
    )
  $$,
  '22023',
  'invalid_sync_cursor',
  'invalid durable cursors are rejected'
);

reset role;
select set_config(
  'test.initial_sync_cursor',
  (
    select max(sequence)::text
    from public.sync_events
    where organization_id = '23000000-0000-4000-8000-000000000001'
      and branch_id = '33000000-0000-4000-8000-000000000001'
  ),
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"13000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (
    public.apply_client_mutation(
      '23000000-0000-4000-8000-000000000001',
      '33000000-0000-4000-8000-000000000001',
      '43000000-0000-4000-8000-000000000002',
      '63000000-0000-4000-8000-000000000001',
      'halls.put',
      '53000000-0000-4000-8000-000000000001',
      '{"name":"Updated by sync","sortOrder":2}',
      1
    ) ->> 'serverVersion'
  ),
  '2',
  'an idempotent write advances the canonical entity'
);
select is(
  (
    select count(*)
    from public.pull_sync_events(
      '23000000-0000-4000-8000-000000000001',
      '33000000-0000-4000-8000-000000000001',
      current_setting('test.initial_sync_cursor')::bigint,
      200
    )
  ),
  1::bigint,
  'cursor pull recovers the update even without a realtime message'
);
select is(
  (
    select client_mutation_id
    from public.pull_sync_events(
      '23000000-0000-4000-8000-000000000001',
      '33000000-0000-4000-8000-000000000001',
      current_setting('test.initial_sync_cursor')::bigint,
      200
    )
  ),
  '63000000-0000-4000-8000-000000000001'::uuid,
  'durable events retain the originating client mutation ID'
);

select * from finish();
rollback;
