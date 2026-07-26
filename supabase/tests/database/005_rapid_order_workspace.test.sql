begin;

create extension if not exists pgtap with schema extensions;

select plan(49);

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
    '15000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'workspace-waiter@example.com',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Workspace Waiter"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '15000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'second-waiter@example.com',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Second Waiter"}',
    now(),
    now()
  );

insert into public.organizations (id, name, slug, plan, status)
values (
  '25000000-0000-4000-8000-000000000001',
  'Workspace Tenant',
  'workspace-tenant',
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
    '35000000-0000-4000-8000-000000000001',
    '25000000-0000-4000-8000-000000000001',
    'Workspace Branch 1',
    'Europe/Sofia',
    'EUR',
    time '04:00',
    'WB1'
  ),
  (
    '35000000-0000-4000-8000-000000000002',
    '25000000-0000-4000-8000-000000000001',
    'Workspace Branch 2',
    'Europe/Sofia',
    'EUR',
    time '04:00',
    'WB2'
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
    '25000000-0000-4000-8000-000000000001',
    '35000000-0000-4000-8000-000000000001',
    '15000000-0000-4000-8000-000000000001',
    'waiter',
    'active'
  ),
  (
    '25000000-0000-4000-8000-000000000001',
    '35000000-0000-4000-8000-000000000001',
    '15000000-0000-4000-8000-000000000002',
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
    '45000000-0000-4000-8000-000000000001',
    '25000000-0000-4000-8000-000000000001',
    '35000000-0000-4000-8000-000000000001',
    '15000000-0000-4000-8000-000000000001',
    'android',
    '2.0.0'
  ),
  (
    '45000000-0000-4000-8000-000000000002',
    '25000000-0000-4000-8000-000000000001',
    '35000000-0000-4000-8000-000000000001',
    '15000000-0000-4000-8000-000000000002',
    'ios_web',
    '2.0.0'
  );

