begin;

create extension if not exists pgtap with schema extensions;

select plan(111);

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

select lives_ok(
  $$
    select public.apply_concurrent_order_batch(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      '45000000-0000-4000-8000-000000000001',
      'c5000000-0000-4000-8000-000000000020',
      'd5000000-0000-4000-8000-000000000150',
      jsonb_build_object(
        'tableId', '65000000-0000-4000-8000-000000000001',
        'session', jsonb_build_object(
          'id', 'e5000000-0000-4000-8000-000000000001',
          'openedAt', (
            select opened_at
            from public.table_sessions
            where id = 'e5000000-0000-4000-8000-000000000001'
          )
        ),
        'check', jsonb_build_object(
          'id', 'f5000000-0000-4000-8000-000000000150',
          'name', 'Bar',
          'openedAt', now()
        ),
        'batch', jsonb_build_object(
          'id', 'd5000000-0000-4000-8000-000000000150',
          'createdAt', now()
        ),
        'items', jsonb_build_array(
          jsonb_build_object(
            'id', 'd5000000-0000-4000-8000-000000000151',
            'menuItemId', '85000000-0000-4000-8000-000000000001',
            'menuItemVersion', 1,
            'quantity', 1,
            'modifierSelections', jsonb_build_array(
              jsonb_build_object(
                'id', 'd5000000-0000-4000-8000-000000000152',
                'optionId', 'a5000000-0000-4000-8000-000000000001'
              )
            )
          )
        )
      )
    )
  $$,
  'a second named check remains open while the first check is paid and receipted'
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
    select count(*)
    from public.receipts
    where check_id = 'f5000000-0000-4000-8000-000000000001'
      and status = 'issued'
  ),
  1::bigint,
  'paying a check automatically issues exactly one immutable receipt'
);
select matches(
  (
    select receipt_number
    from public.receipts
    where check_id = 'f5000000-0000-4000-8000-000000000001'
  ),
  '^WB1-[0-9]{8}-000001$',
  'the first receipt uses the branch prefix, business date, and monotonic sequence'
);
select is(
  (
    select total_minor
    from public.receipts
    where check_id = 'f5000000-0000-4000-8000-000000000001'
  ),
  500::bigint,
  'the receipt total is derived from billable item snapshots'
);
select is(
  (
    select business_date
    from public.receipts
    where check_id = 'f5000000-0000-4000-8000-000000000001'
  ),
  (
    timezone('Europe/Sofia', now())
    - (time '04:00' - time '00:00')
  )::date,
  'the receipt business date uses the branch timezone and cutoff'
);
select is(
  (
    select snapshot_json ->> 'organizationName'
    from public.receipts
    where check_id = 'f5000000-0000-4000-8000-000000000001'
  ),
  'Workspace Tenant',
  'the immutable snapshot retains the historical organization name'
);
select is(
  (
    select snapshot_json ->> 'tableLabel'
    from public.receipts
    where check_id = 'f5000000-0000-4000-8000-000000000001'
  ),
  'Masa 4',
  'the receipt freezes the table label before later transfers'
);
select is(
  (
    select snapshot_json #>> '{checks,0,name}'
    from public.receipts
    where check_id = 'f5000000-0000-4000-8000-000000000001'
  ),
  'Pencere tarafı',
  'the receipt freezes the named check'
);
select is(
  (
    select snapshot_json #>> '{checks,0,items,0,name}'
    from public.receipts
    where check_id = 'f5000000-0000-4000-8000-000000000001'
  ),
  'Patates kızartması',
  'the receipt freezes the purchased item name'
);
select is(
  (
    select snapshot_json #>> '{checks,0,items,0,modifiers,0,name}'
    from public.receipts
    where check_id = 'f5000000-0000-4000-8000-000000000001'
  ),
  'Peynirli',
  'the receipt freezes modifier names and prices'
);
select is(
  (
    select jsonb_array_length(snapshot_json -> 'payments')
    from public.receipts
    where check_id = 'f5000000-0000-4000-8000-000000000001'
  ),
  3,
  'the receipt records every cash and card payment component'
);
select ok(
  (
    select snapshot_json -> 'waiterDisplayNames' ? 'Workspace Waiter'
    from public.receipts
    where check_id = 'f5000000-0000-4000-8000-000000000001'
  ),
  'the receipt attributes the original waiter'
);
select ok(
  (
    select snapshot_json -> 'waiterDisplayNames' ? 'Second Waiter'
    from public.receipts
    where check_id = 'f5000000-0000-4000-8000-000000000001'
  ),
  'the receipt attributes every contributing waiter'
);
select matches(
  (
    select pdf_storage_path
    from public.receipts
    where check_id = 'f5000000-0000-4000-8000-000000000001'
  ),
  '^25000000-0000-4000-8000-000000000001/35000000-0000-4000-8000-000000000001/[0-9]{4}-[0-9]{2}-[0-9]{2}/[0-9a-f-]+[.]pdf$',
  'the PDF path is tenant scoped and deterministic'
);

