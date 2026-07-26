-- Orderia business schema.
--
-- Tenant scope is deliberately repeated on child rows. Besides making the
-- common branch filters indexable, the composite foreign keys prevent a child
-- record from ever pointing at an entity in a different tenant or branch.

alter table public.devices
  add constraint devices_organization_branch_id_key
  unique (organization_id, branch_id, id);

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  branch_id uuid,
  name text not null check (char_length(trim(name)) between 1 and 120),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  version bigint not null default 1 check (version > 0),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint menu_categories_branch_organization_fkey
    foreign key (organization_id, branch_id)
    references public.branches (organization_id, id),
  unique (organization_id, id)
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  branch_id uuid,
  category_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 160),
  description text,
  price_minor bigint not null check (price_minor >= 0),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  tax_rate_basis_points integer not null default 0
    check (tax_rate_basis_points between 0 and 10000),
  is_active boolean not null default true,
  is_available boolean not null default true,
  prep_time_minutes integer check (prep_time_minutes between 0 and 1440),
  version bigint not null default 1 check (version > 0),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint menu_items_branch_organization_fkey
    foreign key (organization_id, branch_id)
    references public.branches (organization_id, id),
  constraint menu_items_category_organization_fkey
    foreign key (organization_id, category_id)
    references public.menu_categories (organization_id, id),
  unique (organization_id, id)
);

create table public.modifier_groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  branch_id uuid,
  menu_item_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  selection_type text not null
    check (selection_type in ('single', 'multiple')),
  minimum_choices integer not null default 0 check (minimum_choices >= 0),
  maximum_choices integer check (maximum_choices > 0),
  is_required boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint modifier_groups_choice_range_check
    check (
      maximum_choices is null
      or maximum_choices >= minimum_choices
    ),
  constraint modifier_groups_branch_organization_fkey
    foreign key (organization_id, branch_id)
    references public.branches (organization_id, id),
  constraint modifier_groups_menu_item_organization_fkey
    foreign key (organization_id, menu_item_id)
    references public.menu_items (organization_id, id),
  unique (organization_id, id)
);

create table public.modifier_options (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  branch_id uuid,
  modifier_group_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  price_delta_minor bigint not null default 0,
  is_default boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint modifier_options_branch_organization_fkey
    foreign key (organization_id, branch_id)
    references public.branches (organization_id, id),
  constraint modifier_options_group_organization_fkey
    foreign key (organization_id, modifier_group_id)
    references public.modifier_groups (organization_id, id),
  unique (organization_id, id)
);

create table public.allergens (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_]{1,32}$'),
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now()
);

create table public.menu_item_allergens (
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  branch_id uuid,
  menu_item_id uuid not null,
  allergen_id uuid not null references public.allergens (id),
  presence text not null
    check (presence in ('contains', 'may_contain', 'free_from', 'unknown')),
  source text not null
    check (source in ('manager', 'recipe', 'supplier')),
  confirmed_by uuid references auth.users (id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_item_allergens_confirmation_check
    check (
      (confirmed_by is null and confirmed_at is null)
      or (confirmed_by is not null and confirmed_at is not null)
    ),
  constraint menu_item_allergens_branch_organization_fkey
    foreign key (organization_id, branch_id)
    references public.branches (organization_id, id),
  constraint menu_item_allergens_item_organization_fkey
    foreign key (organization_id, menu_item_id)
    references public.menu_items (organization_id, id),
  primary key (menu_item_id, allergen_id)
);

create table public.halls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  branch_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  sort_order integer not null default 0 check (sort_order >= 0),
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint halls_branch_organization_fkey
    foreign key (organization_id, branch_id)
    references public.branches (organization_id, id)
    on delete cascade,
  unique (organization_id, branch_id, id)
);

create table public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  branch_id uuid not null,
  hall_id uuid not null,
  label text not null check (char_length(trim(label)) between 1 and 40),
  sequence_number integer not null check (sequence_number > 0),
  capacity integer check (capacity > 0),
  sort_order integer not null default 0 check (sort_order >= 0),
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint restaurant_tables_hall_scope_fkey
    foreign key (organization_id, branch_id, hall_id)
    references public.halls (organization_id, branch_id, id),
  unique (organization_id, branch_id, id)
);

