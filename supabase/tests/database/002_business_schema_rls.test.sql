begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

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
    '11000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'business-waiter-a@example.com',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Business Waiter A"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '11000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'business-manager-a@example.com',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Business Manager A"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '11000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'business-waiter-b@example.com',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Business Waiter B"}',
    now(),
    now()
  );

insert into public.organizations (id, name, slug, plan, status)
values
  (
    '21000000-0000-4000-8000-000000000001',
    'Business Tenant A',
    'business-tenant-a',
    'growth',
    'active'
  ),
  (
    '21000000-0000-4000-8000-000000000002',
    'Business Tenant B',
    'business-tenant-b',
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
    '31000000-0000-4000-8000-000000000001',
    '21000000-0000-4000-8000-000000000001',
    'Business A / Branch 1',
    'Europe/Sofia',
    'EUR',
    time '04:00',
    'BA1'
  ),
  (
    '31000000-0000-4000-8000-000000000002',
    '21000000-0000-4000-8000-000000000001',
    'Business A / Branch 2',
    'Europe/Sofia',
    'EUR',
    time '04:00',
    'BA2'
  ),
  (
    '31000000-0000-4000-8000-000000000003',
    '21000000-0000-4000-8000-000000000002',
    'Business B / Branch 1',
    'Europe/Sofia',
    'EUR',
    time '04:00',
    'BB1'
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
    '21000000-0000-4000-8000-000000000001',
    '31000000-0000-4000-8000-000000000001',
    '11000000-0000-4000-8000-000000000001',
    'waiter',
    'active'
  ),
  (
    '21000000-0000-4000-8000-000000000001',
    null,
    '11000000-0000-4000-8000-000000000002',
    'manager',
    'active'
  ),
  (
    '21000000-0000-4000-8000-000000000002',
    '31000000-0000-4000-8000-000000000003',
    '11000000-0000-4000-8000-000000000003',
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
    '41000000-0000-4000-8000-000000000001',
    '21000000-0000-4000-8000-000000000001',
    '31000000-0000-4000-8000-000000000001',
    '11000000-0000-4000-8000-000000000001',
    'android',
    '2.0.0'
  ),
  (
    '41000000-0000-4000-8000-000000000003',
    '21000000-0000-4000-8000-000000000002',
    '31000000-0000-4000-8000-000000000003',
    '11000000-0000-4000-8000-000000000003',
    'ios_web',
    '2.0.0'
  );

insert into public.menu_categories (
  id,
  organization_id,
  branch_id,
  name,
  sort_order,
  created_by
)
values
  (
    '50000000-0000-4000-8000-000000000001',
    '21000000-0000-4000-8000-000000000001',
    null,
    'Shared Tenant A',
    1,
    '11000000-0000-4000-8000-000000000002'
  ),
  (
    '50000000-0000-4000-8000-000000000002',
    '21000000-0000-4000-8000-000000000001',
    '31000000-0000-4000-8000-000000000001',
    'Branch A1',
    2,
    '11000000-0000-4000-8000-000000000002'
  ),
  (
    '50000000-0000-4000-8000-000000000003',
    '21000000-0000-4000-8000-000000000001',
    '31000000-0000-4000-8000-000000000002',
    'Branch A2',
    3,
    '11000000-0000-4000-8000-000000000002'
  ),
  (
    '50000000-0000-4000-8000-000000000004',
    '21000000-0000-4000-8000-000000000002',
    '31000000-0000-4000-8000-000000000003',
    'Branch B1',
    1,
    '11000000-0000-4000-8000-000000000003'
  );