reset role;
select is(
  (
    select public
    from storage.buckets
    where id = 'receipt-pdfs'
  ),
  false,
  'receipt PDFs are stored in a private bucket'
);
select set_config(
  'request.jwt.claims',
  '{"sub":"15000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (
    public.finalize_receipt_pdf(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      (
        select id
        from public.receipts
        where check_id = 'f5000000-0000-4000-8000-000000000001'
      ),
      repeat('a', 64)
    ) ->> 'status'
  ),
  'ready',
  'a one-time PDF SHA-256 finalization succeeds after private upload'
);
select is(
  (
    select pdf_hash
    from public.receipts
    where check_id = 'f5000000-0000-4000-8000-000000000001'
  ),
  repeat('a', 64),
  'the finalized PDF hash is retained for integrity checks'
);

reset role;
select throws_ok(
  $$
    update public.receipts
    set receipt_number = 'MUTATED'
    where check_id = 'f5000000-0000-4000-8000-000000000001'
  $$,
  '55000',
  'receipts_are_immutable_create_an_adjustment',
  'commercial receipt fields remain immutable after PDF finalization'
);
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
  'only unsettled named checks move to the merged session'
);
select is(
  (
    select string_agg(name, ',' order by name)
    from public.checks
    where table_session_id = 'e5000000-0000-4000-8000-000000000301'
  ),
  'Bahçe,Bar',
  'a merge preserves active check names without mixing their contents'
);
select is(
  (
    select table_session_id
    from public.order_items
    where id = 'd5000000-0000-4000-8000-000000000111'
  ),
  'e5000000-0000-4000-8000-000000000001'::uuid,
  'paid order history remains attached to its immutable source session'
);
select is(
  (
    select table_session_id
    from public.receipts
    where check_id = 'f5000000-0000-4000-8000-000000000001'
  ),
  'e5000000-0000-4000-8000-000000000001'::uuid,
  'the immutable receipt remains attached to its historical source session'
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
  0::bigint,
  'settled payment history remains attached to its source session'
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

select is(
  (
    public.confirm_check_payments(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      '45000000-0000-4000-8000-000000000001',
      'c5000000-0000-4000-8000-000000000041',
      jsonb_build_object(
        'checkId', 'f5000000-0000-4000-8000-000000000150',
        'expectedCheckVersion', 2,
        'currencyCode', 'EUR',
        'payments', jsonb_build_array(
          jsonb_build_object(
            'id', 'd5000000-0000-4000-8000-000000000401',
            'method', 'card',
            'amountMinor', 500,
            'allocations', jsonb_build_array(
              jsonb_build_object(
                'id', 'd5000000-0000-4000-8000-000000000411',
                'orderItemId', 'd5000000-0000-4000-8000-000000000151',
                'quantity', 1,
                'amountMinor', 500
              )
            )
          )
        )
      )
    ) ->> 'checkStatus'
  ),
  'paid',
  'a named check can be paid and receipted after its session was merged'
);
select matches(
  (
    select receipt_number
    from public.receipts
    where check_id = 'f5000000-0000-4000-8000-000000000150'
  ),
  '^WB1-[0-9]{8}-000002$',
  'the next receipt on the same business date receives the next branch sequence'
);
select is(
  (
    select snapshot_json ->> 'tableLabel'
    from public.receipts
    where check_id = 'f5000000-0000-4000-8000-000000000150'
  ),
  'Masa 6',
  'the second receipt freezes the table label at its own issue time'
);
select is(
  (
    select count(*)
    from public.receipts
    where branch_id = '35000000-0000-4000-8000-000000000001'
      and status = 'issued'
  ),
  2::bigint,
  'two paid named checks produce two distinct immutable receipts'
);

select is(
  (
    select count(*)
    from public.search_receipts(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001'
    )
  ),
  2::bigint,
  'the archive returns branch-scoped receipts in a cursor page'
);
select is(
  (
    select count(*)
    from public.search_receipts(
      requested_organization_id =>
        '25000000-0000-4000-8000-000000000001',
      requested_branch_id =>
        '35000000-0000-4000-8000-000000000001',
      requested_query => 'Masa 4'
    )
  ),
  1::bigint,
  'archive quick search finds a historical table snapshot'
);
select is(
  (
    select count(*)
    from public.search_receipts(
      requested_organization_id =>
        '25000000-0000-4000-8000-000000000001',
      requested_branch_id =>
        '35000000-0000-4000-8000-000000000001',
      requested_query => 'Pencere'
    )
  ),
  1::bigint,
  'archive quick search finds a named check'
);
select is(
  (
    select count(*)
    from public.search_receipts(
      requested_organization_id =>
        '25000000-0000-4000-8000-000000000001',
      requested_branch_id =>
        '35000000-0000-4000-8000-000000000001',
      requested_date_from => (
        select min(business_date)
        from public.receipts
        where branch_id = '35000000-0000-4000-8000-000000000001'
      ),
      requested_date_to => (
        select max(business_date)
        from public.receipts
        where branch_id = '35000000-0000-4000-8000-000000000001'
      )
    )
  ),
  2::bigint,
  'archive date filters use the immutable business date'
);
select is(
  (
    select count(*)
    from public.search_receipts(
      requested_organization_id =>
        '25000000-0000-4000-8000-000000000001',
      requested_branch_id =>
        '35000000-0000-4000-8000-000000000001',
      requested_waiter_query => 'Second Waiter'
    )
  ),
  1::bigint,
  'archive waiter search uses historical attribution names'
);
select is(
  (
    select count(*)
    from public.search_receipts(
      requested_organization_id =>
        '25000000-0000-4000-8000-000000000001',
      requested_branch_id =>
        '35000000-0000-4000-8000-000000000001',
      requested_payment_method => 'cash'
    )
  ),
  1::bigint,
  'archive payment filters inspect the immutable payment snapshot'
);
select is(
  (
    select count(*)
    from public.search_receipts(
      requested_organization_id =>
        '25000000-0000-4000-8000-000000000001',
      requested_branch_id =>
        '35000000-0000-4000-8000-000000000001',
      requested_amount_min_minor => 500,
      requested_amount_max_minor => 500
    )
  ),
  2::bigint,
  'archive amount filters use integer minor units'
);
select is(
  (
    select count(*)
    from public.search_receipts(
      requested_organization_id =>
        '25000000-0000-4000-8000-000000000001',
      requested_branch_id =>
        '35000000-0000-4000-8000-000000000001',
      requested_time_from => (
        select timezone('Europe/Sofia', issued_at)::time
        from public.receipts
        where check_id = 'f5000000-0000-4000-8000-000000000001'
      ),
      requested_time_to => (
        select timezone('Europe/Sofia', issued_at)::time
        from public.receipts
        where check_id = 'f5000000-0000-4000-8000-000000000001'
      )
    )
  ),
  2::bigint,
  'archive time filters evaluate the shared transaction issue time in the branch timezone'
);
select is(
  (
    select count(*)
    from public.search_receipts(
      requested_organization_id =>
        '25000000-0000-4000-8000-000000000001',
      requested_branch_id =>
        '35000000-0000-4000-8000-000000000001',
      requested_page_size => 1
    )
  ),
  2::bigint,
  'a cursor page includes one lookahead row without scanning all history'
);
select is(
  (
    select receipt_number
    from public.search_receipts(
      requested_organization_id =>
        '25000000-0000-4000-8000-000000000001',
      requested_branch_id =>
        '35000000-0000-4000-8000-000000000001',
      requested_after_issued_at => (
        select issued_at
        from public.receipts
        where branch_id = '35000000-0000-4000-8000-000000000001'
        order by issued_at desc, id desc
        limit 1
      ),
      requested_after_id => (
        select id
        from public.receipts
        where branch_id = '35000000-0000-4000-8000-000000000001'
        order by issued_at desc, id desc
        limit 1
      ),
      requested_page_size => 1
    )
  ),
  (
    select receipt_number
    from public.receipts
    where branch_id = '35000000-0000-4000-8000-000000000001'
    order by issued_at desc, id desc
    offset 1
    limit 1
  ),
  'the archive cursor continues after the exact issued-at and id key'
);
select throws_ok(
  $$
    select *
    from public.search_receipts(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000002'
    )
  $$,
  '42501',
  'branch_access_denied',
  'a user cannot search another branch receipt archive'
);

reset role;
update public.memberships
set role = 'manager'
where organization_id = '25000000-0000-4000-8000-000000000001'
  and branch_id = '35000000-0000-4000-8000-000000000001'
  and user_id = '15000000-0000-4000-8000-000000000001';
select set_config(
  'request.jwt.claims',
  '{"sub":"15000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (
    public.get_manager_report(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      (select min(business_date) from public.receipts),
      (select max(business_date) from public.receipts)
    ) -> 'summary' ->> 'confirmedRevenueMinor'
  )::bigint,
  1000::bigint,
  'manager revenue is derived only from confirmed allocations for issued receipts'
);
select is(
  (
    public.get_manager_report(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      (select min(business_date) from public.receipts),
      (select max(business_date) from public.receipts)
    ) -> 'summary' ->> 'receiptCount'
  )::bigint,
  2::bigint,
  'manager reporting counts immutable issued receipts'
);
select is(
  (
    public.get_manager_report(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      (select min(business_date) from public.receipts),
      (select max(business_date) from public.receipts)
    ) -> 'summary' ->> 'cancelledItemCount'
  )::bigint,
  1::bigint,
  'manager reporting retains cancellation events outside confirmed revenue'
);
select is(
  (
    public.get_manager_report(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      (select min(business_date) from public.receipts),
      (select max(business_date) from public.receipts)
    ) -> 'summary' ->> 'cancelledValueMinor'
  )::bigint,
  1000::bigint,
  'cancelled value includes immutable quantity and modifier prices'
);
select is(
  jsonb_array_length(
    public.get_manager_report(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      (select min(business_date) from public.receipts),
      (select max(business_date) from public.receipts)
    ) -> 'waiters'
  ),
  2,
  'every contributing waiter receives an auditable report row'
);
select is(
  (
    select (waiter ->> 'contributedRevenueMinor')::bigint
    from jsonb_array_elements(
      public.get_manager_report(
        '25000000-0000-4000-8000-000000000001',
        '35000000-0000-4000-8000-000000000001',
        (select min(business_date) from public.receipts),
        (select max(business_date) from public.receipts)
      ) -> 'waiters'
    ) as waiter
    where waiter ->> 'displayName' = 'Second Waiter'
  ),
  500::bigint,
  'item contribution follows the waiter who entered the order'
);
select is(
  (
    public.get_manager_report(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      (select min(business_date) from public.receipts),
      (select max(business_date) from public.receipts),
      '15000000-0000-4000-8000-000000000001'
    ) -> 'summary' ->> 'selectedWaiterContributionMinor'
  )::bigint,
  500::bigint,
  'a waiter filter excludes their cancelled items from contribution'
);
select is(
  (
    select sum((day ->> 'confirmedRevenueMinor')::bigint)
    from jsonb_array_elements(
      public.get_manager_report(
        '25000000-0000-4000-8000-000000000001',
        '35000000-0000-4000-8000-000000000001',
        (select min(business_date) from public.receipts),
        (select max(business_date) from public.receipts)
      ) -> 'daily'
    ) as day
  ),
  1000::numeric,
  'daily confirmed totals reconcile to the report total'
);
select is(
  (
    public.get_manager_report(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      (select min(business_date) from public.receipts),
      (select max(business_date) from public.receipts)
    ) -> 'cancellations' -> 0 ->> 'reasonName'
  ),
  'Müşteri vazgeçti',
  'the manager can audit the exact cancellation reason and context'
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
    select public.get_manager_report(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      current_date,
      current_date
    )
  $$,
  '42501',
  'manager_role_required',
  'waiters cannot access manager reporting'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"15000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.reserve_menu_ai_request(
    '25000000-0000-4000-8000-000000000001',
    '35000000-0000-4000-8000-000000000001',
    'c6000000-0000-4000-8000-000000000001',
    'Patates kızartması - 4 euro, peynirli +1 euro',
    'gpt-5.6-luna'
  ) ->> 'status',
  'processing',
  'a manager can reserve a rate-limited AI draft without publishing catalog data'
);
select is(
  (
    public.reserve_menu_ai_request(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      'c6000000-0000-4000-8000-000000000001',
      'Patates kızartması - 4 euro, peynirli +1 euro',
      'gpt-5.6-luna'
    ) ->> 'id'
  )::uuid,
  (
    select id
    from public.menu_ai_requests
    where client_request_id = 'c6000000-0000-4000-8000-000000000001'
  ),
  'an exact AI request replay returns the original draft reservation'
);
select is(
  (
    select count(*)
    from public.menu_ai_requests
    where client_request_id = 'c6000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'an AI retry cannot consume quota twice or duplicate a request'
);
select is(
  public.complete_menu_ai_request(
    '25000000-0000-4000-8000-000000000001',
    '35000000-0000-4000-8000-000000000001',
    (
      select id
      from public.menu_ai_requests
      where client_request_id = 'c6000000-0000-4000-8000-000000000001'
    ),
    jsonb_build_object(
      'schemaVersion', 1,
      'item', jsonb_build_object(
        'name', 'Patates kızartması',
        'description', 'Çıtır patates',
        'priceMinor', 400,
        'currencyCode', 'EUR',
        'categoryName', 'Atıştırmalık',
        'prepTimeMinutes', 8
      ),
      'translations', jsonb_build_array(
        jsonb_build_object(
          'locale', 'tr',
          'name', 'Patates kızartması',
          'description', 'Çıtır patates'
        ),
        jsonb_build_object(
          'locale', 'bg',
          'name', 'Пържени картофи',
          'description', null
        ),
        jsonb_build_object(
          'locale', 'en',
          'name', 'French fries',
          'description', null
        )
      ),
      'modifierGroups', jsonb_build_array(
        jsonb_build_object(
          'name', 'Peynir',
          'selectionType', 'single',
          'minimumChoices', 0,
          'maximumChoices', 1,
          'isRequired', false,
          'sortOrder', 0,
          'options', jsonb_build_array(
            jsonb_build_object(
              'name', 'Peynirsiz',
              'priceDeltaMinor', 0,
              'isDefault', true,
              'sortOrder', 0
            ),
            jsonb_build_object(
              'name', 'Peynirli',
              'priceDeltaMinor', 100,
              'isDefault', false,
              'sortOrder', 1
            )
          )
        )
      ),
      'allergenSuggestions', jsonb_build_array(
        jsonb_build_object(
          'code', 'MILK',
          'status', 'unknown',
          'reason', 'Peynir seçeneğini reçete veya tedarikçi belgesiyle doğrulayın.'
        )
      ),
      'warnings', jsonb_build_array('Alerjenleri yayınlamadan önce doğrulayın.')
    ),
    'gpt-5.6-luna',
    120,
    240,
    800
  ) ->> 'status',
  'ready',
  'only a strict server-validated AI suggestion becomes reviewable'
);
select ok(
  (
    select bool_and(allergen ->> 'status' = 'unknown')
    from public.menu_ai_requests as request,
      jsonb_array_elements(request.suggestion_json -> 'allergenSuggestions') as allergen
    where request.client_request_id = 'c6000000-0000-4000-8000-000000000001'
  ),
  'AI allergen suggestions remain explicitly unknown before manager review'
);
select is(
  public.publish_menu_ai_draft(
    '25000000-0000-4000-8000-000000000001',
    '35000000-0000-4000-8000-000000000001',
    (
      select id
      from public.menu_ai_requests
      where client_request_id = 'c6000000-0000-4000-8000-000000000001'
    ),
    2,
    jsonb_build_object(
      'categoryName', 'Atıştırmalık',
      'name', 'Trüflü patates kızartması',
      'description', 'Çıtır patates',
      'priceMinor', 400,
      'currencyCode', 'EUR',
      'taxRateBasisPoints', 0,
      'isActive', true,
      'isAvailable', true,
      'prepTimeMinutes', 8,
      'translations', jsonb_build_array(
        jsonb_build_object(
          'locale', 'tr',
          'name', 'Trüflü patates kızartması',
          'description', 'Çıtır patates'
        ),
        jsonb_build_object(
          'locale', 'bg',
          'name', 'Пържени картофи',
          'description', null
        ),
        jsonb_build_object(
          'locale', 'en',
          'name', 'French fries',
          'description', null
        )
      ),
      'modifierGroups', jsonb_build_array(
        jsonb_build_object(
          'name', 'Peynir',
          'selectionType', 'single',
          'minimumChoices', 0,
          'maximumChoices', 1,
          'isRequired', false,
          'sortOrder', 0,
          'options', jsonb_build_array(
            jsonb_build_object(
              'name', 'Peynirsiz',
              'priceDeltaMinor', 0,
              'isDefault', true,
              'sortOrder', 0
            ),
            jsonb_build_object(
              'name', 'Peynirli',
              'priceDeltaMinor', 100,
              'isDefault', false,
              'sortOrder', 1
            )
          )
        )
      ),
      'confirmedAllergens', '[]'::jsonb
    )
  ) ->> 'status',
  'published',
  'only an explicit manager-reviewed payload publishes the AI draft'
);
select is(
  (
    select concat_ws('|', item.name, item.price_minor, category.name)
    from public.menu_items as item
    join public.menu_categories as category on category.id = item.category_id
    where item.organization_id = '25000000-0000-4000-8000-000000000001'
      and item.branch_id = '35000000-0000-4000-8000-000000000001'
      and item.name = 'Trüflü patates kızartması'
  ),
  'Trüflü patates kızartması|400|Atıştırmalık',
  'publishing creates the reviewed item and category in the active branch'
);
select is(
  (
    select count(*)
    from public.modifier_groups as modifier
    join public.menu_items as item on item.id = modifier.menu_item_id
    where item.name = 'Trüflü patates kızartması'
      and item.branch_id = '35000000-0000-4000-8000-000000000001'
      and modifier.deleted_at is null
  ),
  1::bigint,
  'the reviewed modifier group is published transactionally'
);
select is(
  (
    select count(*)
    from public.modifier_options as option
    join public.modifier_groups as modifier on modifier.id = option.modifier_group_id
    join public.menu_items as item on item.id = modifier.menu_item_id
    where item.name = 'Trüflü patates kızartması'
      and item.branch_id = '35000000-0000-4000-8000-000000000001'
      and option.deleted_at is null
  ),
  2::bigint,
  'all reviewed modifier options are published transactionally'
);
select is(
  (
    select count(*)
    from public.menu_item_translations as translation
    join public.menu_items as item on item.id = translation.menu_item_id
    where item.name = 'Trüflü patates kızartması'
      and item.branch_id = '35000000-0000-4000-8000-000000000001'
  ),
  3::bigint,
  'the reviewed Turkish, Bulgarian, and English translations are stored'
);
select is(
  (
    select count(*)
    from public.menu_item_allergens as item_allergen
    join public.menu_items as item on item.id = item_allergen.menu_item_id
    where item.name = 'Trüflü patates kızartması'
      and item.branch_id = '35000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'an unconfirmed AI allergen suggestion is never published'
);
select is(
  (
    select status
    from public.menu_ai_requests
    where client_request_id = 'c6000000-0000-4000-8000-000000000001'
  ),
  'published',
  'the AI audit row records the manager publication decision'
);
select throws_ok(
  $$
    select public.save_catalog_item(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      null,
      null,
      jsonb_build_object(
        'categoryName', 'Atıştırmalık',
        'name', '  TRÜFLÜ   PATATES KIZARTMASI ',
        'description', null,
        'priceMinor', 400,
        'currencyCode', 'EUR',
        'translations', '[]'::jsonb,
        'modifierGroups', '[]'::jsonb,
        'confirmedAllergens', '[]'::jsonb
      )
    )
  $$,
  '23505',
  'catalog_item_duplicate',
  'normalized duplicate detection prevents accidental repeated menu items'
);
select is(
  (
    public.save_catalog_item(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      (
        select id
        from public.menu_items
        where name = 'Trüflü patates kızartması'
          and branch_id = '35000000-0000-4000-8000-000000000001'
      ),
      1,
      jsonb_build_object(
        'categoryName', 'Atıştırmalık',
        'name', 'Trüflü patates kızartması',
        'description', 'Çıtır patates',
        'priceMinor', 400,
        'currencyCode', 'EUR',
        'isActive', true,
        'isAvailable', true,
        'prepTimeMinutes', 8,
        'translations', '[]'::jsonb,
        'modifierGroups', '[]'::jsonb,
        'confirmedAllergens', jsonb_build_array(
          jsonb_build_object('code', 'MILK', 'presence', 'may_contain')
        )
      )
    ) ->> 'version'
  )::bigint,
  2::bigint,
  'manual manager review can update the versioned catalog item'
);
select is(
  (
    select concat_ws(
      '|',
      allergen.code,
      item_allergen.presence,
      item_allergen.source,
      item_allergen.confirmed_by
    )
    from public.menu_item_allergens as item_allergen
    join public.menu_items as item on item.id = item_allergen.menu_item_id
    join public.allergens as allergen on allergen.id = item_allergen.allergen_id
    where item.name = 'Trüflü patates kızartması'
      and item.branch_id = '35000000-0000-4000-8000-000000000001'
  ),
  'MILK|may_contain|manager|15000000-0000-4000-8000-000000000001',
  'only a manager-confirmed allergen receives a definitive presence and source'
);
select is(
  public.bulk_set_menu_item_availability(
    '25000000-0000-4000-8000-000000000001',
    '35000000-0000-4000-8000-000000000001',
    array[
      (
        select id
        from public.menu_items
        where name = 'Trüflü patates kızartması'
          and branch_id = '35000000-0000-4000-8000-000000000001'
      )
    ],
    false
  ),
  1,
  'a manager can bulk-update branch menu availability'
);
select is(
  (
    select is_available
    from public.menu_items
    where name = 'Trüflü patates kızartması'
      and branch_id = '35000000-0000-4000-8000-000000000001'
  ),
  false,
  'sold-out availability is immediately stored in the shared catalog'
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
    select public.reserve_menu_ai_request(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      'c6000000-0000-4000-8000-000000000002',
      'Yetkisiz ürün taslağı',
      'gpt-5.6-luna'
    )
  $$,
  '42501',
  'manager_role_required',
  'waiters cannot generate or publish AI menu drafts'
);

select * from finish();
rollback;