create table public.table_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  branch_id uuid not null,
  table_id uuid not null,
  status text not null default 'open'
    check (status in ('open', 'payment_pending', 'closed', 'voided')),
  opened_by uuid not null references auth.users (id),
  opened_at timestamptz not null default now(),
  closed_by uuid references auth.users (id),
  closed_at timestamptz,
  guest_count integer check (guest_count > 0),
  note text,
  transferred_from_table_id uuid,
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint table_sessions_closed_state_check
    check (
      (status in ('open', 'payment_pending') and closed_at is null)
      or (status in ('closed', 'voided') and closed_at is not null)
    ),
  constraint table_sessions_table_scope_fkey
    foreign key (organization_id, branch_id, table_id)
    references public.restaurant_tables (organization_id, branch_id, id),
  constraint table_sessions_transferred_table_scope_fkey
    foreign key (organization_id, branch_id, transferred_from_table_id)
    references public.restaurant_tables (organization_id, branch_id, id),
  unique (organization_id, branch_id, id)
);

create table public.session_participants (
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  branch_id uuid not null,
  table_session_id uuid not null,
  user_id uuid not null references auth.users (id),
  first_action_at timestamptz not null default now(),
  last_action_at timestamptz not null default now(),
  constraint session_participants_action_order_check
    check (last_action_at >= first_action_at),
  constraint session_participants_session_scope_fkey
    foreign key (organization_id, branch_id, table_session_id)
    references public.table_sessions (organization_id, branch_id, id)
    on delete cascade,
  primary key (table_session_id, user_id)
);

create table public.checks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  branch_id uuid not null,
  table_session_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 80),
  note text,
  status text not null default 'open'
    check (status in ('open', 'partially_paid', 'paid', 'voided')),
  opened_by uuid not null references auth.users (id),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint checks_closed_state_check
    check (
      (status in ('open', 'partially_paid') and closed_at is null)
      or (status in ('paid', 'voided') and closed_at is not null)
    ),
  constraint checks_session_scope_fkey
    foreign key (organization_id, branch_id, table_session_id)
    references public.table_sessions (organization_id, branch_id, id),
  unique (organization_id, branch_id, id),
  unique (organization_id, branch_id, table_session_id, id)
);

create table public.cancellation_reasons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  branch_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  requires_manager boolean not null default false,
  is_active boolean not null default true,
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint cancellation_reasons_branch_organization_fkey
    foreign key (organization_id, branch_id)
    references public.branches (organization_id, id)
    on delete cascade,
  unique (organization_id, branch_id, id)
);

create table public.order_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  branch_id uuid not null,
  table_session_id uuid not null,
  check_id uuid not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  client_mutation_id uuid not null,
  constraint order_batches_check_scope_fkey
    foreign key (
      organization_id,
      branch_id,
      table_session_id,
      check_id
    )
    references public.checks (
      organization_id,
      branch_id,
      table_session_id,
      id
    ),
  unique (organization_id, branch_id, id),
  unique (
    organization_id,
    branch_id,
    table_session_id,
    check_id,
    id
  )
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  branch_id uuid not null,
  table_session_id uuid not null,
  check_id uuid not null,
  order_batch_id uuid not null,
  menu_item_id uuid,
  name_snapshot text not null
    check (char_length(trim(name_snapshot)) between 1 and 160),
  category_id_snapshot uuid,
  category_name_snapshot text,
  unit_price_minor bigint not null check (unit_price_minor >= 0),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  tax_rate_basis_points integer not null default 0
    check (tax_rate_basis_points between 0 and 10000),
  quantity numeric(12, 3) not null check (quantity > 0),
  status text not null default 'ordered'
    check (status in ('draft', 'ordered', 'served', 'cancelled')),
  note text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_by uuid not null references auth.users (id),
  updated_at timestamptz not null default now(),
  cancelled_by uuid references auth.users (id),
  cancelled_at timestamptz,
  cancellation_reason_id uuid,
  original_table_id uuid not null,
  original_table_session_id uuid not null,
  version bigint not null default 1 check (version > 0),
  deleted_at timestamptz,
  constraint order_items_cancellation_state_check
    check (
      (
        status = 'cancelled'
        and cancelled_by is not null
        and cancelled_at is not null
        and cancellation_reason_id is not null
      )
      or (
        status <> 'cancelled'
        and cancelled_by is null
        and cancelled_at is null
        and cancellation_reason_id is null
      )
    ),
  constraint order_items_batch_scope_fkey
    foreign key (
      organization_id,
      branch_id,
      table_session_id,
      check_id,
      order_batch_id
    )
    references public.order_batches (
      organization_id,
      branch_id,
      table_session_id,
      check_id,
      id
    ),
  constraint order_items_menu_item_organization_fkey
    foreign key (organization_id, menu_item_id)
    references public.menu_items (organization_id, id),
  constraint order_items_cancellation_reason_scope_fkey
    foreign key (organization_id, branch_id, cancellation_reason_id)
    references public.cancellation_reasons (organization_id, branch_id, id),
  constraint order_items_original_table_scope_fkey
    foreign key (organization_id, branch_id, original_table_id)
    references public.restaurant_tables (organization_id, branch_id, id),
  constraint order_items_original_session_scope_fkey
    foreign key (organization_id, branch_id, original_table_session_id)
    references public.table_sessions (organization_id, branch_id, id),
  unique (organization_id, branch_id, id)
);

