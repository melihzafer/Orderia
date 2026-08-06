begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

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
    '19000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'onboarding-manager@example.com',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Onboarding Manager"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '19000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'onboarding-waiter@example.com',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Onboarding Waiter"}',
    now(),
    now()
  );

create temp table onboarding_fixture (restaurant_code text) on commit drop;

select set_config(
  'request.jwt.claims',
  '{"sub":"19000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.create_restaurant('Onboarding Restaurant', 'Main branch') ->> 'role',
  'manager',
  'a manager can create a restaurant'
);
select is(
  (select count(*) from public.memberships where user_id = '19000000-0000-4000-8000-000000000001'),
  1::bigint,
  'restaurant creation creates one active manager membership'
);
select is(
  (select length(restaurant_code) from public.branches where name = 'Main branch'),
  8,
  'restaurant creation generates an eight-character code'
);
insert into onboarding_fixture (restaurant_code)
select restaurant_code
from public.branches
where name = 'Main branch';
select is(
  (select count(*) from onboarding_fixture),
  1::bigint,
  'the generated code is available to the creating manager'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"19000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.join_restaurant((select restaurant_code from onboarding_fixture), 'waiter') ->> 'role',
  'waiter',
  'a waiter can join with the restaurant code'
);
select is(
  (select count(*) from public.memberships where user_id = '19000000-0000-4000-8000-000000000002'),
  1::bigint,
  'joining creates one active waiter membership'
);
select lives_ok(
  $$
    select public.join_restaurant((select restaurant_code from onboarding_fixture), 'waiter')
  $$,
  'joining the same restaurant is idempotent'
);
select is(
  (select count(*) from public.memberships where user_id = '19000000-0000-4000-8000-000000000002'),
  1::bigint,
  'idempotent join does not duplicate membership'
);
select throws_ok(
  $$ select public.join_restaurant('BAD', 'waiter') $$,
  '22023',
  'invalid_restaurant_code',
  'invalid restaurant codes are rejected'
);

select * from finish();
rollback;