select throws_ok(
  $$
    insert into public.menu_items (
      organization_id,
      branch_id,
      category_id,
      name,
      price_minor,
      currency_code,
      created_by
    )
    values (
      '21000000-0000-4000-8000-000000000001',
      '31000000-0000-4000-8000-000000000001',
      '50000000-0000-4000-8000-000000000003',
      'Cross-branch item',
      400,
      'EUR',
      '11000000-0000-4000-8000-000000000002'
    )
  $$,
  '23514',
  'catalog_parent_scope_mismatch',
  'catalog relations cannot cross branch boundaries'
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
    '51000000-0000-4000-8000-000000000001',
    '21000000-0000-4000-8000-000000000001',
    '31000000-0000-4000-8000-000000000001',
    'Hall A1',
    1
  ),
  (
    '51000000-0000-4000-8000-000000000002',
    '21000000-0000-4000-8000-000000000001',
    '31000000-0000-4000-8000-000000000002',
    'Hall A2',
    1
  ),
  (
    '51000000-0000-4000-8000-000000000003',
    '21000000-0000-4000-8000-000000000002',
    '31000000-0000-4000-8000-000000000003',
    'Hall B1',
    1
  );

select throws_like(
  $$
    insert into public.restaurant_tables (
      id,
      organization_id,
      branch_id,
      hall_id,
      label,
      sequence_number
    )
    values (
      '52000000-0000-4000-8000-000000000099',
      '21000000-0000-4000-8000-000000000001',
      '31000000-0000-4000-8000-000000000001',
      '51000000-0000-4000-8000-000000000002',
      'Invalid Scope',
      99
    )
  $$,
  '%restaurant_tables_hall_scope_fkey%',
  'composite foreign keys reject cross-branch relationships'
);

insert into public.restaurant_tables (
  id,
  organization_id,
  branch_id,
  hall_id,
  label,
  sequence_number
)
values
  (
    '52000000-0000-4000-8000-000000000001',
    '21000000-0000-4000-8000-000000000001',
    '31000000-0000-4000-8000-000000000001',
    '51000000-0000-4000-8000-000000000001',
    'A1-1',
    1
  ),
  (
    '52000000-0000-4000-8000-000000000002',
    '21000000-0000-4000-8000-000000000001',
    '31000000-0000-4000-8000-000000000002',
    '51000000-0000-4000-8000-000000000002',
    'A2-1',
    1
  ),
  (
    '52000000-0000-4000-8000-000000000003',
    '21000000-0000-4000-8000-000000000002',
    '31000000-0000-4000-8000-000000000003',
    '51000000-0000-4000-8000-000000000003',
    'B1-1',
    1
  );

insert into public.table_sessions (
  id,
  organization_id,
  branch_id,
  table_id,
  opened_by
)
values
  (
    '53000000-0000-4000-8000-000000000001',
    '21000000-0000-4000-8000-000000000001',
    '31000000-0000-4000-8000-000000000001',
    '52000000-0000-4000-8000-000000000001',
    '11000000-0000-4000-8000-000000000001'
  ),
  (
    '53000000-0000-4000-8000-000000000002',
    '21000000-0000-4000-8000-000000000001',
    '31000000-0000-4000-8000-000000000002',
    '52000000-0000-4000-8000-000000000002',
    '11000000-0000-4000-8000-000000000002'
  ),
  (
    '53000000-0000-4000-8000-000000000003',
    '21000000-0000-4000-8000-000000000002',
    '31000000-0000-4000-8000-000000000003',
    '52000000-0000-4000-8000-000000000003',
    '11000000-0000-4000-8000-000000000003'
  );

insert into public.checks (
  id,
  organization_id,
  branch_id,
  table_session_id,
  name,
  opened_by
)
values
  (
    '54000000-0000-4000-8000-000000000001',
    '21000000-0000-4000-8000-000000000001',
    '31000000-0000-4000-8000-000000000001',
    '53000000-0000-4000-8000-000000000001',
    'A1 Main',
    '11000000-0000-4000-8000-000000000001'
  ),
  (
    '54000000-0000-4000-8000-000000000002',
    '21000000-0000-4000-8000-000000000001',
    '31000000-0000-4000-8000-000000000002',
    '53000000-0000-4000-8000-000000000002',
    'A2 Main',
    '11000000-0000-4000-8000-000000000002'
  ),
  (
    '54000000-0000-4000-8000-000000000003',
    '21000000-0000-4000-8000-000000000002',
    '31000000-0000-4000-8000-000000000003',
    '53000000-0000-4000-8000-000000000003',
    'B1 Main',
    '11000000-0000-4000-8000-000000000003'
  );

