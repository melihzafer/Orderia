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
    '12000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'mutation-manager@example.com',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Mutation Manager"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '12000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'mutation-waiter@example.com',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Mutation Waiter"}',
    now(),
    now()
  );

insert into public.organizations (id, name, slug, plan, status)
values (
  '22000000-0000-4000-8000-000000000001',
  'Mutation Tenant',
  'mutation-tenant',
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
    '32000000-0000-4000-8000-000000000001',
    '22000000-0000-4000-8000-000000000001',
    'Mutation Branch 1',
    'Europe/Sofia',
    'EUR',
    time '04:00',
    'MB1'
  ),
  (
    '32000000-0000-4000-8000-000000000002',
    '22000000-0000-4000-8000-000000000001',
    'Mutation Branch 2',
    'Europe/Sofia',
    'EUR',
    time '04:00',
    'MB2'
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
    '22000000-0000-4000-8000-000000000001',
    null,
    '12000000-0000-4000-8000-000000000001',
    'manager',
    'active'
  ),
  (
    '22000000-0000-4000-8000-000000000001',
    '32000000-0000-4000-8000-000000000001',
    '12000000-0000-4000-8000-000000000002',
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
values
  (
    '42000000-0000-4000-8000-000000000001',
    '22000000-0000-4000-8000-000000000001',
    '32000000-0000-4000-8000-000000000001',
    '12000000-0000-4000-8000-000000000001',
    'web',
    '2.0.0'
  ),
  (
    '42000000-0000-4000-8000-000000000002',
    '22000000-0000-4000-8000-000000000001',
    '32000000-0000-4000-8000-000000000001',
    '12000000-0000-4000-8000-000000000002',
    'android',
    '2.0.0'
  );

select set_config(
  'request.jwt.claims',
  '{"sub":"12000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (
    public.apply_client_mutation(
      '22000000-0000-4000-8000-000000000001',
      '32000000-0000-4000-8000-000000000001',
      '42000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000001',
      'halls.put',
      '52000000-0000-4000-8000-000000000001',
      '{"name":"Main Hall","sortOrder":1}',
      null
    ) ->> 'status'
  ),
  'applied',
  'an authorized manager can push a hall mutation'
);
select is(
  (
    select count(*)
    from public.halls
    where id = '52000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'the mutation writes the business entity'
);
select is(
  (
    select version
    from public.halls
    where id = '52000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'the create returns the first canonical version'
);
select is(
  (
    select count(*)
    from public.audit_events
    where client_mutation_id = '62000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'the server writes one audit event in the same transaction'
);
select is(
  (
    select count(*)
    from public.client_mutations
    where client_mutation_id = '62000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'the server stores one idempotency result'
);
select is(
  (
    public.apply_client_mutation(
      '22000000-0000-4000-8000-000000000001',
      '32000000-0000-4000-8000-000000000001',
      '42000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000001',
      'halls.put',
      '52000000-0000-4000-8000-000000000001',
      '{"name":"Main Hall","sortOrder":1}',
      null
    ) ->> 'serverVersion'
  ),
  '1',
  'replaying the same mutation returns the original result'
);
select throws_ok(
  $$
    select public.apply_client_mutation(
      '22000000-0000-4000-8000-000000000001',
      '32000000-0000-4000-8000-000000000001',
      '42000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000001',
      'halls.put',
      '52000000-0000-4000-8000-000000000001',
      '{"name":"Changed Replay","sortOrder":1}',
      null
    )
  $$,
  '22023',
  'client_mutation_id_reused_with_different_content',
  'a client mutation ID cannot be reused with different content'
);
select is(
  (
    public.apply_client_mutation(
      '22000000-0000-4000-8000-000000000001',
      '32000000-0000-4000-8000-000000000001',
      '42000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000002',
      'halls.put',
      '52000000-0000-4000-8000-000000000001',
      '{"name":"Main Dining","sortOrder":2}',
      1
    ) ->> 'serverVersion'
  ),
  '2',
  'a matching base version advances the canonical version'
);
select throws_ok(
  $$
    select public.apply_client_mutation(
      '22000000-0000-4000-8000-000000000001',
      '32000000-0000-4000-8000-000000000001',
      '42000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000003',
      'halls.put',
      '52000000-0000-4000-8000-000000000001',
      '{"name":"Stale Edit","sortOrder":3}',
      1
    )
  $$,
  'P0001',
  'version_conflict',
  'a stale base version is rejected as a conflict'
);
select throws_ok(
  $$
    select public.apply_client_mutation(
      '22000000-0000-4000-8000-000000000001',
      '32000000-0000-4000-8000-000000000002',
      '42000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000004',
      'halls.put',
      '52000000-0000-4000-8000-000000000004',
      '{"name":"Wrong Device Scope","sortOrder":1}',
      null
    )
  $$,
  '42501',
  'device_access_denied',
  'a device cannot push into another branch'
);
select throws_ok(
  $$
    select public.apply_client_mutation(
      '22000000-0000-4000-8000-000000000001',
      '32000000-0000-4000-8000-000000000001',
      '42000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000005',
      'unsafe.dynamic_sql',
      '52000000-0000-4000-8000-000000000005',
      '{}',
      null
    )
  $$,
  '22023',
  'unsupported_mutation_type',
  'unknown mutation types are not dispatched'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"12000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$
    select public.apply_client_mutation(
      '22000000-0000-4000-8000-000000000001',
      '32000000-0000-4000-8000-000000000001',
      '42000000-0000-4000-8000-000000000002',
      '62000000-0000-4000-8000-000000000006',
      'halls.put',
      '52000000-0000-4000-8000-000000000006',
      '{"name":"Waiter Hall","sortOrder":1}',
      null
    )
  $$,
  '42501',
  'manager_role_required',
  'a waiter cannot push a manager-only mutation'
);

select * from finish();
rollback;
