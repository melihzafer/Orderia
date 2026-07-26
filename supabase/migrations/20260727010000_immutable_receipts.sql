-- Immutable receipt issuance and private PDF storage.

create table public.receipt_sequences (
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  branch_id uuid not null,
  business_date date not null,
  last_value bigint not null check (last_value > 0),
  updated_at timestamptz not null default now(),
  constraint receipt_sequences_branch_scope_fkey
    foreign key (organization_id, branch_id)
    references public.branches (organization_id, id)
    on delete cascade,
  primary key (branch_id, business_date)
);

alter table public.receipt_sequences enable row level security;
alter table public.receipt_sequences force row level security;
revoke all on table public.receipt_sequences from anon, authenticated;

create unique index receipts_one_issued_per_check_unique
  on public.receipts (check_id)
  where status = 'issued';

create or replace function private.issue_paid_check_receipt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  branch_row public.branches;
  organization_row public.organizations;
  session_row public.table_sessions;
  table_row public.restaurant_tables;
  receipt_id uuid := gen_random_uuid();
  receipt_sequence bigint;
  receipt_number text;
  receipt_business_date date;
  receipt_issued_at timestamptz := now();
  receipt_issued_by uuid := coalesce((select auth.uid()), new.opened_by);
  receipt_total_numeric numeric;
  receipt_total_minor bigint;
  receipt_paid_minor bigint;
  receipt_currency text;
  receipt_snapshot jsonb;
  receipt_pdf_path text;