insert into public.order_batches (
  id,
  organization_id,
  branch_id,
  table_session_id,
  check_id,
  created_by,
  client_mutation_id
)
values (
  '55000000-0000-4000-8000-000000000001',
  '21000000-0000-4000-8000-000000000001',
  '31000000-0000-4000-8000-000000000001',
  '53000000-0000-4000-8000-000000000001',
  '54000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000001',
  '65000000-0000-4000-8000-000000000001'
);

insert into public.order_items (
  id,
  organization_id,
  branch_id,
  table_session_id,
  check_id,
  order_batch_id,
  name_snapshot,
  unit_price_minor,
  currency_code,
  quantity,
  created_by,
  updated_by,
  original_table_id,
  original_table_session_id
)
values (
  '56000000-0000-4000-8000-000000000001',
  '21000000-0000-4000-8000-000000000001',
  '31000000-0000-4000-8000-000000000001',
  '53000000-0000-4000-8000-000000000001',
  '54000000-0000-4000-8000-000000000001',
  '55000000-0000-4000-8000-000000000001',
  'Archived fries',
  400,
  'EUR',
  1,
  '11000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000001',
  '52000000-0000-4000-8000-000000000001',
  '53000000-0000-4000-8000-000000000001'
);

insert into public.payments (
  id,
  organization_id,
  branch_id,
  table_session_id,
  method,
  status,
  amount_minor,
  tendered_minor,
  change_minor,
  currency_code,
  created_by,
  confirmed_at,
  idempotency_key,
  device_id
)
values (
  '57000000-0000-4000-8000-000000000001',
  '21000000-0000-4000-8000-000000000001',
  '31000000-0000-4000-8000-000000000001',
  '53000000-0000-4000-8000-000000000001',
  'cash',
  'confirmed',
  400,
  500,
  100,
  'EUR',
  '11000000-0000-4000-8000-000000000001',
  now(),
  'business-payment-1',
  '41000000-0000-4000-8000-000000000001'
);

insert into public.receipts (
  id,
  organization_id,
  branch_id,
  table_session_id,
  check_id,
  receipt_number,
  business_date,
  issued_by,
  total_minor,
  currency_code,
  snapshot_json
)
values
  (
    '59000000-0000-4000-8000-000000000001',
    '21000000-0000-4000-8000-000000000001',
    '31000000-0000-4000-8000-000000000001',
    '53000000-0000-4000-8000-000000000001',
    '54000000-0000-4000-8000-000000000001',
    'BA1-000001',
    current_date,
    '11000000-0000-4000-8000-000000000001',
    400,
    'EUR',
    '{"schemaVersion":1,"items":[{"name":"Archived fries"}]}'
  ),
  (
    '59000000-0000-4000-8000-000000000003',
    '21000000-0000-4000-8000-000000000002',
    '31000000-0000-4000-8000-000000000003',
    '53000000-0000-4000-8000-000000000003',
    '54000000-0000-4000-8000-000000000003',
    'BB1-000001',
    current_date,
    '11000000-0000-4000-8000-000000000003',
    500,
    'EUR',
    '{"schemaVersion":1,"items":[{"name":"Tenant B item"}]}'
  );

insert into public.audit_events (
  id,
  organization_id,
  branch_id,
  actor_user_id,
  device_id,
  entity_type,
  entity_id,
  action,
  after_json,
  client_mutation_id,
  correlation_id
)
values (
  '5a000000-0000-4000-8000-000000000001',
  '21000000-0000-4000-8000-000000000001',
  '31000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000001',
  '41000000-0000-4000-8000-000000000001',
  'order_item',
  '56000000-0000-4000-8000-000000000001',
  'ordered',
  '{"status":"ordered"}',
  '65000000-0000-4000-8000-000000000001',
  '66000000-0000-4000-8000-000000000001'
);

select throws_ok(
  $$
    update public.receipts
    set total_minor = 999
    where id = '59000000-0000-4000-8000-000000000001'
  $$,
  '55000',
  'receipts_are_immutable_create_an_adjustment',
  'issued receipt snapshots cannot be changed'
);