create table public.order_item_modifiers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  branch_id uuid not null,
  order_item_id uuid not null,
  modifier_group_name_snapshot text not null
    check (char_length(trim(modifier_group_name_snapshot)) between 1 and 120),
  modifier_option_name_snapshot text not null
    check (char_length(trim(modifier_option_name_snapshot)) between 1 and 120),
  price_delta_minor bigint not null default 0,
  quantity numeric(12, 3) not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  constraint order_item_modifiers_item_scope_fkey
    foreign key (organization_id, branch_id, order_item_id)
    references public.order_items (organization_id, branch_id, id)
    on delete cascade,
  unique (organization_id, branch_id, id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  branch_id uuid not null,
  table_session_id uuid not null,
  method text not null check (method in ('cash', 'card', 'mixed_adjustment')),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'failed', 'voided')),
  amount_minor bigint not null check (amount_minor > 0),
  tendered_minor bigint check (tendered_minor >= amount_minor),
  change_minor bigint check (change_minor >= 0),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  idempotency_key text not null
    check (char_length(trim(idempotency_key)) between 1 and 160),
  device_id uuid not null,
  constraint payments_confirmation_state_check
    check (
      (status = 'confirmed' and confirmed_at is not null)
      or (status <> 'confirmed' and confirmed_at is null)
    ),
  constraint payments_cash_tender_check
    check (
      method <> 'cash'
      or tendered_minor is null
      or change_minor = tendered_minor - amount_minor
    ),
  constraint payments_session_scope_fkey
    foreign key (organization_id, branch_id, table_session_id)
    references public.table_sessions (organization_id, branch_id, id),
  constraint payments_device_scope_fkey
    foreign key (organization_id, branch_id, device_id)
    references public.devices (organization_id, branch_id, id),
  unique (organization_id, branch_id, id),
  unique (device_id, idempotency_key)
);

create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  branch_id uuid not null,
  payment_id uuid not null,
  check_id uuid not null,
  order_item_id uuid,
  quantity numeric(12, 3) check (quantity > 0),
  amount_minor bigint not null check (amount_minor > 0),
  created_at timestamptz not null default now(),
  constraint payment_allocations_payment_scope_fkey
    foreign key (organization_id, branch_id, payment_id)
    references public.payments (organization_id, branch_id, id)
    on delete cascade,
  constraint payment_allocations_check_scope_fkey
    foreign key (organization_id, branch_id, check_id)
    references public.checks (organization_id, branch_id, id),
  constraint payment_allocations_item_scope_fkey
    foreign key (organization_id, branch_id, order_item_id)
    references public.order_items (organization_id, branch_id, id),
  unique (organization_id, branch_id, id)
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  branch_id uuid not null,
  table_session_id uuid not null,
  check_id uuid not null,
  receipt_number text not null
    check (char_length(trim(receipt_number)) between 1 and 80),
  business_date date not null,
  issued_at timestamptz not null default now(),
  issued_by uuid not null references auth.users (id),
  total_minor bigint not null check (total_minor >= 0),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  snapshot_json jsonb not null
    check (jsonb_typeof(snapshot_json) = 'object'),
  pdf_storage_path text,
  pdf_hash text,
  status text not null default 'issued'
    check (status in ('issued', 'adjusted', 'voided')),
  adjusts_receipt_id uuid,
  constraint receipts_adjustment_state_check
    check (
      (status = 'adjusted' and adjusts_receipt_id is not null)
      or (status <> 'adjusted' and adjusts_receipt_id is null)
    ),
  constraint receipts_session_scope_fkey
    foreign key (organization_id, branch_id, table_session_id)
    references public.table_sessions (organization_id, branch_id, id),
  constraint receipts_check_scope_fkey
    foreign key (
      organization_id,
      branch_id,
      table_session_id,
      check_id
    )
    references public.checks (
      organization_id,
      branch_id,
      table_session_id,
      id
    ),
  unique (organization_id, branch_id, id),
  unique (branch_id, receipt_number)
);