begin
  if new.status <> 'paid' or old.status = 'paid' then
    return new;
  end if;
  if exists (
    select 1
    from public.receipts as receipt
    where receipt.organization_id = new.organization_id
      and receipt.branch_id = new.branch_id
      and receipt.check_id = new.id
      and receipt.status = 'issued'
  ) then
    return new;
  end if;

  select branch.*
  into branch_row
  from public.branches as branch
  where branch.organization_id = new.organization_id
    and branch.id = new.branch_id;
  select organization.*
  into organization_row
  from public.organizations as organization
  where organization.id = new.organization_id;
  select session.*
  into session_row
  from public.table_sessions as session
  where session.organization_id = new.organization_id
    and session.branch_id = new.branch_id
    and session.id = new.table_session_id;
  select restaurant_table.*
  into table_row
  from public.restaurant_tables as restaurant_table
  where restaurant_table.organization_id = new.organization_id
    and restaurant_table.branch_id = new.branch_id
    and restaurant_table.id = session_row.table_id;
  if branch_row.id is null
    or organization_row.id is null
    or session_row.id is null
    or table_row.id is null then
    raise exception using errcode = '22023', message = 'receipt_context_not_found';
  end if;

  select
    coalesce(sum(
      case
        when item.status = 'cancelled' then 0
        else (
          item.unit_price_minor
          + coalesce((
            select sum(modifier.price_delta_minor * modifier.quantity)
            from public.order_item_modifiers as modifier
            where modifier.organization_id = item.organization_id
              and modifier.branch_id = item.branch_id
              and modifier.order_item_id = item.id
          ), 0)
        ) * item.quantity
      end
    ), 0),
    min(item.currency_code) filter (where item.status <> 'cancelled')
  into receipt_total_numeric, receipt_currency
  from public.order_items as item
  where item.organization_id = new.organization_id
    and item.branch_id = new.branch_id
    and item.check_id = new.id
    and item.deleted_at is null;
  if receipt_total_numeric <= 0
    or trunc(receipt_total_numeric) <> receipt_total_numeric
    or receipt_currency is null then
    raise exception using errcode = '22023', message = 'invalid_receipt_total';
  end if;
  receipt_total_minor := receipt_total_numeric::bigint;

  select coalesce(sum(allocation.amount_minor), 0)
  into receipt_paid_minor
  from public.payment_allocations as allocation
  join public.payments as payment
    on payment.organization_id = allocation.organization_id
   and payment.branch_id = allocation.branch_id
   and payment.id = allocation.payment_id
  where allocation.organization_id = new.organization_id
    and allocation.branch_id = new.branch_id
    and allocation.check_id = new.id
    and payment.status = 'confirmed';
  if receipt_paid_minor <> receipt_total_minor then
    raise exception using errcode = '22023', message = 'receipt_payment_total_mismatch';
  end if;

  receipt_business_date := (
    timezone(branch_row.timezone, receipt_issued_at)
    - (branch_row.business_day_cutoff - time '00:00')
  )::date;
  insert into public.receipt_sequences (
    organization_id,
    branch_id,
    business_date,
    last_value,
    updated_at
  )
  values (
    new.organization_id,
    new.branch_id,
    receipt_business_date,
    1,
    receipt_issued_at
  )
  on conflict (branch_id, business_date) do update
  set last_value = public.receipt_sequences.last_value + 1,
      updated_at = excluded.updated_at
  returning last_value into receipt_sequence;

  receipt_number := concat(
    branch_row.receipt_prefix,
    '-',
    to_char(receipt_business_date, 'YYYYMMDD'),
    '-',
    lpad(receipt_sequence::text, 6, '0')
  );
  receipt_pdf_path := concat(
    new.organization_id::text,
    '/',
    new.branch_id::text,
    '/',
    receipt_business_date::text,
    '/',
    receipt_id::text,
    '.pdf'
  );

  receipt_snapshot := jsonb_build_object(
    'schemaVersion', 1,
    'organizationName', organization_row.name,
    'branchName', branch_row.name,
    'branchTimezone', branch_row.timezone,
    'tableLabel', table_row.label,
    'openedAt', session_row.opened_at,
    'issuedAt', receipt_issued_at,
    'waiterDisplayNames', coalesce((
      select jsonb_agg(actor.display_name order by actor.display_name)
      from (
        select distinct profile.display_name
        from public.profiles as profile
        where profile.id in (
          select item.created_by
          from public.order_items as item
          where item.organization_id = new.organization_id
            and item.branch_id = new.branch_id
            and item.check_id = new.id
          union
          select payment.created_by
          from public.payments as payment
          join public.payment_allocations as allocation
            on allocation.organization_id = payment.organization_id
           and allocation.branch_id = payment.branch_id
           and allocation.payment_id = payment.id
          where allocation.organization_id = new.organization_id
            and allocation.branch_id = new.branch_id
            and allocation.check_id = new.id
            and payment.status = 'confirmed'
        )
      ) as actor
    ), '[]'::jsonb),
    'checks', jsonb_build_array(jsonb_build_object(
      'checkId', new.id,
      'name', new.name,
      'note', new.note,
      'items', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'orderItemId', item.id,
            'name', item.name_snapshot,
            'modifiers', coalesce((
              select jsonb_agg(
                jsonb_build_object(
                  'name', modifier.modifier_option_name_snapshot,
                  'priceDeltaMinor', modifier.price_delta_minor,
                  'quantity', modifier.quantity
                )
                order by modifier.created_at, modifier.id
              )
              from public.order_item_modifiers as modifier
              where modifier.organization_id = item.organization_id
                and modifier.branch_id = item.branch_id
                and modifier.order_item_id = item.id
            ), '[]'::jsonb),
            'unitPriceMinor', item.unit_price_minor,
            'quantity', item.quantity,
            'lineTotalMinor', (
              item.unit_price_minor
              + coalesce((
                select sum(modifier.price_delta_minor * modifier.quantity)
                from public.order_item_modifiers as modifier
                where modifier.organization_id = item.organization_id
                  and modifier.branch_id = item.branch_id
                  and modifier.order_item_id = item.id
              ), 0)
            ) * item.quantity,
            'createdByDisplayName', profile.display_name,
            'createdAt', item.created_at
          )
          order by item.created_at, item.id
        )
        from public.order_items as item
        join public.profiles as profile on profile.id = item.created_by
        where item.organization_id = new.organization_id
          and item.branch_id = new.branch_id
          and item.check_id = new.id
          and item.status <> 'cancelled'
          and item.deleted_at is null
      ), '[]'::jsonb),
      'totalMinor', receipt_total_minor
    )),
    'payments', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'paymentId', payment.id,
          'method', payment.method,
          'amountMinor', paid_for_check.amount_minor,
          'tenderedMinor', payment.tendered_minor,
          'changeMinor', payment.change_minor,
          'confirmedAt', payment.confirmed_at,
          'createdByDisplayName', profile.display_name
        )
        order by payment.confirmed_at, payment.id
      )
      from public.payments as payment
      join public.profiles as profile on profile.id = payment.created_by
      join (
        select allocation.payment_id, sum(allocation.amount_minor) as amount_minor
        from public.payment_allocations as allocation
        where allocation.organization_id = new.organization_id
          and allocation.branch_id = new.branch_id
          and allocation.check_id = new.id
        group by allocation.payment_id
      ) as paid_for_check on paid_for_check.payment_id = payment.id
      where payment.organization_id = new.organization_id
        and payment.branch_id = new.branch_id
        and payment.status = 'confirmed'
    ), '[]'::jsonb),
    'totalMinor', receipt_total_minor,
    'currencyCode', receipt_currency
  );

  insert into public.receipts (
    id,
    organization_id,
    branch_id,
    table_session_id,
    check_id,
    receipt_number,
    business_date,
    issued_at,
    issued_by,
    total_minor,
    currency_code,
    snapshot_json,
    pdf_storage_path,
    status
  )
  values (
    receipt_id,
    new.organization_id,
    new.branch_id,
    new.table_session_id,
    new.id,
    receipt_number,
    receipt_business_date,
    receipt_issued_at,
    receipt_issued_by,
    receipt_total_minor,
    receipt_currency,
    receipt_snapshot,
    receipt_pdf_path,
    'issued'
  );

  return new;
