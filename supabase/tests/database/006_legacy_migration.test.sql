begin;

create extension if not exists pgtap with schema extensions;

select plan(27);

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
    '16000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'legacy-manager@example.com',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Legacy Manager"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '16000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'legacy-waiter@example.com',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Legacy Waiter"}',
    now(),
    now()
  );

insert into public.organizations (id, name, slug, plan, status)
values (
  '26000000-0000-4000-8000-000000000001',
  'Legacy Tenant',
  'legacy-tenant',
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
  '36000000-0000-4000-8000-000000000001',
  '26000000-0000-4000-8000-000000000001',
  'Legacy Empty Branch',
  'Europe/Sofia',
  'EUR',
  time '04:00',
  'LEG'
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
    '26000000-0000-4000-8000-000000000001',
    null,
    '16000000-0000-4000-8000-000000000001',
    'manager',
    'active'
  ),
  (
    '26000000-0000-4000-8000-000000000001',
    '36000000-0000-4000-8000-000000000001',
    '16000000-0000-4000-8000-000000000002',
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
    '46000000-0000-4000-8000-000000000001',
    '26000000-0000-4000-8000-000000000001',
    '36000000-0000-4000-8000-000000000001',
    '16000000-0000-4000-8000-000000000001',
    'android',
    '2.0.0'
  ),
  (
    '46000000-0000-4000-8000-000000000002',
    '26000000-0000-4000-8000-000000000001',
    '36000000-0000-4000-8000-000000000001',
    '16000000-0000-4000-8000-000000000002',
    'ios_web',
    '2.0.0'
  );

create function pg_temp.legacy_snapshot()
returns jsonb
language sql
immutable
as $$
  select $snapshot$
  {
    "schemaVersion": 1,
    "sourceVersion": "1.0.1",
    "halls": [
      {
        "id": "hall-1",
        "name": "Ana Salon",
        "createdAt": 1700000000000,
        "nextTableSequence": 2
      }
    ],
    "tables": [
      {
        "id": "table-1",
        "hallId": "hall-1",
        "seq": 1,
        "label": "Masa 1",
        "isOpen": true,
        "activeTicketIds": ["ticket-open"]
      }
    ],
    "categories": [
      {
        "id": "category-1",
        "name": "Atıştırmalık",
        "order": 1
      }
    ],
    "menuItems": [
      {
        "id": "menu-1",
        "categoryId": "category-1",
        "name": "Patates Kızartması",
        "price": 400,
        "isActive": true,
        "prepTime": 5
      }
    ],
    "openTickets": [
      {
        "id": "ticket-open",
        "tableId": "table-1",
        "name": "Bahçe grubu",
        "status": "open",
        "createdAt": 1784480400000,
        "lines": [
          {
            "id": "line-open",
            "menuItemId": "menu-1",
            "nameSnapshot": "Patates Kızartması",
            "priceSnapshot": 400,
            "quantity": 2,
            "createdByName": "Ayşe",
            "status": "pending",
            "createdAt": 1784480400000,
            "updatedAt": 1784480400000
          }
        ]
      }
    ],
    "historyDays": [
      {
        "businessDate": "2026-07-20",
        "reportedGrossMinor": 800,
        "tickets": [
          {
            "id": "ticket-closed",
            "tableId": "table-1",
            "name": "Öğle hesabı",
            "status": "paid",
            "createdAt": 1784541600000,
            "closedAt": 1784545200000,
            "paymentInfo": {
              "total": 800,
              "amountReceived": 800,
              "change": 0,
              "paymentMethod": "card"
            },
            "lines": [
              {
                "id": "line-closed",
                "menuItemId": "menu-1",
                "nameSnapshot": "Patates Kızartması",
                "priceSnapshot": 400,
                "quantity": 2,
                "createdByName": "Mehmet",
                "status": "paid",
                "createdAt": 1784541600000,
                "updatedAt": 1784545200000
              }
            ]
          }
        ]
      }
    ]
  }
  $snapshot$::jsonb;
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"16000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$
    select public.inspect_legacy_migration(
      '26000000-0000-4000-8000-000000000001',
      '36000000-0000-4000-8000-000000000001',
      pg_temp.legacy_snapshot()
    )
  $$,
  '42501',
  'manager_role_required',
  'waiters cannot inspect legacy migrations'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"16000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (
    public.inspect_legacy_migration(
      '26000000-0000-4000-8000-000000000001',
      '36000000-0000-4000-8000-000000000001',
      jsonb_set(
        pg_temp.legacy_snapshot(),
        '{historyDays,0,reportedGrossMinor}',
        '801'::jsonb
      )
    ) #>> '{report,blockingIssueCount}'
  )::integer,
  1,
  'dry-run blocks a financial reconciliation mismatch'
);

select ok(
  (
    public.inspect_legacy_migration(
      '26000000-0000-4000-8000-000000000001',
      '36000000-0000-4000-8000-000000000001',
      jsonb_set(
        pg_temp.legacy_snapshot(),
        '{historyDays,0,tickets,0,lines,0,id}',
        '"line-open"'::jsonb
      )
    ) #>> '{report,blockingIssueCount}'
  )::integer > 0,
  'dry-run blocks duplicate order-line IDs across tickets'
);