alter table public.receipts
  add constraint receipts_adjusts_receipt_scope_fkey
  foreign key (organization_id, branch_id, adjusts_receipt_id)
  references public.receipts (organization_id, branch_id, id);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  branch_id uuid not null,
  actor_user_id uuid not null references auth.users (id),
  device_id uuid not null,
  entity_type text not null
    check (char_length(trim(entity_type)) between 1 and 80),
  entity_id uuid not null,
  action text not null check (char_length(trim(action)) between 1 and 80),
  before_json jsonb,
  after_json jsonb,
  reason text,
  created_at timestamptz not null default now(),
  client_mutation_id uuid not null,
  correlation_id uuid not null,
  constraint audit_events_device_scope_fkey
    foreign key (organization_id, branch_id, device_id)
    references public.devices (organization_id, branch_id, id),
  unique (organization_id, branch_id, id)
);

create table public.client_mutations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  branch_id uuid not null,
  device_id uuid not null,
  client_mutation_id uuid not null,
  mutation_type text not null
    check (char_length(trim(mutation_type)) between 1 and 120),
  entity_id uuid,
  result_json jsonb not null default '{}'::jsonb,
  committed_at timestamptz not null default now(),
  constraint client_mutations_device_scope_fkey
    foreign key (organization_id, branch_id, device_id)
    references public.devices (organization_id, branch_id, id),
  unique (device_id, client_mutation_id),
  unique (organization_id, branch_id, id)
);

create unique index restaurant_tables_active_sequence_unique
  on public.restaurant_tables (branch_id, sequence_number)
  where deleted_at is null;

create unique index restaurant_tables_active_label_unique
  on public.restaurant_tables (branch_id, lower(label))
  where deleted_at is null;

create unique index table_sessions_one_active_per_table_unique
  on public.table_sessions (table_id)
  where status in ('open', 'payment_pending') and deleted_at is null;

create index menu_categories_scope_idx
  on public.menu_categories (organization_id, branch_id, sort_order, id)
  where deleted_at is null;
create index menu_categories_created_by_idx
  on public.menu_categories (created_by);
create index menu_items_scope_idx
  on public.menu_items (organization_id, branch_id, category_id, name, id)
  where deleted_at is null and is_active;
create index menu_items_category_id_idx
  on public.menu_items (category_id);
create index menu_items_created_by_idx
  on public.menu_items (created_by);
create index modifier_groups_scope_idx
  on public.modifier_groups (organization_id, branch_id, menu_item_id, sort_order)
  where deleted_at is null;
create index modifier_groups_menu_item_id_idx
  on public.modifier_groups (menu_item_id);
create index modifier_options_scope_idx
  on public.modifier_options (
    organization_id,
    branch_id,
    modifier_group_id,
    sort_order
  )
  where deleted_at is null and is_active;
create index modifier_options_group_id_idx
  on public.modifier_options (modifier_group_id);
create index menu_item_allergens_scope_idx
  on public.menu_item_allergens (organization_id, branch_id, menu_item_id);
create index menu_item_allergens_allergen_id_idx
  on public.menu_item_allergens (allergen_id);