end;
$$;

create trigger checks_issue_paid_receipt
  after update of status on public.checks
  for each row
  when (new.status = 'paid' and old.status is distinct from new.status)
  execute function private.issue_paid_check_receipt();

create or replace function private.finalize_settled_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'payment_pending' then
    return new;
  end if;
  if exists (
    select 1
    from public.checks as check_row
    where check_row.organization_id = new.organization_id
      and check_row.branch_id = new.branch_id
      and check_row.table_session_id = new.id
      and check_row.status not in ('paid', 'voided')
      and check_row.deleted_at is null
  ) then
    return new;
  end if;
  if exists (
    select 1
    from public.checks as check_row
    where check_row.organization_id = new.organization_id
      and check_row.branch_id = new.branch_id
      and check_row.table_session_id = new.id
      and check_row.status = 'paid'
      and check_row.deleted_at is null
      and not exists (
        select 1
        from public.receipts as receipt
        where receipt.organization_id = check_row.organization_id
          and receipt.branch_id = check_row.branch_id
          and receipt.check_id = check_row.id
          and receipt.status = 'issued'
      )
  ) then
    return new;
  end if;

  new.status := 'closed';
  new.closed_by := coalesce((select auth.uid()), new.closed_by, new.opened_by);
  new.closed_at := coalesce(new.closed_at, now());
  return new;
end;
$$;

create trigger table_sessions_finalize_settled
  before update of status on public.table_sessions
  for each row execute function private.finalize_settled_session();

create or replace function private.prevent_receipt_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
    and current_setting('orderia.finalize_receipt_pdf', true) = 'on'
    and old.pdf_hash is null
    and new.pdf_hash ~ '^[a-f0-9]{64}$'
    and to_jsonb(new) - 'pdf_hash' = to_jsonb(old) - 'pdf_hash' then
    return new;
  end if;
  if tg_op = 'UPDATE'
    and new.table_session_id is distinct from old.table_session_id
    and to_jsonb(new) - 'table_session_id'
      = to_jsonb(old) - 'table_session_id' then
    -- A pre-receipt table-merge function may still attempt to move the
    -- receipt. Preserve the immutable row instead of failing the entire
    -- upgrade-safe merge.
    return old;
  end if;

  raise exception using
    errcode = '55000',
    message = 'receipts_are_immutable_create_an_adjustment';
