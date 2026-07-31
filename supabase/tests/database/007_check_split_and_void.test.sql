-- Adisyon bölme ve kısmi iptal komutlarının sunucu tarafı.
-- Senaryo: bir masada 4 bira + 1 kola tek adisyonla açılıyor; misafirlerden
-- biri kendi hesabını istiyor, sonra masada içilmemiş bir bira kalıyor.

begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

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
  '17000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'split-waiter@example.com',
  '',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Split Waiter"}',
  now(),
  now()
);

insert into public.organizations (id, name, slug, plan, status)
values (
  '27000000-0000-4000-8000-000000000001',
  'Split Tenant',
  'split-tenant',
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
  '37000000-0000-4000-8000-000000000001',
  '27000000-0000-4000-8000-000000000001',
  'Split Branch',
  'Europe/Sofia',
  'EUR',
  time '04:00',
  'SB1'
);

insert into public.memberships (organization_id, branch_id, user_id, role, status)
values (
  '27000000-0000-4000-8000-000000000001',
  '37000000-0000-4000-8000-000000000001',
  '17000000-0000-4000-8000-000000000001',
  'waiter',
  'active'
);

insert into public.devices (id, organization_id, branch_id, user_id, platform, app_version)
values (
  '47000000-0000-4000-8000-000000000001',
  '27000000-0000-4000-8000-000000000001',
  '37000000-0000-4000-8000-000000000001',
  '17000000-0000-4000-8000-000000000001',
  'android',
  '2.0.0'
);

insert into public.halls (id, organization_id, branch_id, name, sort_order)
values (
  '57000000-0000-4000-8000-000000000001',
  '27000000-0000-4000-8000-000000000001',
  '37000000-0000-4000-8000-000000000001',
  'Salon',
  1
);

insert into public.restaurant_tables (
  id,
  organization_id,
  branch_id,
  hall_id,
  label,
  sequence_number,
  sort_order
)
values (
  '67000000-0000-4000-8000-000000000001',
  '27000000-0000-4000-8000-000000000001',
  '37000000-0000-4000-8000-000000000001',
  '57000000-0000-4000-8000-000000000001',
  'Masa 4',
  4,
  4
);

insert into public.menu_categories (
  id,
  organization_id,
  branch_id,
  name,
  sort_order,
  created_by
)
values (
  '77000000-0000-4000-8000-000000000001',
  '27000000-0000-4000-8000-000000000001',
  '37000000-0000-4000-8000-000000000001',
  'İçecek',
  1,
  '17000000-0000-4000-8000-000000000001'
);

insert into public.menu_items (
  id,
  organization_id,
  branch_id,
  category_id,
  name,
  price_minor,
  currency_code,
  tax_rate_basis_points,
  created_by
)
values
  (
    '87000000-0000-4000-8000-000000000001',
    '27000000-0000-4000-8000-000000000001',
    '37000000-0000-4000-8000-000000000001',
    '77000000-0000-4000-8000-000000000001',
    'Bira',
    500,
    'EUR',
    2000,
    '17000000-0000-4000-8000-000000000001'
  ),
  (
    '87000000-0000-4000-8000-000000000002',
    '27000000-0000-4000-8000-000000000001',
    '37000000-0000-4000-8000-000000000001',
    '77000000-0000-4000-8000-000000000001',
    'Kola',
    300,
    'EUR',
    2000,
    '17000000-0000-4000-8000-000000000001'
  );

insert into public.cancellation_reasons (id, organization_id, branch_id, name, requires_manager)
values (
  'b7000000-0000-4000-8000-000000000001',
  '27000000-0000-4000-8000-000000000001',
  '37000000-0000-4000-8000-000000000001',
  'Müşteri istemedi',
  false
);