create index menu_item_allergens_confirmed_by_idx
  on public.menu_item_allergens (confirmed_by);

create index halls_scope_idx
  on public.halls (organization_id, branch_id, sort_order, id)
  where deleted_at is null;
create index restaurant_tables_hall_id_idx
  on public.restaurant_tables (hall_id);
create index restaurant_tables_scope_idx
  on public.restaurant_tables (organization_id, branch_id, hall_id, sort_order, id)
  where deleted_at is null;
create index table_sessions_table_id_idx
  on public.table_sessions (table_id);
create index table_sessions_scope_status_idx
  on public.table_sessions (
    organization_id,
    branch_id,
    status,
    opened_at desc
  );
create index table_sessions_opened_by_idx
  on public.table_sessions (opened_by);
create index table_sessions_closed_by_idx
  on public.table_sessions (closed_by);
create index table_sessions_transferred_table_id_idx
  on public.table_sessions (transferred_from_table_id);
create index session_participants_scope_idx
  on public.session_participants (
    organization_id,
    branch_id,
    table_session_id,
    last_action_at desc
  );
create index session_participants_user_id_idx
  on public.session_participants (user_id);
create index checks_session_id_idx
  on public.checks (table_session_id);
create index checks_scope_status_idx
  on public.checks (organization_id, branch_id, status, opened_at desc);
create index checks_opened_by_idx
  on public.checks (opened_by);
create index cancellation_reasons_scope_idx
  on public.cancellation_reasons (organization_id, branch_id, is_active, name)
  where deleted_at is null;

create index order_batches_scope_idx
  on public.order_batches (
    organization_id,
    branch_id,
    table_session_id,
    created_at desc
  );
create index order_batches_check_id_idx
  on public.order_batches (check_id);
create index order_batches_created_by_idx
  on public.order_batches (created_by);
create index order_items_session_id_idx
  on public.order_items (table_session_id);
create index order_items_check_id_idx
  on public.order_items (check_id);
create index order_items_batch_id_idx
  on public.order_items (order_batch_id);
create index order_items_menu_item_id_idx
  on public.order_items (menu_item_id);
create index order_items_cancellation_reason_id_idx
  on public.order_items (cancellation_reason_id);
create index order_items_original_table_id_idx
  on public.order_items (original_table_id);
create index order_items_original_session_id_idx
  on public.order_items (original_table_session_id);
create index order_items_scope_status_idx
  on public.order_items (
    organization_id,
    branch_id,
    status,
    created_at desc
  )
  where deleted_at is null;
create index order_items_created_by_idx
  on public.order_items (created_by);
create index order_items_updated_by_idx
  on public.order_items (updated_by);
create index order_items_cancelled_by_idx
  on public.order_items (cancelled_by);
create index order_item_modifiers_item_id_idx
  on public.order_item_modifiers (order_item_id);
create index order_item_modifiers_scope_idx
  on public.order_item_modifiers (organization_id, branch_id, order_item_id);

create index payments_session_id_idx
  on public.payments (table_session_id);
create index payments_scope_status_idx
  on public.payments (
    organization_id,
    branch_id,
    status,
    created_at desc
  );
create index payments_created_by_idx
  on public.payments (created_by);
create index payments_device_id_idx
  on public.payments (device_id);
create index payment_allocations_payment_id_idx
  on public.payment_allocations (payment_id);
create index payment_allocations_check_id_idx
  on public.payment_allocations (check_id);
create index payment_allocations_order_item_id_idx
  on public.payment_allocations (order_item_id);
create index payment_allocations_scope_idx
  on public.payment_allocations (organization_id, branch_id, payment_id);
create index receipts_check_id_idx
  on public.receipts (check_id);
create index receipts_issued_by_idx
  on public.receipts (issued_by);
create index receipts_adjusts_receipt_id_idx
  on public.receipts (adjusts_receipt_id);
create index receipts_scope_business_date_idx
  on public.receipts (
    organization_id,
    branch_id,
    business_date desc,
    issued_at desc
  );
create index receipts_session_idx
  on public.receipts (organization_id, branch_id, table_session_id);
create index audit_events_actor_user_id_idx
  on public.audit_events (actor_user_id);
create index audit_events_device_id_idx
  on public.audit_events (device_id);
