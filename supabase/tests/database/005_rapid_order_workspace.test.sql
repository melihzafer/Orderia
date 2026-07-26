begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

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
values (
  '25000000-0000-4000-8000-000000000001',
  '35000000-0000-4000-8000-000000000001',
  '15000000-0000-4000-8000-000000000001',
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
  '45000000-0000-4000-8000-000000000001',
  '25000000-0000-4000-8000-000000000001',
  '35000000-0000-4000-8000-000000000001',
  '15000000-0000-4000-8000-000000000001',
  'android',
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
values (
  '65000000-0000-4000-8000-000000000001',
  '25000000-0000-4000-8000-000000000001',
  '35000000-0000-4000-8000-000000000001',
  '55000000-0000-4000-8000-000000000001',
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
    public.apply_client_mutation(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      '45000000-0000-4000-8000-000000000001',
      'c5000000-0000-4000-8000-000000000001',
      'orders.send_batch',
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
      ),
      null
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
    public.apply_client_mutation(
      '25000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      '45000000-0000-4000-8000-000000000001',
      'c5000000-0000-4000-8000-000000000001',
      'orders.send_batch',
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
      ),
      null
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

select * from finish();
rollback;
