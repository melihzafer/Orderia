-- Auditable manager reporting from immutable receipts and confirmed ledgers.

create index payments_branch_status_confirmed_idx
  on public.payments (branch_id, status, confirmed_at desc, created_by);
create index order_items_branch_creator_created_idx
  on public.order_items (branch_id, created_by, created_at desc);
create index order_items_branch_cancellation_idx
  on public.order_items (branch_id, cancelled_at desc, cancelled_by)
  where status = 'cancelled';
create index session_participants_branch_activity_idx
  on public.session_participants (branch_id, last_action_at desc, user_id);

create or replace function public.get_manager_report(
  requested_organization_id uuid,
  requested_branch_id uuid,
  requested_date_from date,
  requested_date_to date,
  requested_waiter_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  branch_row public.branches;
  report_json jsonb;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not private.is_manager(requested_organization_id, requested_branch_id) then
    raise exception using errcode = '42501', message = 'manager_role_required';
  end if;
  if requested_date_from is null
    or requested_date_to is null
    or requested_date_from > requested_date_to
    or requested_date_to - requested_date_from > 366 then
    raise exception using errcode = '22023', message = 'invalid_report_date_range';
  end if;

  select branch.*
  into branch_row
  from public.branches as branch
  where branch.organization_id = requested_organization_id
    and branch.id = requested_branch_id
    and branch.deleted_at is null;
  if branch_row.id is null then
    raise exception using errcode = '22023', message = 'report_branch_not_found';
  end if;

  with
  period_receipts as (
    select receipt.*
    from public.receipts as receipt
    where receipt.organization_id = requested_organization_id
      and receipt.branch_id = requested_branch_id
      and receipt.business_date between requested_date_from and requested_date_to
      and receipt.status = 'issued'
  ),
  item_lines as (
    select
      receipt.id as receipt_id,
      receipt.business_date,
      item.id as order_item_id,
      item.table_session_id,
      item.created_by,
      item.created_at,
      item.quantity,
      (
        (
          item.unit_price_minor
          + coalesce(modifier_total.amount_minor, 0)
        ) * item.quantity
      )::bigint as amount_minor
    from period_receipts as receipt
    join public.order_items as item
      on item.organization_id = receipt.organization_id
     and item.branch_id = receipt.branch_id
     and item.check_id = receipt.check_id
     and item.status <> 'cancelled'
     and item.deleted_at is null
    left join lateral (
      select sum(modifier.price_delta_minor * modifier.quantity) as amount_minor
      from public.order_item_modifiers as modifier
      where modifier.organization_id = item.organization_id
        and modifier.branch_id = item.branch_id
        and modifier.order_item_id = item.id
    ) as modifier_total on true
  ),
  period_allocations as (
    select
      receipt.business_date,
      allocation.payment_id,
      allocation.check_id,
      allocation.amount_minor,
      payment.created_by,
      payment.confirmed_at,
      payment.table_session_id
    from period_receipts as receipt
    join public.payment_allocations as allocation
      on allocation.organization_id = receipt.organization_id
     and allocation.branch_id = receipt.branch_id
     and allocation.check_id = receipt.check_id
    join public.payments as payment
      on payment.organization_id = allocation.organization_id
     and payment.branch_id = allocation.branch_id
     and payment.id = allocation.payment_id
     and payment.status = 'confirmed'
  ),
  payment_totals as (
    select
      allocation.payment_id,
      min(allocation.business_date) as business_date,
      allocation.created_by,
      allocation.confirmed_at,
      allocation.table_session_id,
      sum(allocation.amount_minor)::bigint as amount_minor
    from period_allocations as allocation
    group by
      allocation.payment_id,
      allocation.created_by,
      allocation.confirmed_at,
      allocation.table_session_id
  ),
  cancellations as (
    select
      item.id as order_item_id,
      item.table_session_id,
      item.name_snapshot,
      item.created_by,
      creator.display_name as created_by_display_name,
      item.cancelled_by,
      canceller.display_name as cancelled_by_display_name,
      item.cancelled_at,
      reason.name as reason_name,
      restaurant_table.label as table_label,
      (
        (
          item.unit_price_minor
          + coalesce(modifier_total.amount_minor, 0)
        ) * item.quantity
      )::bigint as amount_minor,
      (
        timezone(branch_row.timezone, item.cancelled_at)
        - (branch_row.business_day_cutoff - time '00:00')
      )::date as business_date
    from public.order_items as item
    join public.profiles as creator on creator.id = item.created_by
    join public.profiles as canceller on canceller.id = item.cancelled_by
    join public.cancellation_reasons as reason
      on reason.organization_id = item.organization_id
     and reason.branch_id = item.branch_id
     and reason.id = item.cancellation_reason_id
    join public.restaurant_tables as restaurant_table
      on restaurant_table.organization_id = item.organization_id
     and restaurant_table.branch_id = item.branch_id
     and restaurant_table.id = item.original_table_id
    left join lateral (
      select sum(modifier.price_delta_minor * modifier.quantity) as amount_minor
      from public.order_item_modifiers as modifier
      where modifier.organization_id = item.organization_id
        and modifier.branch_id = item.branch_id
        and modifier.order_item_id = item.id
    ) as modifier_total on true
    where item.organization_id = requested_organization_id
      and item.branch_id = requested_branch_id
      and item.status = 'cancelled'
      and item.cancelled_at is not null
      and item.deleted_at is null
      and (
        timezone(branch_row.timezone, item.cancelled_at)
        - (branch_row.business_day_cutoff - time '00:00')
      )::date between requested_date_from and requested_date_to
  ),
  contributors as (
    select item.created_by as user_id from item_lines as item
    union
    select payment.created_by as user_id from payment_totals as payment
    union
    select cancellation.cancelled_by as user_id from cancellations as cancellation
  ),
  waiter_stats as (
    select
      contributor.user_id,
      profile.display_name,
      (
        select count(*)
        from item_lines as item
        where item.created_by = contributor.user_id
      )::bigint as item_rows,
      coalesce((
        select sum(item.quantity)
        from item_lines as item
        where item.created_by = contributor.user_id
      ), 0) as item_quantity,
      coalesce((
        select sum(item.amount_minor)
        from item_lines as item
        where item.created_by = contributor.user_id
      ), 0)::bigint as contributed_revenue_minor,
      coalesce((
        select sum(payment.amount_minor)
        from payment_totals as payment
        where payment.created_by = contributor.user_id
      ), 0)::bigint as payment_handled_minor,
      (
        select count(*)
        from payment_totals as payment
        where payment.created_by = contributor.user_id
      )::bigint as payment_count,
      (
        select count(distinct served.table_session_id)
        from (
          select item.table_session_id
          from item_lines as item
          where item.created_by = contributor.user_id
          union all
          select payment.table_session_id
          from payment_totals as payment
          where payment.created_by = contributor.user_id
        ) as served
      )::bigint as tables_served,
      (
        select count(*)
        from cancellations as cancellation
        where cancellation.cancelled_by = contributor.user_id
      )::bigint as cancellation_count,
      coalesce((
        select sum(cancellation.amount_minor)
        from cancellations as cancellation
        where cancellation.cancelled_by = contributor.user_id
      ), 0)::bigint as cancellation_value_minor,
      (
        select count(distinct item.table_session_id)
        from item_lines as item
        join public.table_sessions as session
          on session.organization_id = requested_organization_id
         and session.branch_id = requested_branch_id
         and session.id = item.table_session_id
        where item.created_by = contributor.user_id
          and session.opened_by <> contributor.user_id
      )::bigint as helped_table_count,
      activity.first_action_at,
      activity.last_action_at,
      coalesce(
        ceil(
          extract(epoch from activity.last_action_at - activity.first_action_at)
          / 60
        ),
        0
      )::integer as observed_active_minutes
    from contributors as contributor
    join public.profiles as profile on profile.id = contributor.user_id
    left join lateral (
      select
        min(action.occurred_at) as first_action_at,
        max(action.occurred_at) as last_action_at
      from (
        select item.created_at as occurred_at
        from item_lines as item
        where item.created_by = contributor.user_id
        union all
        select payment.confirmed_at
        from payment_totals as payment
        where payment.created_by = contributor.user_id
        union all
        select cancellation.cancelled_at
        from cancellations as cancellation
        where cancellation.cancelled_by = contributor.user_id
      ) as action
    ) as activity on true
    where requested_waiter_id is null
      or contributor.user_id = requested_waiter_id
  ),
  report_days as (
    select generate_series(
      requested_date_from::timestamp,
      requested_date_to::timestamp,
      interval '1 day'
    )::date as business_date
  ),
  daily_stats as (
    select
      day.business_date,
      coalesce((
        select sum(allocation.amount_minor)
        from period_allocations as allocation
        where allocation.business_date = day.business_date
      ), 0)::bigint as confirmed_revenue_minor,
      (
        select count(*)
        from period_receipts as receipt
        where receipt.business_date = day.business_date
      )::bigint as receipt_count,
      (
        select count(*)
        from cancellations as cancellation
        where cancellation.business_date = day.business_date
      )::bigint as cancellation_count,
      case
        when requested_waiter_id is null then null
        else coalesce((
          select sum(item.amount_minor)
          from item_lines as item
          where item.business_date = day.business_date
            and item.created_by = requested_waiter_id
        ), 0)::bigint
      end as selected_waiter_contribution_minor
    from report_days as day
  ),
  active_check_balances as (
    select
      check_row.id,
      check_row.table_session_id,
      greatest(
        coalesce((
          select sum(
            (
              item.unit_price_minor
              + coalesce((
                select sum(modifier.price_delta_minor * modifier.quantity)
                from public.order_item_modifiers as modifier
                where modifier.organization_id = item.organization_id
                  and modifier.branch_id = item.branch_id
                  and modifier.order_item_id = item.id
              ), 0)
            ) * item.quantity
          )
          from public.order_items as item
          where item.organization_id = check_row.organization_id
            and item.branch_id = check_row.branch_id
            and item.check_id = check_row.id
            and item.status <> 'cancelled'
            and item.deleted_at is null
        ), 0)
        - coalesce((
          select sum(allocation.amount_minor)
          from public.payment_allocations as allocation
          join public.payments as payment
            on payment.organization_id = allocation.organization_id
           and payment.branch_id = allocation.branch_id
           and payment.id = allocation.payment_id
           and payment.status = 'confirmed'
          where allocation.organization_id = check_row.organization_id
            and allocation.branch_id = check_row.branch_id
            and allocation.check_id = check_row.id
        ), 0),
        0
      )::bigint as remaining_minor
    from public.checks as check_row
    where check_row.organization_id = requested_organization_id
      and check_row.branch_id = requested_branch_id
      and check_row.status in ('open', 'partially_paid')
      and check_row.deleted_at is null
  )
  select jsonb_build_object(
    'generatedAt', now(),
    'organizationId', requested_organization_id,
    'branchId', requested_branch_id,
    'branchName', branch_row.name,
    'currencyCode', branch_row.currency_code,
    'dateFrom', requested_date_from,
    'dateTo', requested_date_to,
    'selectedWaiterId', requested_waiter_id,
    'summary', jsonb_build_object(
      'confirmedRevenueMinor', coalesce((
        select sum(allocation.amount_minor) from period_allocations as allocation
      ), 0)::bigint,
      'receiptCount', (select count(*) from period_receipts),
      'confirmedPaymentCount', (select count(*) from payment_totals),
      'servedTableCount', (
        select count(distinct receipt.table_session_id) from period_receipts as receipt
      ),
      'averageReceiptMinor', coalesce((
        select round(avg(receipt.total_minor)) from period_receipts as receipt
      ), 0)::bigint,
      'cancelledItemCount', (select count(*) from cancellations),
      'cancelledValueMinor', coalesce((
        select sum(cancellation.amount_minor) from cancellations as cancellation
      ), 0)::bigint,
      'selectedWaiterContributionMinor', case
        when requested_waiter_id is null then null
        else coalesce((
          select sum(item.amount_minor)
          from item_lines as item
          where item.created_by = requested_waiter_id
        ), 0)::bigint
      end,
      'selectedWaiterPaymentHandledMinor', case
        when requested_waiter_id is null then null
        else coalesce((
          select sum(payment.amount_minor)
          from payment_totals as payment
          where payment.created_by = requested_waiter_id
        ), 0)::bigint
      end,
      'currentOpenTableCount', (
        select count(distinct session.table_id)
        from public.table_sessions as session
        where session.organization_id = requested_organization_id
          and session.branch_id = requested_branch_id
          and session.status in ('open', 'payment_pending')
          and session.deleted_at is null
      ),
      'currentPaymentPendingCount', (
        select count(*)
        from public.table_sessions as session
        where session.organization_id = requested_organization_id
          and session.branch_id = requested_branch_id
          and session.status = 'payment_pending'
          and session.deleted_at is null
      ),
      'currentOpenBalanceMinor', coalesce((
        select sum(balance.remaining_minor) from active_check_balances as balance
      ), 0)::bigint,
      'activeWaiterCount', (
        select count(distinct participant.user_id)
        from public.session_participants as participant
        where participant.organization_id = requested_organization_id
          and participant.branch_id = requested_branch_id
          and participant.last_action_at >= now() - interval '15 minutes'
      )
    ),
    'waiters', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'userId', waiter.user_id,
          'displayName', waiter.display_name,
          'itemRows', waiter.item_rows,
          'itemQuantity', waiter.item_quantity,
          'contributedRevenueMinor', waiter.contributed_revenue_minor,
          'paymentHandledMinor', waiter.payment_handled_minor,
          'paymentCount', waiter.payment_count,
          'tablesServed', waiter.tables_served,
          'cancellationCount', waiter.cancellation_count,
          'cancellationValueMinor', waiter.cancellation_value_minor,
          'helpedTableCount', waiter.helped_table_count,
          'firstActionAt', waiter.first_action_at,
          'lastActionAt', waiter.last_action_at,
          'observedActiveMinutes', waiter.observed_active_minutes
        )
        order by waiter.contributed_revenue_minor desc, waiter.display_name
      )
      from waiter_stats as waiter
    ), '[]'::jsonb),
    'daily', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'businessDate', daily.business_date,
          'confirmedRevenueMinor', daily.confirmed_revenue_minor,
          'receiptCount', daily.receipt_count,
          'cancellationCount', daily.cancellation_count,
          'selectedWaiterContributionMinor',
            daily.selected_waiter_contribution_minor
        )
        order by daily.business_date
      )
      from daily_stats as daily
    ), '[]'::jsonb),
    'cancellations', coalesce((
      select jsonb_agg(to_jsonb(context) order by context."cancelledAt" desc)
      from (
        select
          cancellation.order_item_id as "orderItemId",
          cancellation.table_label as "tableLabel",
          cancellation.name_snapshot as "itemName",
          cancellation.reason_name as "reasonName",
          cancellation.created_by as "createdBy",
          cancellation.created_by_display_name as "createdByDisplayName",
          cancellation.cancelled_by as "cancelledBy",
          cancellation.cancelled_by_display_name as "cancelledByDisplayName",
          cancellation.cancelled_at as "cancelledAt",
          cancellation.amount_minor as "excludedAmountMinor"
        from cancellations as cancellation
        where requested_waiter_id is null
          or cancellation.cancelled_by = requested_waiter_id
        order by cancellation.cancelled_at desc
        limit 20
      ) as context
    ), '[]'::jsonb),
    'definitions', jsonb_build_object(
      'confirmedRevenue', 'confirmed payment allocations for issued receipts',
      'waiterContribution', 'non-cancelled immutable item value grouped by order_items.created_by',
      'paymentsHandled', 'confirmed payment allocation value grouped by payments.created_by',
      'cancellations', 'cancel action grouped by order_items.cancelled_by; excluded from revenue',
      'observedActiveMinutes', 'elapsed time between first and last observed action; not a payroll shift'
    )
  )
  into report_json;

  return report_json;
end;
$$;

revoke execute on function public.get_manager_report(
  uuid,
  uuid,
  date,
  date,
  uuid
) from public, anon;
grant execute on function public.get_manager_report(
  uuid,
  uuid,
  date,
  date,
  uuid
) to authenticated;