create index audit_events_scope_entity_idx
  on public.audit_events (
    organization_id,
    branch_id,
    entity_type,
    entity_id,
    created_at desc
  );
create index audit_events_client_mutation_id_idx
  on public.audit_events (client_mutation_id);
create index audit_events_correlation_id_idx
  on public.audit_events (correlation_id);
create index client_mutations_scope_committed_idx
  on public.client_mutations (
    organization_id,
    branch_id,
    committed_at,
    id
  );
create index client_mutations_entity_id_idx
  on public.client_mutations (entity_id);

create or replace function private.validate_catalog_parent_scope()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_branch_id uuid;
begin
  case tg_table_name
    when 'menu_items' then
      select category.branch_id
      into parent_branch_id
      from public.menu_categories as category
      where category.organization_id = new.organization_id
        and category.id = new.category_id;

      -- An organization-wide category may contain branch-specific items.
      if parent_branch_id is not null
        and parent_branch_id is distinct from new.branch_id then
        raise exception using
          errcode = '23514',
          message = 'catalog_parent_scope_mismatch';
      end if;
    when 'modifier_groups' then
      select item.branch_id
      into parent_branch_id
      from public.menu_items as item
      where item.organization_id = new.organization_id
        and item.id = new.menu_item_id;

      if parent_branch_id is distinct from new.branch_id then
        raise exception using
          errcode = '23514',
          message = 'catalog_parent_scope_mismatch';
      end if;
    when 'modifier_options' then
      select modifier_group.branch_id
      into parent_branch_id
      from public.modifier_groups as modifier_group
      where modifier_group.organization_id = new.organization_id
        and modifier_group.id = new.modifier_group_id;

      if parent_branch_id is distinct from new.branch_id then
        raise exception using
          errcode = '23514',
          message = 'catalog_parent_scope_mismatch';
      end if;
    when 'menu_item_allergens' then
      select item.branch_id
      into parent_branch_id
      from public.menu_items as item
      where item.organization_id = new.organization_id
        and item.id = new.menu_item_id;

      if parent_branch_id is distinct from new.branch_id then
        raise exception using
          errcode = '23514',
          message = 'catalog_parent_scope_mismatch';
      end if;
    else
      raise exception using
        errcode = '22023',
        message = 'unsupported_catalog_scope_trigger';
  end case;

  return new;
end;
$$;

create trigger menu_items_validate_parent_scope
  before insert or update of organization_id, branch_id, category_id
  on public.menu_items
  for each row execute function private.validate_catalog_parent_scope();

create trigger modifier_groups_validate_parent_scope
  before insert or update of organization_id, branch_id, menu_item_id
  on public.modifier_groups
  for each row execute function private.validate_catalog_parent_scope();

create trigger modifier_options_validate_parent_scope
  before insert or update of organization_id, branch_id, modifier_group_id
  on public.modifier_options
  for each row execute function private.validate_catalog_parent_scope();

create trigger menu_item_allergens_validate_parent_scope
  before insert or update of organization_id, branch_id, menu_item_id
  on public.menu_item_allergens
  for each row execute function private.validate_catalog_parent_scope();

create or replace function private.prevent_receipt_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = 'receipts_are_immutable_create_an_adjustment';
end;
$$;

create trigger receipts_immutable
  before update or delete on public.receipts
  for each row execute function private.prevent_receipt_mutation();

alter table public.menu_categories enable row level security;
alter table public.menu_categories force row level security;
alter table public.menu_items enable row level security;
alter table public.menu_items force row level security;
alter table public.modifier_groups enable row level security;
alter table public.modifier_groups force row level security;
alter table public.modifier_options enable row level security;
alter table public.modifier_options force row level security;
alter table public.allergens enable row level security;
alter table public.allergens force row level security;
alter table public.menu_item_allergens enable row level security;
alter table public.menu_item_allergens force row level security;
alter table public.halls enable row level security;
alter table public.halls force row level security;
alter table public.restaurant_tables enable row level security;
alter table public.restaurant_tables force row level security;
alter table public.table_sessions enable row level security;
alter table public.table_sessions force row level security;
alter table public.session_participants enable row level security;
alter table public.session_participants force row level security;
alter table public.checks enable row level security;
alter table public.checks force row level security;
alter table public.cancellation_reasons enable row level security;
alter table public.cancellation_reasons force row level security;
alter table public.order_batches enable row level security;
alter table public.order_batches force row level security;
alter table public.order_items enable row level security;
alter table public.order_items force row level security;
alter table public.order_item_modifiers enable row level security;
alter table public.order_item_modifiers force row level security;
alter table public.payments enable row level security;
alter table public.payments force row level security;
alter table public.payment_allocations enable row level security;
alter table public.payment_allocations force row level security;
alter table public.receipts enable row level security;
alter table public.receipts force row level security;
alter table public.audit_events enable row level security;
alter table public.audit_events force row level security;
alter table public.client_mutations enable row level security;
alter table public.client_mutations force row level security;