select set_config(
  'request.jwt.claims',
  '{"sub":"17000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

-- Masa tek adisyonla açılıyor: 4 bira, 1 kola.
select is(
  (
    public.apply_concurrent_order_batch(
      '27000000-0000-4000-8000-000000000001',
      '37000000-0000-4000-8000-000000000001',
      '47000000-0000-4000-8000-000000000001',
      'c7000000-0000-4000-8000-000000000001',
      'd7000000-0000-4000-8000-000000000001',
      jsonb_build_object(
        'tableId', '67000000-0000-4000-8000-000000000001',
        'session', jsonb_build_object(
          'id', 'e7000000-0000-4000-8000-000000000001',
          'openedAt', now()
        ),
        'check', jsonb_build_object(
          'id', 'f7000000-0000-4000-8000-000000000001',
          'name', 'Masa 4',
          'openedAt', now()
        ),
        'batch', jsonb_build_object(
          'id', 'd7000000-0000-4000-8000-000000000001',
          'createdAt', now()
        ),
        'items', jsonb_build_array(
          jsonb_build_object(
            'id', 'd7000000-0000-4000-8000-000000000011',
            'menuItemId', '87000000-0000-4000-8000-000000000001',
            'menuItemVersion', 1,
            'quantity', 4,
            'modifierSelections', jsonb_build_array()
          ),
          jsonb_build_object(
            'id', 'd7000000-0000-4000-8000-000000000012',
            'menuItemId', '87000000-0000-4000-8000-000000000002',
            'menuItemVersion', 1,
            'quantity', 1,
            'modifierSelections', jsonb_build_array()
          )
        )
      )
    ) ->> 'status'
  ),
  'applied',
  'the table opens with one shared check'
);

-- Ayşe kendi hesabını istiyor: 1 bira bölünür, kola tamamen taşınır.
select is(
  (
    public.apply_check_split_command(
      '27000000-0000-4000-8000-000000000001',
      '37000000-0000-4000-8000-000000000001',
      '47000000-0000-4000-8000-000000000001',
      'c7000000-0000-4000-8000-000000000002',
      'f7000000-0000-4000-8000-000000000001',
      jsonb_build_object(
        'kind', 'split',
        'sourceCheckId', 'f7000000-0000-4000-8000-000000000001',
        'targetCheck', jsonb_build_object(
          'id', 'f7000000-0000-4000-8000-000000000002',
          'name', 'Ayşe',
          'openedAt', now(),
          'isNew', true
        ),
        'batch', jsonb_build_object(
          'id', 'd7000000-0000-4000-8000-000000000002',
          'createdAt', now()
        ),
        'moves', jsonb_build_array(
          jsonb_build_object(
            'sourceItemId', 'd7000000-0000-4000-8000-000000000011',
            'expectedVersion', 1,
            'quantity', 1,
            'mode', 'split',
            'newItemId', 'd7000000-0000-4000-8000-000000000021',
            'modifiers', jsonb_build_array()
          ),
          jsonb_build_object(
            'sourceItemId', 'd7000000-0000-4000-8000-000000000012',
            'expectedVersion', 1,
            'quantity', 1,
            'mode', 'move',
            'modifiers', jsonb_build_array()
          )
        )
      ),
      1
    ) ->> 'status'
  ),
  'applied',
  'a waiter can split a shared check into a per-guest check'
);

select is(
  (select name from public.checks where id = 'f7000000-0000-4000-8000-000000000002'),
  'Ayşe',
  'the split opens the named guest check'
);
select is(
  (
    select quantity
    from public.order_items
    where id = 'd7000000-0000-4000-8000-000000000011'
  ),
  3::numeric(12, 3),
  'the source line keeps the quantity that did not move'
);
select is(
  (
    select quantity
    from public.order_items
    where id = 'd7000000-0000-4000-8000-000000000021'
  ),
  1::numeric(12, 3),
  'the split-off line carries exactly the moved quantity'
);
select is(
  (
    select check_id
    from public.order_items
    where id = 'd7000000-0000-4000-8000-000000000012'
  ),
  'f7000000-0000-4000-8000-000000000002'::uuid,
  'a fully moved line changes check instead of being duplicated'
);
select is(
  (
    select order_batch_id
    from public.order_items
    where id = 'd7000000-0000-4000-8000-000000000012'
  ),
  'd7000000-0000-4000-8000-000000000002'::uuid,
  'moved lines are re-parented to the target check batch'
);
select is(
  (
    select unit_price_minor
    from public.order_items
    where id = 'd7000000-0000-4000-8000-000000000021'
  ),
  500::bigint,
  'the split-off line keeps the price snapshot taken at order time'
);
select is(
  (
    select sum(quantity)
    from public.order_items
    where table_session_id = 'e7000000-0000-4000-8000-000000000001'
      and status <> 'cancelled'
  ),
  5::numeric(12, 3),
  'splitting never creates or destroys quantity'
);
select is(
  (select version from public.checks where id = 'f7000000-0000-4000-8000-000000000001'),
  2::bigint,
  'the source check version advances so stale devices are rejected'
);
select is(
  (
    select count(*)
    from public.audit_events
    where action = 'checks.split'
      and entity_id = 'f7000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'the split is auditable as one event'
);

-- Aynı komut tekrar gönderilirse ikinci kez uygulanmaz.
select is(
  (
    public.apply_check_split_command(
      '27000000-0000-4000-8000-000000000001',
      '37000000-0000-4000-8000-000000000001',
      '47000000-0000-4000-8000-000000000001',
      'c7000000-0000-4000-8000-000000000002',
      'f7000000-0000-4000-8000-000000000001',
      jsonb_build_object(
        'kind', 'split',
        'sourceCheckId', 'f7000000-0000-4000-8000-000000000001',
        'targetCheck', jsonb_build_object(
          'id', 'f7000000-0000-4000-8000-000000000002',
          'name', 'Ayşe',
          'openedAt', now(),
          'isNew', true
        ),
        'batch', jsonb_build_object(
          'id', 'd7000000-0000-4000-8000-000000000002',
          'createdAt', now()
        ),
        'moves', jsonb_build_array(
          jsonb_build_object(
            'sourceItemId', 'd7000000-0000-4000-8000-000000000011',
            'expectedVersion', 1,
            'quantity', 1,
            'mode', 'split',
            'newItemId', 'd7000000-0000-4000-8000-000000000021',
            'modifiers', jsonb_build_array()
          ),
          jsonb_build_object(
            'sourceItemId', 'd7000000-0000-4000-8000-000000000012',
            'expectedVersion', 1,
            'quantity', 1,
            'mode', 'move',
            'modifiers', jsonb_build_array()
          )
        )
      ),
      1
    ) ->> 'status'
  ),
  'applied',
  'a retried split replays its stored result'
);
select is(
  (
    select sum(quantity)
    from public.order_items
    where table_session_id = 'e7000000-0000-4000-8000-000000000001'
      and status <> 'cancelled'
  ),
  5::numeric(12, 3),
  'the retry does not move the same items twice'
);

-- Kapanmış hesap bölünemez, eski sürümle gelen cihaz reddedilir.
select throws_ok(
  $$
    select public.apply_check_split_command(
      '27000000-0000-4000-8000-000000000001',
      '37000000-0000-4000-8000-000000000001',
      '47000000-0000-4000-8000-000000000001',
      'c7000000-0000-4000-8000-000000000003',
      'f7000000-0000-4000-8000-000000000001',
      jsonb_build_object(
        'kind', 'split',
        'sourceCheckId', 'f7000000-0000-4000-8000-000000000001',
        'targetCheck', jsonb_build_object(
          'id', 'f7000000-0000-4000-8000-000000000003',
          'name', 'Ali',
          'openedAt', now(),
          'isNew', true
        ),
        'batch', jsonb_build_object(
          'id', 'd7000000-0000-4000-8000-000000000003',
          'createdAt', now()
        ),
        'moves', jsonb_build_array(
          jsonb_build_object(
            'sourceItemId', 'd7000000-0000-4000-8000-000000000011',
            'expectedVersion', 2,
            'quantity', 1,
            'mode', 'split',
            'newItemId', 'd7000000-0000-4000-8000-000000000031',
            'modifiers', jsonb_build_array()
          )
        )
      ),
      1
    );
  $$,
  'version_conflict',
  'a device holding a stale check version is told to refresh'
);

-- Fazla duran bira: 3 biradan 1'i gerekçesiyle düşülür.
select is(
  (
    public.apply_order_item_void_command(
      '27000000-0000-4000-8000-000000000001',
      '37000000-0000-4000-8000-000000000001',
      '47000000-0000-4000-8000-000000000001',
      'c7000000-0000-4000-8000-000000000004',
      'd7000000-0000-4000-8000-000000000011',
      jsonb_build_object(
        'voidQuantity', 1,
        'reasonId', 'b7000000-0000-4000-8000-000000000001',
        'voidedItemId', 'd7000000-0000-4000-8000-000000000041',
        'modifiers', jsonb_build_array()
      ),
      2
    ) ->> 'status'
  ),
  'applied',
  'a waiter can void only the untouched beer'
);
select is(
  (
    select quantity
    from public.order_items
    where id = 'd7000000-0000-4000-8000-000000000011'
  ),
  2::numeric(12, 3),
  'the served line keeps the quantity the guests actually have'
);
select is(
  (
    select status
    from public.order_items
    where id = 'd7000000-0000-4000-8000-000000000041'
  ),
  'cancelled',
  'the voided quantity survives as its own cancelled line'
);
select is(
  (
    select cancellation_reason_id
    from public.order_items
    where id = 'd7000000-0000-4000-8000-000000000041'
  ),
  'b7000000-0000-4000-8000-000000000001'::uuid,
  'the void carries the reason the guest gave'
);
select is(
  (
    select count(*)
    from public.audit_events
    where action = 'order_items.void_quantity'
      and entity_id = 'd7000000-0000-4000-8000-000000000011'
  ),
  1::bigint,
  'a partial void is auditable'
);

-- Tanımsız gerekçe ve fazla adet reddedilir.
select throws_ok(
  $$
    select public.apply_order_item_void_command(
      '27000000-0000-4000-8000-000000000001',
      '37000000-0000-4000-8000-000000000001',
      '47000000-0000-4000-8000-000000000001',
      'c7000000-0000-4000-8000-000000000005',
      'd7000000-0000-4000-8000-000000000011',
      jsonb_build_object(
        'voidQuantity', 9,
        'reasonId', 'b7000000-0000-4000-8000-000000000001',
        'voidedItemId', 'd7000000-0000-4000-8000-000000000042',
        'modifiers', jsonb_build_array()
      ),
      3
    );
  $$,
  'order_void_quantity_out_of_range',
  'a waiter cannot void more units than the table has'
);
select throws_ok(
  $$
    select public.apply_order_item_void_command(
      '27000000-0000-4000-8000-000000000001',
      '37000000-0000-4000-8000-000000000001',
      '47000000-0000-4000-8000-000000000001',
      'c7000000-0000-4000-8000-000000000006',
      'd7000000-0000-4000-8000-000000000011',
      jsonb_build_object(
        'voidQuantity', 1,
        'reasonId', 'b7000000-0000-4000-8000-0000000000ff',
        'voidedItemId', 'd7000000-0000-4000-8000-000000000043',
        'modifiers', jsonb_build_array()
      ),
      3
    );
  $$,
  'cancellation_reason_not_found',
  'a void without a branch reason is refused'
);

-- Tamamı iptal edilen satır ayrı bir satır üretmez.
select is(
  (
    public.apply_order_item_void_command(
      '27000000-0000-4000-8000-000000000001',
      '37000000-0000-4000-8000-000000000001',
      '47000000-0000-4000-8000-000000000001',
      'c7000000-0000-4000-8000-000000000007',
      'd7000000-0000-4000-8000-000000000021',
      jsonb_build_object(
        'voidQuantity', 1,
        'reasonId', 'b7000000-0000-4000-8000-000000000001',
        'modifiers', jsonb_build_array()
      ),
      1
    ) ->> 'status'
  ),
  'applied',
  'voiding every unit cancels the line itself'
);
select is(
  (
    select status
    from public.order_items
    where id = 'd7000000-0000-4000-8000-000000000021'
  ),
  'cancelled',
  'a fully voided line is cancelled in place'
);

-- Ödemesi onaylanmış kalem ne taşınır ne iptal edilir.
-- Ödeme satırları normalde confirm_check_payments üzerinden yazılır; burada
-- yalnızca durumu kurmak için sahibi olarak ekleriz.
reset role;

insert into public.payments (
  id,
  organization_id,
  branch_id,
  table_session_id,
  method,
  status,
  amount_minor,
  currency_code,
  created_by,
  idempotency_key,
  device_id,
  confirmed_at
)
values (
  'a7000000-0000-4000-8000-000000000001',
  '27000000-0000-4000-8000-000000000001',
  '37000000-0000-4000-8000-000000000001',
  'e7000000-0000-4000-8000-000000000001',
  'card',
  'confirmed',
  300,
  'EUR',
  '17000000-0000-4000-8000-000000000001',
  'split-test-payment-1',
  '47000000-0000-4000-8000-000000000001',
  now()
);

insert into public.payment_allocations (
  id,
  organization_id,
  branch_id,
  payment_id,
  check_id,
  order_item_id,
  quantity,
  amount_minor
)
values (
  'a7000000-0000-4000-8000-000000000011',
  '27000000-0000-4000-8000-000000000001',
  '37000000-0000-4000-8000-000000000001',
  'a7000000-0000-4000-8000-000000000001',
  'f7000000-0000-4000-8000-000000000002',
  'd7000000-0000-4000-8000-000000000012',
  1,
  300
);

select set_config(
  'request.jwt.claims',
  '{"sub":"17000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$
    select public.apply_check_split_command(
      '27000000-0000-4000-8000-000000000001',
      '37000000-0000-4000-8000-000000000001',
      '47000000-0000-4000-8000-000000000001',
      'c7000000-0000-4000-8000-000000000008',
      'f7000000-0000-4000-8000-000000000002',
      jsonb_build_object(
        'kind', 'split',
        'sourceCheckId', 'f7000000-0000-4000-8000-000000000002',
        'targetCheck', jsonb_build_object(
          'id', 'f7000000-0000-4000-8000-000000000001',
          'name', 'Masa 4',
          'openedAt', now(),
          'isNew', false
        ),
        'batch', jsonb_build_object(
          'id', 'd7000000-0000-4000-8000-000000000004',
          'createdAt', now()
        ),
        'moves', jsonb_build_array(
          jsonb_build_object(
            'sourceItemId', 'd7000000-0000-4000-8000-000000000012',
            'expectedVersion', 2,
            'quantity', 1,
            'mode', 'move',
            'modifiers', jsonb_build_array()
          )
        )
      ),
      2
    );
  $$,
  'paid_item_cannot_be_moved',
  'a paid item stays on the check that was paid'
);

select throws_ok(
  $$
    select public.apply_order_item_void_command(
      '27000000-0000-4000-8000-000000000001',
      '37000000-0000-4000-8000-000000000001',
      '47000000-0000-4000-8000-000000000001',
      'c7000000-0000-4000-8000-000000000009',
      'd7000000-0000-4000-8000-000000000012',
      jsonb_build_object(
        'voidQuantity', 1,
        'reasonId', 'b7000000-0000-4000-8000-000000000001',
        'modifiers', jsonb_build_array()
      ),
      2
    );
  $$,
  'paid_item_cannot_be_voided',
  'a paid item cannot be voided away after the guest paid'
);

reset role;

select * from finish();

rollback;