select is(
  (
    select count(*)
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (
        'menu_categories',
        'menu_items',
        'modifier_groups',
        'modifier_options',
        'allergens',
        'menu_item_allergens',
        'halls',
        'restaurant_tables',
        'table_sessions',
        'session_participants',
        'checks',
        'cancellation_reasons',
        'order_batches',
        'order_items',
        'order_item_modifiers',
        'payments',
        'payment_allocations',
        'receipts',
        'audit_events',
        'client_mutations'
      )
      and relation.relrowsecurity
      and relation.relforcerowsecurity
  ),
  20::bigint,
  'all business tables have RLS enabled and forced'
);

select is(
  (
    select count(distinct index_definition.tablename)
    from pg_catalog.pg_indexes as index_definition
    where index_definition.schemaname = 'public'
      and index_definition.tablename in (
        'menu_categories',
        'menu_items',
        'modifier_groups',
        'modifier_options',
        'menu_item_allergens',
        'halls',
        'restaurant_tables',
        'table_sessions',
        'session_participants',
        'checks',
        'cancellation_reasons',
        'order_batches',
        'order_items',
        'order_item_modifiers',
        'payments',
        'payment_allocations',
        'receipts',
        'audit_events',
        'client_mutations'
      )
      and index_definition.indexdef
        like '%(organization_id, branch_id%'
  ),
  19::bigint,
  'every tenant-scoped business table indexes its RLS predicate'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*) from public.menu_categories),
  2::bigint,
  'waiter sees shared and assigned-branch menu categories'
);
select is(
  (select count(*) from public.halls),
  1::bigint,
  'waiter cannot see another branch layout'
);
select is(
  (select count(*) from public.table_sessions),
  1::bigint,
  'waiter sees only assigned-branch table sessions'
);
select is(
  (select count(*) from public.receipts),
  1::bigint,
  'waiter cannot read cross-tenant receipt history'
);
select is(
  (select count(*) from public.audit_events),
  0::bigint,
  'waiter cannot enumerate the manager audit trail'
);
select throws_like(
  $$
    insert into public.menu_categories (
      organization_id,
      branch_id,
      name,
      created_by
    )
    values (
      '21000000-0000-4000-8000-000000000001',
      '31000000-0000-4000-8000-000000000001',
      'Waiter Injection',
      '11000000-0000-4000-8000-000000000001'
    )
  $$,
  '%row-level security%',
  'waiter cannot mutate manager-owned menu data'
);
select throws_like(
  $$
    insert into public.table_sessions (
      organization_id,
      branch_id,
      table_id,
      opened_by
    )
    values (
      '21000000-0000-4000-8000-000000000001',
      '31000000-0000-4000-8000-000000000002',
      '52000000-0000-4000-8000-000000000002',
      '11000000-0000-4000-8000-000000000001'
    )
  $$,
  '%permission denied%',
  'transactional writes are unavailable outside audited RPCs'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"11000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*) from public.halls),
  2::bigint,
  'organization manager sees all tenant branches'
);
select is(
  (select count(*) from public.audit_events),
  1::bigint,
  'organization manager can inspect tenant audit events'
);
select lives_ok(
  $$
    insert into public.menu_categories (
      organization_id,
      branch_id,
      name,
      created_by
    )
    values (
      '21000000-0000-4000-8000-000000000001',
      '31000000-0000-4000-8000-000000000002',
      'Manager Category',
      '11000000-0000-4000-8000-000000000002'
    )
  $$,
  'organization manager can configure an authorized branch'
);
select throws_like(
  $$
    insert into public.menu_categories (
      organization_id,
      branch_id,
      name,
      created_by
    )
    values (
      '21000000-0000-4000-8000-000000000002',
      '31000000-0000-4000-8000-000000000003',
      'Cross Tenant Injection',
      '11000000-0000-4000-8000-000000000002'
    )
  $$,
  '%row-level security%',
  'manager cannot mutate another tenant'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"11000000-0000-4000-8000-000000000003","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*) from public.menu_categories),
  1::bigint,
  'tenant B waiter sees only tenant B menu data'
);
select is(
  (
    select count(*)
    from public.receipts
    where id = '59000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'tenant B waiter cannot fetch a known tenant A receipt ID'
);

select * from finish();
rollback;