-- Catalog and layout configuration is manager-owned. Waiters only read it.
create policy menu_categories_member_select on public.menu_categories
for select to authenticated
using ((select private.is_active_member(organization_id, branch_id)));
create policy menu_categories_manager_insert on public.menu_categories
for insert to authenticated
with check (
  (select private.is_manager(organization_id, branch_id))
  and created_by = (select auth.uid())
);
create policy menu_categories_manager_update on public.menu_categories
for update to authenticated
using ((select private.is_manager(organization_id, branch_id)))
with check ((select private.is_manager(organization_id, branch_id)));

create policy menu_items_member_select on public.menu_items
for select to authenticated
using ((select private.is_active_member(organization_id, branch_id)));
create policy menu_items_manager_insert on public.menu_items
for insert to authenticated
with check (
  (select private.is_manager(organization_id, branch_id))
  and created_by = (select auth.uid())
);
create policy menu_items_manager_update on public.menu_items
for update to authenticated
using ((select private.is_manager(organization_id, branch_id)))
with check ((select private.is_manager(organization_id, branch_id)));

create policy modifier_groups_member_select on public.modifier_groups
for select to authenticated
using ((select private.is_active_member(organization_id, branch_id)));
create policy modifier_groups_manager_insert on public.modifier_groups
for insert to authenticated
with check ((select private.is_manager(organization_id, branch_id)));
create policy modifier_groups_manager_update on public.modifier_groups
for update to authenticated
using ((select private.is_manager(organization_id, branch_id)))
with check ((select private.is_manager(organization_id, branch_id)));

create policy modifier_options_member_select on public.modifier_options
for select to authenticated
using ((select private.is_active_member(organization_id, branch_id)));
create policy modifier_options_manager_insert on public.modifier_options
for insert to authenticated
with check ((select private.is_manager(organization_id, branch_id)));
create policy modifier_options_manager_update on public.modifier_options
for update to authenticated
using ((select private.is_manager(organization_id, branch_id)))
with check ((select private.is_manager(organization_id, branch_id)));

create policy allergens_authenticated_select on public.allergens
for select to authenticated using (true);

create policy menu_item_allergens_member_select on public.menu_item_allergens
for select to authenticated
using ((select private.is_active_member(organization_id, branch_id)));
create policy menu_item_allergens_manager_insert on public.menu_item_allergens
for insert to authenticated
with check (
  (select private.is_manager(organization_id, branch_id))
  and source <> 'manager'
  or (
    (select private.is_manager(organization_id, branch_id))
    and source = 'manager'
    and confirmed_by = (select auth.uid())
    and confirmed_at is not null
  )
);
create policy menu_item_allergens_manager_update on public.menu_item_allergens
for update to authenticated
using ((select private.is_manager(organization_id, branch_id)))
with check (
  (select private.is_manager(organization_id, branch_id))
  and (
    source <> 'manager'
    or (
      confirmed_by = (select auth.uid())
      and confirmed_at is not null
    )
  )
);

create policy halls_member_select on public.halls
for select to authenticated
using ((select private.is_active_member(organization_id, branch_id)));
create policy halls_manager_insert on public.halls
for insert to authenticated
with check ((select private.is_manager(organization_id, branch_id)));
create policy halls_manager_update on public.halls
for update to authenticated
using ((select private.is_manager(organization_id, branch_id)))
with check ((select private.is_manager(organization_id, branch_id)));