end;
$$;

create or replace function public.finalize_receipt_pdf(
  requested_organization_id uuid,
  requested_branch_id uuid,
  requested_receipt_id uuid,
  requested_pdf_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  receipt_row public.receipts;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not private.is_active_member(requested_organization_id, requested_branch_id) then
    raise exception using errcode = '42501', message = 'branch_access_denied';
  end if;
  if requested_pdf_hash !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_pdf_hash';
  end if;

  select receipt.*
  into receipt_row
  from public.receipts as receipt
  where receipt.organization_id = requested_organization_id
    and receipt.branch_id = requested_branch_id
    and receipt.id = requested_receipt_id
    and receipt.status = 'issued'
  for update;
  if receipt_row.id is null then
    raise exception using errcode = '22023', message = 'receipt_not_found';
  end if;
  if receipt_row.pdf_storage_path is null then
    raise exception using errcode = '22023', message = 'receipt_pdf_path_missing';
  end if;
  if receipt_row.pdf_hash is not null then
    if receipt_row.pdf_hash <> requested_pdf_hash then
      raise exception using errcode = '55000', message = 'receipt_pdf_hash_mismatch';
    end if;
    return jsonb_build_object(
      'status', 'ready',
      'receiptId', receipt_row.id,
      'pdfHash', receipt_row.pdf_hash,
      'pdfStoragePath', receipt_row.pdf_storage_path
    );
  end if;

  perform set_config('orderia.finalize_receipt_pdf', 'on', true);
  update public.receipts
  set pdf_hash = requested_pdf_hash
  where id = receipt_row.id
  returning * into receipt_row;

  return jsonb_build_object(
    'status', 'ready',
    'receiptId', receipt_row.id,
    'pdfHash', receipt_row.pdf_hash,
    'pdfStoragePath', receipt_row.pdf_storage_path
  );
end;
$$;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'receipt-pdfs',
  'receipt-pdfs',
  false,
  5242880,
  array['application/pdf']
)
on conflict (id) do nothing;

create policy receipt_pdfs_member_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'receipt-pdfs'
  and exists (
    select 1
    from public.receipts as receipt
    where receipt.pdf_storage_path = name
      and private.is_active_member(receipt.organization_id, receipt.branch_id)
  )
);

create policy receipt_pdfs_member_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'receipt-pdfs'
  and exists (
    select 1
    from public.receipts as receipt
    where receipt.pdf_storage_path = name
      and private.is_active_member(receipt.organization_id, receipt.branch_id)
  )
);

