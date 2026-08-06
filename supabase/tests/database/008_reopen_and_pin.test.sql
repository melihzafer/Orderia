-- Kapalı siparişin yönetici PIN'i ve gerekçeyle yeniden açılması.

begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

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
values (
  '00000000-0000-0000-0000-000000000000',
  '18000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'reopen-manager@example.com',
  '',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Reopen Manager"}',
  now(),
  now()
);

insert into public.organizations (id, name, slug, plan, status)
values (
  '28000000-0000-4000-8000-000000000001',
  'Reopen Tenant',
  'reopen-tenant',
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
values (
  '38000000-0000-4000-8000-000000000001',
  '28000000-0000-4000-8000-000000000001',
  'Reopen Branch',
  'Europe/Sofia',
  'EUR',
  time '04:00',
  'RB1'
);

insert into public.memberships (organization_id, branch_id, user_id, role, status)
values (
  '28000000-0000-4000-8000-000000000001',
  '38000000-0000-4000-8000-000000000001',
  '18000000-0000-4000-8000-000000000001',
  'manager',
  'active'
);

insert into public.devices (id, organization_id, branch_id, user_id, platform, app_version)
values (
  '48000000-0000-4000-8000-000000000001',
  '28000000-0000-4000-8000-000000000001',
  '38000000-0000-4000-8000-000000000001',
  '18000000-0000-4000-8000-000000000001',
  'web',
  '2.0.0'
);

insert into public.halls (id, organization_id, branch_id, name, sort_order)
values (
  '58000000-0000-4000-8000-000000000001',
  '28000000-0000-4000-8000-000000000001',
  '38000000-0000-4000-8000-000000000001',
  'Festival',
  1
);

insert into public.restaurant_tables (id, organization_id, branch_id, hall_id, label, sequence_number)
values (
  '68000000-0000-4000-8000-000000000001',
  '28000000-0000-4000-8000-000000000001',
  '38000000-0000-4000-8000-000000000001',
  '58000000-0000-4000-8000-000000000001',
  'A1',
  1
);

insert into public.table_sessions (
  id,
  organization_id,
  branch_id,
  table_id,
  status,
  opened_by,
  opened_at,
  closed_by,
  closed_at
)
values (
  '78000000-0000-4000-8000-000000000001',
  '28000000-0000-4000-8000-000000000001',
  '38000000-0000-4000-8000-000000000001',
  '68000000-0000-4000-8000-000000000001',
  'closed',
  '18000000-0000-4000-8000-000000000001',
  now() - interval '2 hours',
  '18000000-0000-4000-8000-000000000001',
  now() - interval '1 hour'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"18000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.set_manager_action_pin(
    '28000000-0000-4000-8000-000000000001',
    '38000000-0000-4000-8000-000000000001',
    '48000000-0000-4000-8000-000000000001',
    'c8000000-0000-4000-8000-000000000001',
    '1234'
  ) ->> 'status',
  'applied',
  'manager can configure a branch PIN'
);

select is(
  public.reopen_closed_table_session(
    '28000000-0000-4000-8000-000000000001',
    '38000000-0000-4000-8000-000000000001',
    '48000000-0000-4000-8000-000000000001',
    'c8000000-0000-4000-8000-000000000002',
    '78000000-0000-4000-8000-000000000001',
    'Correct the wrong item',
    '1234'
  ) ->> 'status',
  'applied',
  'manager can reopen a closed session with the PIN'
);

select is(
  (select status from public.table_sessions where id = '78000000-0000-4000-8000-000000000001'),
  'open',
  'reopened session is open'
);

select ok(
  (select previous_closed_at is not null and closed_at is null
   from public.table_sessions where id = '78000000-0000-4000-8000-000000000001'),
  'the previous close is preserved while the session is reopened'
);

select is(
  (select count(*) from public.audit_events
   where entity_id = '78000000-0000-4000-8000-000000000001'
     and action = 'orders.reopen'),
  1::bigint,
  'reopening writes one auditable event'
);

select throws_ok(
  $$
    select public.reopen_closed_table_session(
      '28000000-0000-4000-8000-000000000001',
      '38000000-0000-4000-8000-000000000001',
      '48000000-0000-4000-8000-000000000001',
      'c8000000-0000-4000-8000-000000000003',
      '78000000-0000-4000-8000-000000000001',
      'Another correction',
      '9999'
    );
  $$,
  'manager_pin_invalid',
  'an invalid PIN is rejected'
);

select is(
  public.reopen_closed_table_session(
    '28000000-0000-4000-8000-000000000001',
    '38000000-0000-4000-8000-000000000001',
    '48000000-0000-4000-8000-000000000001',
    'c8000000-0000-4000-8000-000000000002',
    '78000000-0000-4000-8000-000000000001',
    'Correct the wrong item',
    '1234'
  ) ->> 'tableSessionId',
  '78000000-0000-4000-8000-000000000001',
  'the same client mutation replays its result'
);

reset role;
select * from finish();

rollback;