create policy restaurant_tables_member_select on public.restaurant_tables
for select to authenticated
using ((select private.is_active_member(organization_id, branch_id)));
create policy restaurant_tables_manager_insert on public.restaurant_tables
for insert to authenticated
with check ((select private.is_manager(organization_id, branch_id)));
create policy restaurant_tables_manager_update on public.restaurant_tables
for update to authenticated
using ((select private.is_manager(organization_id, branch_id)))
with check ((select private.is_manager(organization_id, branch_id)));

create policy cancellation_reasons_member_select on public.cancellation_reasons
for select to authenticated
using ((select private.is_active_member(organization_id, branch_id)));
create policy cancellation_reasons_manager_insert on public.cancellation_reasons
for insert to authenticated
with check ((select private.is_manager(organization_id, branch_id)));
create policy cancellation_reasons_manager_update on public.cancellation_reasons
for update to authenticated
using ((select private.is_manager(organization_id, branch_id)))
with check ((select private.is_manager(organization_id, branch_id)));

-- Transactional rows are read-only through PostgREST. Mutations go through the
-- idempotent, audited database functions introduced by the sync/payment work.
create policy table_sessions_member_select on public.table_sessions
for select to authenticated
using ((select private.is_active_member(organization_id, branch_id)));
create policy session_participants_member_select on public.session_participants
for select to authenticated
using ((select private.is_active_member(organization_id, branch_id)));
create policy checks_member_select on public.checks
for select to authenticated
using ((select private.is_active_member(organization_id, branch_id)));
create policy order_batches_member_select on public.order_batches
for select to authenticated
using ((select private.is_active_member(organization_id, branch_id)));
create policy order_items_member_select on public.order_items
for select to authenticated
using ((select private.is_active_member(organization_id, branch_id)));
create policy order_item_modifiers_member_select on public.order_item_modifiers
for select to authenticated
using ((select private.is_active_member(organization_id, branch_id)));
create policy payments_member_select on public.payments
for select to authenticated
using ((select private.is_active_member(organization_id, branch_id)));
create policy payment_allocations_member_select on public.payment_allocations
for select to authenticated
using ((select private.is_active_member(organization_id, branch_id)));
create policy receipts_member_select on public.receipts
for select to authenticated
using ((select private.is_active_member(organization_id, branch_id)));
create policy audit_events_manager_select on public.audit_events
for select to authenticated
using ((select private.is_manager(organization_id, branch_id)));
create policy client_mutations_owner_or_manager_select
on public.client_mutations
for select to authenticated
using (
  exists (
    select 1
    from public.devices as device
    where device.id = client_mutations.device_id
      and device.user_id = (select auth.uid())
      and device.revoked_at is null
  )
  or (select private.is_manager(organization_id, branch_id))
);

revoke all on table
  public.menu_categories,
  public.menu_items,
  public.modifier_groups,
  public.modifier_options,
  public.allergens,
  public.menu_item_allergens,
  public.halls,
  public.restaurant_tables,
  public.table_sessions,
  public.session_participants,
  public.checks,
  public.cancellation_reasons,
  public.order_batches,
  public.order_items,
  public.order_item_modifiers,
  public.payments,
  public.payment_allocations,
  public.receipts,
  public.audit_events,
  public.client_mutations
from anon, authenticated;

grant select on table
  public.menu_categories,
  public.menu_items,
  public.modifier_groups,
  public.modifier_options,
  public.allergens,
  public.menu_item_allergens,
  public.halls,
  public.restaurant_tables,
  public.table_sessions,
  public.session_participants,
  public.checks,
  public.cancellation_reasons,
  public.order_batches,
  public.order_items,
  public.order_item_modifiers,
  public.payments,
  public.payment_allocations,
  public.receipts,
  public.audit_events,
  public.client_mutations
to authenticated;

grant insert, update on table
  public.menu_categories,
  public.menu_items,
  public.modifier_groups,
  public.modifier_options,
  public.menu_item_allergens,
  public.halls,
  public.restaurant_tables,
  public.cancellation_reasons
to authenticated;

revoke execute on function private.prevent_receipt_mutation()
  from public, anon, authenticated;
revoke execute on function private.validate_catalog_parent_scope()
  from public, anon, authenticated;