revoke execute on function private.issue_paid_check_receipt() from public, anon, authenticated;
revoke execute on function private.finalize_settled_session() from public, anon, authenticated;
revoke execute on function public.finalize_receipt_pdf(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.finalize_receipt_pdf(uuid, uuid, uuid, text) to authenticated;

-- Preserve paid history when upgrading a deployment that already installed
-- the original table-merge function. Fresh installations also keep these
-- invariants as a final database-level safety net.
create or replace function private.preserve_settled_session_graph()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_session_id uuid;
begin
  if new.table_session_id is not distinct from old.table_session_id then
    return new;
  end if;

  if tg_table_name = 'checks' then
    if old.status in ('paid', 'voided') then
      return old;
    end if;
    return new;
  end if;

  if tg_table_name in ('order_batches', 'order_items') then
    select check_row.table_session_id
    into parent_session_id
    from public.checks as check_row
    where check_row.organization_id = new.organization_id
      and check_row.branch_id = new.branch_id
      and check_row.id = new.check_id;
    if parent_session_id is distinct from new.table_session_id then
      return old;
    end if;
    return new;
  end if;

  if tg_table_name = 'payments' then
    if not exists (
      select 1
      from public.payment_allocations as allocation
      join public.checks as check_row
        on check_row.organization_id = allocation.organization_id
       and check_row.branch_id = allocation.branch_id
       and check_row.id = allocation.check_id
      where allocation.organization_id = new.organization_id
        and allocation.branch_id = new.branch_id
        and allocation.payment_id = new.id
        and check_row.table_session_id = new.table_session_id
    ) or exists (
      select 1
      from public.payment_allocations as allocation
      join public.checks as check_row
        on check_row.organization_id = allocation.organization_id
       and check_row.branch_id = allocation.branch_id
       and check_row.id = allocation.check_id
      where allocation.organization_id = new.organization_id
        and allocation.branch_id = new.branch_id
        and allocation.payment_id = new.id
        and check_row.table_session_id <> new.table_session_id
    ) then
      return old;
    end if;
  end if;

  return new;
end;
$$;

create trigger checks_preserve_settled_session
  before update of table_session_id on public.checks
  for each row execute function private.preserve_settled_session_graph();
create trigger order_batches_preserve_settled_session
  before update of table_session_id on public.order_batches
  for each row execute function private.preserve_settled_session_graph();
create trigger order_items_preserve_settled_session
  before update of table_session_id on public.order_items
  for each row execute function private.preserve_settled_session_graph();
create trigger payments_preserve_settled_session
  before update of table_session_id on public.payments
  for each row execute function private.preserve_settled_session_graph();

alter function public.transfer_or_merge_table_session(
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb
) rename to transfer_or_merge_table_session_legacy;
alter function public.transfer_or_merge_table_session_legacy(
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb
) set schema private;

revoke execute on function private.transfer_or_merge_table_session_legacy(
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb
) from public, anon, authenticated;

create or replace function public.transfer_or_merge_table_session(
  requested_organization_id uuid,
  requested_branch_id uuid,
  requested_device_id uuid,
  requested_client_mutation_id uuid,
  requested_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_was_active boolean;
  active_check_count bigint := 0;
  requested_source_session_id uuid;
  mutation_result jsonb;
begin
  if requested_payload is not null
    and jsonb_typeof(requested_payload) = 'object'
    and requested_payload ? 'sourceSessionId' then
    begin
      requested_source_session_id :=
        (requested_payload ->> 'sourceSessionId')::uuid;
    exception
      when invalid_text_representation then
        requested_source_session_id := null;
    end;
  end if;

  select exists (
    select 1
    from public.table_sessions as session
    where session.organization_id = requested_organization_id
      and session.branch_id = requested_branch_id
      and session.id = requested_source_session_id
      and session.status in ('open', 'payment_pending')
      and session.deleted_at is null
  )
  into source_was_active;

  if source_was_active then
    select count(*)
    into active_check_count
    from public.checks as check_row
    where check_row.organization_id = requested_organization_id
      and check_row.branch_id = requested_branch_id
      and check_row.table_session_id = requested_source_session_id
      and check_row.status in ('open', 'partially_paid')
      and check_row.deleted_at is null;
  end if;

  mutation_result := private.transfer_or_merge_table_session_legacy(
    requested_organization_id,
    requested_branch_id,
    requested_device_id,
    requested_client_mutation_id,
    requested_payload
  );

  if source_was_active then
    mutation_result := jsonb_set(
      mutation_result,
      '{movedCheckCount}',
      to_jsonb(active_check_count),
      true
    );
    update public.client_mutations
    set result_json = mutation_result
    where organization_id = requested_organization_id
      and branch_id = requested_branch_id
      and device_id = requested_device_id
      and client_mutation_id = requested_client_mutation_id
      and mutation_type = 'table_sessions.transfer_or_merge';
  end if;

  return mutation_result;
end;
$$;

revoke execute on function private.preserve_settled_session_graph()
  from public, anon, authenticated;
revoke execute on function public.transfer_or_merge_table_session(
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb
) from public, anon;
grant execute on function public.transfer_or_merge_table_session(
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb
) to authenticated;