insert into public.halls (
  id,
  organization_id,
  branch_id,
  name,
  sort_order
)
values (
  '55000000-0000-4000-8000-000000000001',
  '25000000-0000-4000-8000-000000000001',
  '35000000-0000-4000-8000-000000000001',
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
values
  (
    '65000000-0000-4000-8000-000000000001',
    '25000000-0000-4000-8000-000000000001',
    '35000000-0000-4000-8000-000000000001',
    '55000000-0000-4000-8000-000000000001',
    'Masa 4',
    4,
    4
  ),
  (
    '65000000-0000-4000-8000-000000000002',
    '25000000-0000-4000-8000-000000000001',
    '35000000-0000-4000-8000-000000000001',
    '55000000-0000-4000-8000-000000000001',
    'Masa 5',
    5,
    5
  ),
  (
    '65000000-0000-4000-8000-000000000003',
    '25000000-0000-4000-8000-000000000001',
    '35000000-0000-4000-8000-000000000001',
    '55000000-0000-4000-8000-000000000001',
    'Masa 6',
    6,
    6
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
  '75000000-0000-4000-8000-000000000001',
  '25000000-0000-4000-8000-000000000001',
  null,
  'Atıştırmalık',
  1,
  '15000000-0000-4000-8000-000000000001'
);

select is(
  (
    select count(*)
    from public.sync_events
    where repository = 'menu_categories'
      and entity_id = '75000000-0000-4000-8000-000000000001'
  ),
  2::bigint,
  'an organization-wide category is projected to each active branch'
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
values (
  '85000000-0000-4000-8000-000000000001',
  '25000000-0000-4000-8000-000000000001',
  null,
  '75000000-0000-4000-8000-000000000001',
  'Patates kızartması',
  400,
  'EUR',
  2000,
  '15000000-0000-4000-8000-000000000001'
);

insert into public.modifier_groups (
  id,
  organization_id,
  branch_id,
  menu_item_id,
  name,
  selection_type,
  minimum_choices,
  maximum_choices,
  is_required,
  sort_order
)
values (
  '95000000-0000-4000-8000-000000000001',
  '25000000-0000-4000-8000-000000000001',
  null,
  '85000000-0000-4000-8000-000000000001',
  'Peynir',
  'single',
  1,
  1,
  true,
  1
);

insert into public.modifier_options (
  id,
  organization_id,
  branch_id,
  modifier_group_id,
  name,
  price_delta_minor,
  is_default,
  sort_order
)
values (
  'a5000000-0000-4000-8000-000000000001',
  '25000000-0000-4000-8000-000000000001',
  null,
  '95000000-0000-4000-8000-000000000001',
  'Peynirli',
  100,
  true,
  1
);

insert into public.cancellation_reasons (
  id,
  organization_id,
  branch_id,
  name,
  requires_manager
)
values
  (
    'b5000000-0000-4000-8000-000000000001',
    '25000000-0000-4000-8000-000000000001',
    '35000000-0000-4000-8000-000000000001',
    'Müşteri vazgeçti',
    false
  ),
  (
    'b5000000-0000-4000-8000-000000000002',
    '25000000-0000-4000-8000-000000000001',
    '35000000-0000-4000-8000-000000000001',
    'İkram',
    true
  );

select set_config(
  'request.jwt.claims',
  '{"sub":"15000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (
    public.apply_concurrent_order_batch(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      '45000000-0000-4000-8000-000000000001',
      'c5000000-0000-4000-8000-000000000001',
      'd5000000-0000-4000-8000-000000000001',
      jsonb_build_object(
        'tableId', '65000000-0000-4000-8000-000000000001',
        'session', jsonb_build_object(
          'id', 'e5000000-0000-4000-8000-000000000001',
          'openedAt', now()
        ),
        'check', jsonb_build_object(
          'id', 'f5000000-0000-4000-8000-000000000001',
          'name', 'Pencere tarafı',
          'openedAt', now()
        ),
        'batch', jsonb_build_object(
          'id', 'd5000000-0000-4000-8000-000000000001',
          'createdAt', now()
        ),
        'items', jsonb_build_array(
          jsonb_build_object(
            'id', 'd5000000-0000-4000-8000-000000000011',
            'menuItemId', '85000000-0000-4000-8000-000000000001',
            'menuItemVersion', 1,
            'quantity', 2,
            'note', 'Sos ayrı',
            'modifierSelections', jsonb_build_array(
              jsonb_build_object(
                'id', 'd5000000-0000-4000-8000-000000000021',
                'optionId', 'a5000000-0000-4000-8000-000000000001'
              )
            )
          )
        )
      )
    ) ->> 'status'
  ),
  'applied',
  'a waiter can atomically send a validated order batch'
);

select is(
  (
    select count(*)
    from public.table_sessions
    where id = 'e5000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'sending the first batch opens one table session'
);
select is(
  (
    select name
    from public.checks
    where id = 'f5000000-0000-4000-8000-000000000001'
  ),
  'Pencere tarafı',
  'the named check is retained'
);
select is(
  (
    select unit_price_minor
    from public.order_items
    where id = 'd5000000-0000-4000-8000-000000000011'
  ),
  400::bigint,
  'the server snapshots price from its catalog'
);
select is(
  (
    select modifier_option_name_snapshot
    from public.order_item_modifiers
    where id = 'd5000000-0000-4000-8000-000000000021'
  ),
  'Peynirli',
  'the server snapshots the validated modifier'
);
select is(
  (
    select created_by
    from public.order_items
    where id = 'd5000000-0000-4000-8000-000000000011'
  ),
  '15000000-0000-4000-8000-000000000001'::uuid,
  'the authenticated waiter is recorded on every order item'
);

select is(
  (
    public.apply_concurrent_order_batch(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      '45000000-0000-4000-8000-000000000001',
      'c5000000-0000-4000-8000-000000000001',
      'd5000000-0000-4000-8000-000000000001',
      jsonb_build_object(
        'tableId', '65000000-0000-4000-8000-000000000001',
        'session', jsonb_build_object(
          'id', 'e5000000-0000-4000-8000-000000000001',
          'openedAt', (select opened_at from public.table_sessions where id = 'e5000000-0000-4000-8000-000000000001')
        ),
        'check', jsonb_build_object(
          'id', 'f5000000-0000-4000-8000-000000000001',
          'name', 'Pencere tarafı',
          'openedAt', (select opened_at from public.checks where id = 'f5000000-0000-4000-8000-000000000001')
        ),
        'batch', jsonb_build_object(
          'id', 'd5000000-0000-4000-8000-000000000001',
          'createdAt', (select created_at from public.order_batches where id = 'd5000000-0000-4000-8000-000000000001')
        ),
        'items', jsonb_build_array(
          jsonb_build_object(
            'id', 'd5000000-0000-4000-8000-000000000011',
            'menuItemId', '85000000-0000-4000-8000-000000000001',
            'menuItemVersion', 1,
            'quantity', 2,
            'note', 'Sos ayrı',
            'modifierSelections', jsonb_build_array(
              jsonb_build_object(
                'id', 'd5000000-0000-4000-8000-000000000021',
                'optionId', 'a5000000-0000-4000-8000-000000000001'
              )
            )
          )
        )
      )
    ) ->> 'itemCount'
  ),
  '1',
  'an exact replay returns the stored result without duplicate rows'
);
select is(
  (
    select count(*)
    from public.order_items
    where order_batch_id = 'd5000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'the replay did not duplicate order items'
);

select is(
  (
    public.apply_client_mutation(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      '45000000-0000-4000-8000-000000000001',
      'c5000000-0000-4000-8000-000000000002',
      'order_items.cancel',
      'd5000000-0000-4000-8000-000000000011',
      '{"reasonId":"b5000000-0000-4000-8000-000000000001"}',
      1
    ) ->> 'serverVersion'
  ),
  '2',
  'a waiter can cancel a sent item with an allowed reason'
);
select is(
  (
    select cancellation_reason_id
    from public.order_items
    where id = 'd5000000-0000-4000-8000-000000000011'
  ),
  'b5000000-0000-4000-8000-000000000001'::uuid,
  'the cancelled order retains its reason instead of being deleted'
);

select throws_ok(
  $$
    select public.apply_client_mutation(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      '45000000-0000-4000-8000-000000000001',
      'c5000000-0000-4000-8000-000000000003',
      'order_items.cancel',
      'd5000000-0000-4000-8000-000000000011',
      '{"reasonId":"b5000000-0000-4000-8000-000000000002"}',
      2
    )
  $$,
  '22023',
  'order_item_cannot_be_cancelled',
  'a completed cancellation cannot be silently overwritten'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"15000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (
    public.apply_concurrent_order_batch(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      '45000000-0000-4000-8000-000000000002',
      'c5000000-0000-4000-8000-000000000011',
      'd5000000-0000-4000-8000-000000000101',
      jsonb_build_object(
        'tableId', '65000000-0000-4000-8000-000000000001',
        'session', jsonb_build_object(
          'id', 'e5000000-0000-4000-8000-000000000101',
          'openedAt', now()
        ),
        'check', jsonb_build_object(
          'id', 'f5000000-0000-4000-8000-000000000101',
          'name', 'Pencere tarafı',
          'openedAt', now()
        ),
        'batch', jsonb_build_object(
          'id', 'd5000000-0000-4000-8000-000000000101',
          'createdAt', now()
        ),
        'items', jsonb_build_array(
          jsonb_build_object(
            'id', 'd5000000-0000-4000-8000-000000000111',
            'menuItemId', '85000000-0000-4000-8000-000000000001',
            'menuItemVersion', 1,
            'quantity', 1,
            'note', 'İkinci cihaz',
            'modifierSelections', jsonb_build_array(
              jsonb_build_object(
                'id', 'd5000000-0000-4000-8000-000000000121',
                'optionId', 'a5000000-0000-4000-8000-000000000001'
              )
            )
          )
        )
      )
    ) ->> 'status'
  ),
  'applied',
  'a second offline waiter append is preserved'
);
select is(
  (
    select count(*)
    from public.table_sessions
    where table_id = '65000000-0000-4000-8000-000000000001'
      and status in ('open', 'payment_pending')
  ),
  1::bigint,
  'concurrent appends converge on one active table session'
);
select is(
  (
    select status
    from public.table_sessions
    where id = 'e5000000-0000-4000-8000-000000000101'
  ),
  'voided',
  'the second device provisional session is explicitly reconciled'
);
select is(
  (
    select status
    from public.checks
    where id = 'f5000000-0000-4000-8000-000000000101'
  ),
  'voided',
  'the duplicate provisional named check is explicitly reconciled'
);
select ok(
  (
    select
      table_session_id = 'e5000000-0000-4000-8000-000000000001'
      and check_id = 'f5000000-0000-4000-8000-000000000001'
    from public.order_items
    where id = 'd5000000-0000-4000-8000-000000000111'
  ),
  'the second waiter item points at the canonical session and check'
);
select is(
  (
    select count(*)
    from public.list_active_session_participants(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      'e5000000-0000-4000-8000-000000000001',
      now() - interval '1 minute'
    )
  ),
  2::bigint,
  'both recent waiter participants are visible'
);
select is(
  (
    public.apply_order_item_note_command(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      '45000000-0000-4000-8000-000000000002',
      'c5000000-0000-4000-8000-000000000012',
      'd5000000-0000-4000-8000-000000000111',
      '{"note":"İkinci garsonun notu"}',
      1
    ) ->> 'serverVersion'
  ),
  '2',
  'a matching note base version updates the server item'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"15000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$
    select public.apply_order_item_note_command(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      '45000000-0000-4000-8000-000000000001',
      'c5000000-0000-4000-8000-000000000013',
      'd5000000-0000-4000-8000-000000000111',
      '{"note":"Eski cihazın notu"}',
      1
    )
  $$,
  'P0001',
  'version_conflict',
  'a stale note edit is surfaced as a conflict instead of overwriting'
);
select is(
  (
    select note
    from public.order_items
    where id = 'd5000000-0000-4000-8000-000000000111'
  ),
  'İkinci garsonun notu',
  'the winning note remains unchanged after the stale edit'
);

select is(
  (
    public.confirm_check_payments(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      '45000000-0000-4000-8000-000000000001',
      'c5000000-0000-4000-8000-000000000021',
      jsonb_build_object(
        'checkId', 'f5000000-0000-4000-8000-000000000001',
        'expectedCheckVersion', 1,
        'currencyCode', 'EUR',
        'payments', jsonb_build_array(
          jsonb_build_object(
            'id', 'd5000000-0000-4000-8000-000000000201',
            'method', 'cash',
            'amountMinor', 100,
            'tenderedMinor', 200,
            'allocations', jsonb_build_array(
              jsonb_build_object(
                'id', 'd5000000-0000-4000-8000-000000000211',
                'amountMinor', 100
              )
            )
          ),
          jsonb_build_object(
            'id', 'd5000000-0000-4000-8000-000000000202',
            'method', 'card',
            'amountMinor', 100,
            'allocations', jsonb_build_array(
              jsonb_build_object(
                'id', 'd5000000-0000-4000-8000-000000000212',
                'amountMinor', 100
              )
            )
          )
        )
      )
    ) ->> 'status'
  ),
  'confirmed',
  'cash and card parts confirm atomically as one mixed payment command'
);
select is(
  (
    select count(*)
    from public.payments
    where table_session_id = 'e5000000-0000-4000-8000-000000000001'
  ),
  2::bigint,
  'a mixed command records distinct auditable cash and card payments'
);
select is(
  (
    select change_minor
    from public.payments
    where id = 'd5000000-0000-4000-8000-000000000201'
  ),
  100::bigint,
  'cash change is derived and excluded from paid revenue'
);
select is(
  (
    select status
    from public.checks
    where id = 'f5000000-0000-4000-8000-000000000001'
  ),
  'partially_paid',
  'a partial payment leaves the check explicitly partially paid'
);
select is(
  (
    select sum(allocation.amount_minor)
    from public.payment_allocations as allocation
    join public.payments as payment on payment.id = allocation.payment_id
    where allocation.check_id = 'f5000000-0000-4000-8000-000000000001'
      and payment.status = 'confirmed'
  ),
  200::numeric,
  'confirmed allocation ledger reports the exact partial paid amount'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"15000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$
    select public.confirm_check_payments(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      '45000000-0000-4000-8000-000000000002',
      'c5000000-0000-4000-8000-000000000022',
      jsonb_build_object(
        'checkId', 'f5000000-0000-4000-8000-000000000001',
        'expectedCheckVersion', 1,
        'currencyCode', 'EUR',
        'payments', jsonb_build_array(
          jsonb_build_object(
            'id', 'd5000000-0000-4000-8000-000000000203',
            'method', 'card',
            'amountMinor', 300,
            'allocations', jsonb_build_array(
              jsonb_build_object(
                'id', 'd5000000-0000-4000-8000-000000000213',
                'amountMinor', 300
              )
            )
          )
        )
      )
    )
  $$,
  'P0001',
  'payment_check_version_conflict',
  'a second device cannot consume a stale remaining balance'
);
select is(
  (
    select count(*)
    from public.payments
    where table_session_id = 'e5000000-0000-4000-8000-000000000001'
  ),
  2::bigint,
  'the rejected stale payment creates no financial rows'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"15000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (
    public.confirm_check_payments(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      '45000000-0000-4000-8000-000000000001',
      'c5000000-0000-4000-8000-000000000023',
      jsonb_build_object(
        'checkId', 'f5000000-0000-4000-8000-000000000001',
        'expectedCheckVersion', 2,
        'currencyCode', 'EUR',
        'payments', jsonb_build_array(
          jsonb_build_object(
            'id', 'd5000000-0000-4000-8000-000000000204',
            'method', 'card',
            'amountMinor', 300,
            'allocations', jsonb_build_array(
              jsonb_build_object(
                'id', 'd5000000-0000-4000-8000-000000000214',
                'orderItemId', 'd5000000-0000-4000-8000-000000000111',
                'amountMinor', 300
              )
            )
          )
        )
      )
    ) ->> 'checkStatus'
  ),
  'paid',
  'the final partial payment closes the remaining balance'
);
select ok(
  (
    select closed_at is not null
    from public.checks
    where id = 'f5000000-0000-4000-8000-000000000001'
  ),
  'a fully allocated check receives an immutable close timestamp'
);
select is(
  (
    select sum(allocation.amount_minor)
    from public.payment_allocations as allocation
    join public.payments as payment on payment.id = allocation.payment_id
    where allocation.check_id = 'f5000000-0000-4000-8000-000000000001'
      and payment.status = 'confirmed'
  ),
  500::numeric,
  'the final confirmed allocation total equals the server-derived check total'
);
select is(
  (
    public.confirm_check_payments(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      '45000000-0000-4000-8000-000000000001',
      'c5000000-0000-4000-8000-000000000023',
      jsonb_build_object(
        'checkId', 'f5000000-0000-4000-8000-000000000001',
        'expectedCheckVersion', 2,
        'currencyCode', 'EUR',
        'payments', jsonb_build_array(
          jsonb_build_object(
            'id', 'd5000000-0000-4000-8000-000000000204',
            'method', 'card',
            'amountMinor', 300,
            'allocations', jsonb_build_array(
              jsonb_build_object(
                'id', 'd5000000-0000-4000-8000-000000000214',
                'orderItemId', 'd5000000-0000-4000-8000-000000000111',
                'amountMinor', 300
              )
            )
          )
        )
      )
    ) ->> 'checkStatus'
  ),
  'paid',
  'an exact payment replay returns its stored server result'
);
select is(
  (
    select count(*)
    from public.payments
    where table_session_id = 'e5000000-0000-4000-8000-000000000001'
  ),
  3::bigint,
  'an idempotent replay never duplicates a payment'
);
select is(
  (
    select count(*)
    from public.payment_allocations
    where check_id = 'f5000000-0000-4000-8000-000000000001'
  ),
  3::bigint,
  'an idempotent replay never duplicates allocations'
);

select is(
  (
    public.transfer_or_merge_table_session(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      '45000000-0000-4000-8000-000000000001',
      'c5000000-0000-4000-8000-000000000031',
      jsonb_build_object(
        'sourceSessionId', 'e5000000-0000-4000-8000-000000000001',
        'targetTableId', '65000000-0000-4000-8000-000000000002',
        'expectedSourceVersion', 3,
        'expectedTargetVersion', null
      )
    ) ->> 'mode'
  ),
  'moved',
  'an active session moves atomically to an empty table'
);
select is(
  (
    select table_id
    from public.table_sessions
    where id = 'e5000000-0000-4000-8000-000000000001'
  ),
  '65000000-0000-4000-8000-000000000002'::uuid,
  'the moved session now belongs to the target table'
);
select is(
  (
    select transferred_from_table_id
    from public.table_sessions
    where id = 'e5000000-0000-4000-8000-000000000001'
  ),
  '65000000-0000-4000-8000-000000000001'::uuid,
  'the moved session retains its source table attribution'
);
select is(
  (
    select original_table_id
    from public.order_items
    where id = 'd5000000-0000-4000-8000-000000000111'
  ),
  '65000000-0000-4000-8000-000000000001'::uuid,
  'moving a table never rewrites the order item origin'
);
select is(
  (
    public.transfer_or_merge_table_session(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      '45000000-0000-4000-8000-000000000001',
      'c5000000-0000-4000-8000-000000000031',
      jsonb_build_object(
        'sourceSessionId', 'e5000000-0000-4000-8000-000000000001',
        'targetTableId', '65000000-0000-4000-8000-000000000002',
        'expectedSourceVersion', 3,
        'expectedTargetVersion', null
      )
    ) ->> 'mode'
  ),
  'moved',
  'an exact empty-table transfer replay returns its stored result'
);

reset role;
insert into public.table_sessions (
  id,
  organization_id,
  branch_id,
  table_id,
  status,
  opened_by,
  opened_at,
  version
)
values (
  'e5000000-0000-4000-8000-000000000301',
  '25000000-0000-4000-8000-000000000001',
  '35000000-0000-4000-8000-000000000001',
  '65000000-0000-4000-8000-000000000003',
  'open',
  '15000000-0000-4000-8000-000000000001',
  now(),
  1
);
insert into public.checks (
  id,
  organization_id,
  branch_id,
  table_session_id,
  name,
  status,
  opened_by,
  opened_at,
  version
)
values (
  'f5000000-0000-4000-8000-000000000301',
  '25000000-0000-4000-8000-000000000001',
  '35000000-0000-4000-8000-000000000001',
  'e5000000-0000-4000-8000-000000000301',
  'Bahçe',
  'open',
  '15000000-0000-4000-8000-000000000001',
  now(),
  1
);
select set_config(
  'request.jwt.claims',
  '{"sub":"15000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (
    public.transfer_or_merge_table_session(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      '45000000-0000-4000-8000-000000000001',
      'c5000000-0000-4000-8000-000000000032',
      jsonb_build_object(
        'sourceSessionId', 'e5000000-0000-4000-8000-000000000001',
        'targetTableId', '65000000-0000-4000-8000-000000000003',
        'expectedSourceVersion', 4,
        'expectedTargetVersion', 1
      )
    ) ->> 'mode'
  ),
  'merged',
  'a transfer into an occupied table merges the sessions atomically'
);
select is(
  (
    select status
    from public.table_sessions
    where id = 'e5000000-0000-4000-8000-000000000001'
  ),
  'voided',
  'the merged source session is retained as an explicit voided record'
);
select is(
  (
    select count(*)
    from public.table_sessions
    where table_id = '65000000-0000-4000-8000-000000000003'
      and status in ('open', 'payment_pending')
  ),
  1::bigint,
  'the occupied target keeps exactly one active canonical session'
);
select is(
  (
    select count(*)
    from public.checks
    where table_session_id = 'e5000000-0000-4000-8000-000000000301'
  ),
  2::bigint,
  'all named checks are preserved separately on the merged session'
);
select is(
  (
    select string_agg(name, ',' order by name)
    from public.checks
    where table_session_id = 'e5000000-0000-4000-8000-000000000301'
  ),
  'Bahçe,Pencere tarafı',
  'a merge preserves every check name without mixing their contents'
);
select is(
  (
    select table_session_id
    from public.order_items
    where id = 'd5000000-0000-4000-8000-000000000111'
  ),
  'e5000000-0000-4000-8000-000000000301'::uuid,
  'order items follow their named check to the canonical target session'
);
select is(
  (
    select original_table_session_id
    from public.order_items
    where id = 'd5000000-0000-4000-8000-000000000111'
  ),
  'e5000000-0000-4000-8000-000000000001'::uuid,
  'merged order items retain their immutable original session'
);
select is(
  (
    select count(*)
    from public.payments
    where table_session_id = 'e5000000-0000-4000-8000-000000000301'
  ),
  3::bigint,
  'the confirmed payment ledger follows the merged checks'
);
select is(
  (
    public.transfer_or_merge_table_session(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      '45000000-0000-4000-8000-000000000001',
      'c5000000-0000-4000-8000-000000000032',
      jsonb_build_object(
        'sourceSessionId', 'e5000000-0000-4000-8000-000000000001',
        'targetTableId', '65000000-0000-4000-8000-000000000003',
        'expectedSourceVersion', 4,
        'expectedTargetVersion', 1
      )
    ) ->> 'mode'
  ),
  'merged',
  'an exact occupied-table merge replay returns its stored result'
);
select is(
  (
    select count(*)
    from public.checks
    where table_session_id = 'e5000000-0000-4000-8000-000000000301'
  ),
  2::bigint,
  'an idempotent merge replay never duplicates named checks'
);

select * from finish();
rollback;