select is(
  public.inspect_legacy_migration(
    '26000000-0000-4000-8000-000000000001',
    '36000000-0000-4000-8000-000000000001',
    pg_temp.legacy_snapshot()
  ) #>> '{report,reconciled}',
  'true',
  'valid snapshot reconciles'
);

select is(
  public.inspect_legacy_migration(
    '26000000-0000-4000-8000-000000000001',
    '36000000-0000-4000-8000-000000000001',
    pg_temp.legacy_snapshot()
  ) ->> 'status',
  'dry_run',
  'inspection remains a non-mutating dry run'
);

select is(
  char_length(
    public.inspect_legacy_migration(
      '26000000-0000-4000-8000-000000000001',
      '36000000-0000-4000-8000-000000000001',
      pg_temp.legacy_snapshot()
    ) ->> 'snapshotHash'
  ),
  64,
  'snapshot is identified by SHA-256'
);

select is(
  public.apply_legacy_migration(
    '26000000-0000-4000-8000-000000000001',
    '36000000-0000-4000-8000-000000000001',
    '46000000-0000-4000-8000-000000000001',
    pg_temp.legacy_snapshot()
  ) ->> 'status',
  'completed',
  'manager applies a reconciled snapshot atomically'
);

select is(
  public.apply_legacy_migration(
    '26000000-0000-4000-8000-000000000001',
    '36000000-0000-4000-8000-000000000001',
    '46000000-0000-4000-8000-000000000001',
    pg_temp.legacy_snapshot()
  ) ->> 'idempotentReplay',
  'true',
  'replaying the same snapshot does not duplicate records'
);

select is(
  (select count(*) from public.halls where branch_id = '36000000-0000-4000-8000-000000000001'),
  1::bigint,
  'one hall is imported'
);
select is(
  (
    select count(*)
    from public.restaurant_tables
    where branch_id = '36000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'one table is imported'
);
select is(
  (
    select count(*)
    from public.menu_categories
    where branch_id = '36000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'one menu category is imported'
);
select is(
  (
    select count(*)
    from public.menu_items
    where branch_id = '36000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'one menu item is imported'
);
select is(
  (
    select count(*)
    from public.table_sessions
    where branch_id = '36000000-0000-4000-8000-000000000001'
  ),
  2::bigint,
  'open and historical sessions are both imported'
);
select is(
  (
    select count(*)
    from public.checks
    where branch_id = '36000000-0000-4000-8000-000000000001'
  ),
  2::bigint,
  'open and historical checks are both imported'
);
select is(
  (
    select count(*)
    from public.order_items
    where branch_id = '36000000-0000-4000-8000-000000000001'
  ),
  2::bigint,
  'all order lines are imported'
);
select is(
  (
    select count(*)
    from public.receipts
    where branch_id = '36000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'historical closed check gets an immutable receipt'
);
select is(
  (
    select total_minor
    from public.receipts
    where branch_id = '36000000-0000-4000-8000-000000000001'
  ),
  800::bigint,
  'receipt total matches the reconciled source'
);
select is(
  (
    select count(*)
    from public.payments
    where branch_id = '36000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'historical payment ledger is restored'
);
select is(
  (
    select count(*)
    from public.payment_allocations
    where branch_id = '36000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'historical payment allocation is restored'
);
select is(
  (
    select amount_minor
    from public.payments
    where branch_id = '36000000-0000-4000-8000-000000000001'
  ),
  800::bigint,
  'historical payment amount matches the receipt'
);
select is(
  (
    select count(*)
    from public.legacy_migration_mappings
    where branch_id = '36000000-0000-4000-8000-000000000001'
  ),
  8::bigint,
  'legacy-to-v2 mapping ledger covers imported entities'
);
select is(
  (
    select count(*)
    from public.audit_events
    where branch_id = '36000000-0000-4000-8000-000000000001'
      and action = 'legacy_migration.apply'
  ),
  1::bigint,
  'migration apply creates one audit event'
);
select is(
  (
    select count(*)
    from public.legacy_migration_runs
    where branch_id = '36000000-0000-4000-8000-000000000001'
      and status = 'completed'
  ),
  1::bigint,
  'only the valid snapshot is completed'
);
select is(
  (
    select count(*)
    from public.legacy_migration_runs
    where branch_id = '36000000-0000-4000-8000-000000000001'
  ),
  3::bigint,
  'manager can audit all dry-run and completed migration records'
);

select hasnt_column(
  'public',
  'legacy_migration_runs',
  'snapshot_json',
  'raw legacy snapshots are never retained server-side'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"16000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*) from public.legacy_migration_runs),
  0::bigint,
  'waiter cannot read manager migration runs'
);
select is(
  (select count(*) from public.legacy_migration_mappings),
  0::bigint,
  'waiter cannot read migration mappings'
);

select * from finish();
rollback;
