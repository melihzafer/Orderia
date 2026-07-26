-- Cursor-paginated, tenant-scoped receipt archive search.

create extension if not exists pg_trgm with schema extensions;

create index receipts_branch_business_cursor_idx
  on public.receipts (
    branch_id,
    business_date desc,
    issued_at desc,
    id desc
  );
create index receipts_number_trigram_idx
  on public.receipts using gin (
    lower(receipt_number) extensions.gin_trgm_ops
  );
create index receipts_table_trigram_idx
  on public.receipts using gin (
    lower((snapshot_json ->> 'tableLabel')) extensions.gin_trgm_ops
  );
create index receipts_check_trigram_idx
  on public.receipts using gin (
    lower((snapshot_json #>> '{checks,0,name}')) extensions.gin_trgm_ops
  );
create index receipts_waiter_trigram_idx
  on public.receipts using gin (
    lower((snapshot_json ->> 'waiterDisplayNames'))
      extensions.gin_trgm_ops
  );

create or replace function public.search_receipts(
  requested_organization_id uuid,
  requested_branch_id uuid,
  requested_query text default null,
  requested_date_from date default null,
  requested_date_to date default null,
  requested_time_from time default null,
  requested_time_to time default null,
  requested_waiter_query text default null,
  requested_payment_method text default null,
  requested_amount_min_minor bigint default null,
  requested_amount_max_minor bigint default null,
  requested_has_adjustment boolean default null,
  requested_after_issued_at timestamptz default null,
  requested_after_id uuid default null,
  requested_page_size integer default 30
)
returns table (
  id uuid,
  organization_id uuid,
  branch_id uuid,
  branch_name text,
  branch_timezone text,
  table_session_id uuid,
  check_id uuid,
  receipt_number text,
  business_date date,
  issued_at timestamptz,
  issued_by uuid,
  total_minor bigint,
  currency_code text,
  snapshot_json jsonb,
  pdf_storage_path text,
  pdf_hash text,
  status text,
  adjusts_receipt_id uuid,
  has_adjustment boolean
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  normalized_query text := nullif(trim(requested_query), '');
  normalized_waiter_query text := nullif(trim(requested_waiter_query), '');
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not private.is_active_member(requested_organization_id, requested_branch_id) then
    raise exception using errcode = '42501', message = 'branch_access_denied';
  end if;
  if requested_page_size < 1 or requested_page_size > 100 then
    raise exception using errcode = '22023', message = 'invalid_receipt_page_size';
  end if;
  if (requested_after_issued_at is null) <> (requested_after_id is null) then
    raise exception using errcode = '22023', message = 'invalid_receipt_cursor';
  end if;
  if requested_date_from is not null
    and requested_date_to is not null
    and requested_date_from > requested_date_to then
    raise exception using errcode = '22023', message = 'invalid_receipt_date_range';
  end if;
  if (
    requested_amount_min_minor is not null
    and requested_amount_min_minor < 0
  ) or (
    requested_amount_max_minor is not null
    and requested_amount_max_minor < 0
  ) or (
    requested_amount_min_minor is not null
      and requested_amount_max_minor is not null
      and requested_amount_min_minor > requested_amount_max_minor
  ) then
    raise exception using errcode = '22023', message = 'invalid_receipt_amount_range';
  end if;
  if (
    normalized_query is not null
    and char_length(normalized_query) > 120
  ) or (
    normalized_waiter_query is not null
    and char_length(normalized_waiter_query) > 120
  ) then
    raise exception using errcode = '22023', message = 'receipt_search_query_too_long';
  end if;
  if requested_payment_method is not null
    and requested_payment_method not in ('cash', 'card', 'mixed_adjustment') then
    raise exception using errcode = '22023', message = 'invalid_receipt_payment_method';
  end if;

  return query
  select
    receipt.id,
    receipt.organization_id,
    receipt.branch_id,
    branch.name,
    branch.timezone,
    receipt.table_session_id,
    receipt.check_id,
    receipt.receipt_number,
    receipt.business_date,
    receipt.issued_at,
    receipt.issued_by,
    receipt.total_minor,
    receipt.currency_code,
    receipt.snapshot_json,
    receipt.pdf_storage_path,
    receipt.pdf_hash,
    receipt.status,
    receipt.adjusts_receipt_id,
    exists (
      select 1
      from public.receipts as adjustment
      where adjustment.organization_id = receipt.organization_id
        and adjustment.branch_id = receipt.branch_id
        and adjustment.adjusts_receipt_id = receipt.id
    )
  from public.receipts as receipt
  join public.branches as branch
    on branch.organization_id = receipt.organization_id
   and branch.id = receipt.branch_id
  where receipt.organization_id = requested_organization_id
    and receipt.branch_id = requested_branch_id
    and receipt.status in ('issued', 'adjusted', 'voided')
    and (
      requested_date_from is null
      or receipt.business_date >= requested_date_from
    )
    and (
      requested_date_to is null
      or receipt.business_date <= requested_date_to
    )
    and (
      requested_time_from is null
      or requested_time_to is null
      or case
        when requested_time_from <= requested_time_to then
          timezone(branch.timezone, receipt.issued_at)::time
            between requested_time_from and requested_time_to
        else
          timezone(branch.timezone, receipt.issued_at)::time >= requested_time_from
          or timezone(branch.timezone, receipt.issued_at)::time <= requested_time_to
      end
    )
    and (
      requested_time_from is null
      or requested_time_to is not null
      or timezone(branch.timezone, receipt.issued_at)::time >= requested_time_from
    )
    and (
      requested_time_to is null
      or requested_time_from is not null
      or timezone(branch.timezone, receipt.issued_at)::time <= requested_time_to
    )
    and (
      normalized_query is null
      or lower(receipt.receipt_number)
        like concat('%', lower(normalized_query), '%')
      or lower(receipt.snapshot_json ->> 'tableLabel')
        like concat('%', lower(normalized_query), '%')
      or lower(receipt.snapshot_json #>> '{checks,0,name}')
        like concat('%', lower(normalized_query), '%')
    )
    and (
      normalized_waiter_query is null
      or lower(receipt.snapshot_json ->> 'waiterDisplayNames')
        like concat('%', lower(normalized_waiter_query), '%')
    )
    and (
      requested_payment_method is null
      or exists (
        select 1
        from jsonb_array_elements(
          coalesce(receipt.snapshot_json -> 'payments', '[]'::jsonb)
        ) as payment(value)
        where payment.value ->> 'method' = requested_payment_method
      )
    )
    and (
      requested_amount_min_minor is null
      or receipt.total_minor >= requested_amount_min_minor
    )
    and (
      requested_amount_max_minor is null
      or receipt.total_minor <= requested_amount_max_minor
    )
    and (
      requested_has_adjustment is null
      or requested_has_adjustment = (
        receipt.status <> 'issued'
        or exists (
          select 1
          from public.receipts as adjustment
          where adjustment.organization_id = receipt.organization_id
            and adjustment.branch_id = receipt.branch_id
            and adjustment.adjusts_receipt_id = receipt.id
        )
      )
    )
    and (
      requested_after_issued_at is null
      or (receipt.issued_at, receipt.id)
        < (requested_after_issued_at, requested_after_id)
    )
  order by receipt.issued_at desc, receipt.id desc
  limit requested_page_size + 1;
end;
$$;

revoke execute on function public.search_receipts(
  uuid,
  uuid,
  text,
  date,
  date,
  time,
  time,
  text,
  text,
  bigint,
  bigint,
  boolean,
  timestamptz,
  uuid,
  integer
) from public, anon;
grant execute on function public.search_receipts(
  uuid,
  uuid,
  text,
  date,
  date,
  time,
  time,
  text,
  text,
  bigint,
  bigint,
  boolean,
  timestamptz,
  uuid,
  integer
) to authenticated;
