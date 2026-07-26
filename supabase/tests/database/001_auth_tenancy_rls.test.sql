begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

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
    '10000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'waiter-a@example.com',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Waiter A"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'manager-a@example.com',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Manager A"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'waiter-b@example.com',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Waiter B"}',
    now(),
    now()
  );

insert into public.organizations (id, name, slug, plan, status)
values
  (
    '20000000-0000-4000-8000-000000000001',
    'Tenant A',
    'tenant-a',
    'growth',
    'active'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'Tenant B',
    'tenant-b',
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
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'Tenant A / Branch 1',
    'Europe/Sofia',
    'EUR',
    time '04:00',
    'A1'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    'Tenant A / Branch 2',
    'Europe/Sofia',
    'EUR',
    time '04:00',
    'A2'
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000002',
    'Tenant B / Branch 1',
    'Europe/Sofia',
    'EUR',
    time '04:00',
    'B1'
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
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'waiter',
    'active'
  ),
  (
    '20000000-0000-4000-8000-000000000001',
    null,
    '10000000-0000-4000-8000-000000000002',
    'manager',
    'active'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000003',
    'waiter',
    'active'
  );

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*) from public.organizations),
  1::bigint,
  'waiter sees only their organization'
);
select is(
  (select count(*) from public.branches),
  1::bigint,
  'waiter sees only their assigned branch'
);
select is(
  (select count(*) from public.memberships),
  1::bigint,
  'waiter cannot enumerate tenant memberships'
);
select is(
  (select count(*) from public.profiles),
  1::bigint,
  'waiter sees only profiles allowed by branch policy'
);
select lives_ok(
  $$
    select public.register_device(
      '40000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000001',
      'android',
      '1.0.1',
      null
    )
  $$,
  'waiter can register a device in the assigned branch'
);
select throws_ok(
  $$
    select public.register_device(
      '40000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000002',
      'android',
      '1.0.1',
      null
    )
  $$,
  '42501',
  'branch_access_denied',
  'waiter cannot register a device in another branch'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*) from public.branches),
  2::bigint,
  'organization manager sees every authorized branch'
);
select is(
  (select count(*) from public.memberships),
  2::bigint,
  'organization manager sees tenant memberships only'
);
select lives_ok(
  $$
    select public.revoke_device(
      '40000000-0000-4000-8000-000000000001'
    )
  $$,
  'manager can revoke a device in the organization'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$
    select public.register_device(
      '40000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000001',
      'android',
      '1.0.1',
      null
    )
  $$,
  '42501',
  'device_revoked',
  'a revoked device cannot restore its Orderia session'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (
    select count(*)
    from public.organizations
    where id = '20000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'cross-tenant organization access is denied'
);
select is(
  (
    select count(*)
    from public.devices
    where organization_id = '20000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'cross-tenant device access is denied'
);

select * from finish();
rollback;
