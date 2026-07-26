-- Server-authoritative split, partial, and mixed payments.
--
-- A payment command is intentionally not sent through the retrying outbox.
-- The client submits it while online and the database protects explicit
-- replays with the client mutation ID. Every command locks its check, so two
-- devices cannot both consume the same remaining balance.

create or replace function public.confirm_check_payments(
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
  caller_user_id uuid := (select auth.uid());
  fingerprint text;
  claimed_mutation_id uuid;
  prior_mutation public.client_mutations;
  prior_check public.checks;
  canonical_check public.checks;
  target_session public.table_sessions;
  payment_payload jsonb;
  allocation_payload jsonb;
  target_item public.order_items;
  requested_check_id uuid;
  requested_payment_id uuid;
  requested_allocation_id uuid;
  expected_check_version bigint;
  payment_amount_minor bigint;
  payment_allocation_total bigint;
  payment_tendered_minor bigint;
  payment_method text;
  allocation_amount_minor bigint;
  allocation_quantity numeric;
  check_total_numeric numeric;
  check_total_minor bigint;
  confirmed_paid_minor bigint;
  requested_total_minor bigint := 0;
  final_paid_minor bigint;
  item_total_numeric numeric;
  item_total_minor bigint;
  item_paid_minor bigint;
  item_paid_quantity numeric;
  item_unit_total_numeric numeric;
  currency_count integer;
  canonical_currency_code text;
  mutation_result jsonb;
  payment_ids jsonb := '[]'::jsonb;
begin
  if caller_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if requested_payload is null
    or jsonb_typeof(requested_payload) is distinct from 'object'
    or requested_payload - array[
      'checkId',
      'expectedCheckVersion',
      'currencyCode',
      'payments'
    ] <> '{}'::jsonb
    or not (requested_payload ?& array[
      'checkId',
      'expectedCheckVersion',
      'currencyCode',
      'payments'
    ])
    or jsonb_typeof(requested_payload -> 'payments') is distinct from 'array'
    or jsonb_array_length(requested_payload -> 'payments') not between 1 and 2 then
    raise exception using errcode = '22023', message = 'invalid_payment_payload_shape';
  end if;
  if octet_length(requested_payload::text) > 65536 then
    raise exception using errcode = '22023', message = 'payment_payload_too_large';
  end if;
  if not private.is_active_member(requested_organization_id, requested_branch_id) then
    raise exception using errcode = '42501', message = 'branch_access_denied';
  end if;
  if not exists (
    select 1
    from public.devices as device
    where device.id = requested_device_id
      and device.organization_id = requested_organization_id
      and device.branch_id = requested_branch_id
      and device.user_id = caller_user_id
      and device.revoked_at is null
  ) then
    raise exception using errcode = '42501', message = 'device_access_denied';
  end if;

  requested_check_id := (requested_payload ->> 'checkId')::uuid;
  expected_check_version := (requested_payload ->> 'expectedCheckVersion')::bigint;
  if expected_check_version < 1 then
    raise exception using errcode = '22023', message = 'invalid_expected_check_version';
  end if;
  if coalesce(requested_payload ->> 'currencyCode', '') !~ '^[A-Z]{3}$' then
    raise exception using errcode = '22023', message = 'invalid_payment_currency';
  end if;

  fingerprint := md5(concat_ws(
    ':',
    requested_organization_id::text,
    requested_branch_id::text,
    requested_device_id::text,
    requested_client_mutation_id::text,
    'checks.confirm_payments',
    requested_check_id::text,
    requested_payload::text
  ));

  insert into public.client_mutations (
    organization_id,
    branch_id,
    device_id,
    client_mutation_id,
    mutation_type,
    entity_id,
    request_fingerprint,
    result_json
  )
  values (
    requested_organization_id,
    requested_branch_id,
    requested_device_id,
    requested_client_mutation_id,
    'checks.confirm_payments',
    requested_check_id,
    fingerprint,
    '{}'::jsonb
  )
  on conflict (device_id, client_mutation_id) do nothing
  returning id into claimed_mutation_id;

  if claimed_mutation_id is null then
    select mutation.*
    into prior_mutation
    from public.client_mutations as mutation
    where mutation.device_id = requested_device_id
      and mutation.client_mutation_id = requested_client_mutation_id;
    if prior_mutation.id is null then
      raise exception using
        errcode = '40001',
        message = 'idempotency_result_temporarily_unavailable';
    end if;
    if prior_mutation.request_fingerprint <> fingerprint then
      raise exception using
        errcode = '22023',
        message = 'client_mutation_id_reused_with_different_content';
    end if;
    return prior_mutation.result_json;
  end if;

  select check_row.*
  into prior_check
  from public.checks as check_row
  where check_row.organization_id = requested_organization_id
    and check_row.branch_id = requested_branch_id
    and check_row.id = requested_check_id
    and check_row.deleted_at is null
  for update;
  if prior_check.id is null then
    raise exception using errcode = '22023', message = 'payment_check_not_found';
  end if;
  if prior_check.status not in ('open', 'partially_paid') then
    raise exception using errcode = '22023', message = 'payment_check_not_open';
  end if;
  if prior_check.version <> expected_check_version then
    raise exception using
      errcode = 'P0001',
      message = 'payment_check_version_conflict',
      detail = jsonb_build_object(
        'serverVersion', prior_check.version,
        'serverPayload', to_jsonb(prior_check)
      )::text;
  end if;

  select session.*
  into target_session
  from public.table_sessions as session
  where session.organization_id = requested_organization_id
    and session.branch_id = requested_branch_id
    and session.id = prior_check.table_session_id
    and session.status in ('open', 'payment_pending')
    and session.deleted_at is null
  for update;
  if target_session.id is null then
    raise exception using errcode = '22023', message = 'payment_session_not_open';
  end if;

  perform 1
  from public.order_items as item
  where item.organization_id = requested_organization_id
    and item.branch_id = requested_branch_id
    and item.check_id = prior_check.id
    and item.deleted_at is null
  order by item.id
  for update;

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
    count(distinct item.currency_code) filter (where item.status <> 'cancelled'),
    min(item.currency_code) filter (where item.status <> 'cancelled')
  into check_total_numeric, currency_count, canonical_currency_code
  from public.order_items as item
  where item.organization_id = requested_organization_id
    and item.branch_id = requested_branch_id
    and item.check_id = prior_check.id
    and item.deleted_at is null;

  if check_total_numeric <= 0 or trunc(check_total_numeric) <> check_total_numeric then
    raise exception using errcode = '22023', message = 'invalid_payable_check_total';
  end if;
  if currency_count <> 1
    or canonical_currency_code <> requested_payload ->> 'currencyCode' then
    raise exception using errcode = '22023', message = 'payment_currency_mismatch';
  end if;
  check_total_minor := check_total_numeric::bigint;

  select coalesce(sum(allocation.amount_minor), 0)
  into confirmed_paid_minor
  from public.payment_allocations as allocation
  join public.payments as payment
    on payment.organization_id = allocation.organization_id
   and payment.branch_id = allocation.branch_id
   and payment.id = allocation.payment_id
  where allocation.organization_id = requested_organization_id
    and allocation.branch_id = requested_branch_id
    and allocation.check_id = prior_check.id
    and payment.status = 'confirmed';

  for payment_payload in
    select value from jsonb_array_elements(requested_payload -> 'payments')
  loop
    if jsonb_typeof(payment_payload) is distinct from 'object'
      or payment_payload - array[
        'id',
        'method',
        'amountMinor',
        'tenderedMinor',
        'allocations'
      ] <> '{}'::jsonb
      or not (payment_payload ?& array['id', 'method', 'amountMinor', 'allocations'])
      or jsonb_typeof(payment_payload -> 'allocations') is distinct from 'array'
      or jsonb_array_length(payment_payload -> 'allocations') not between 1 and 100 then
      raise exception using errcode = '22023', message = 'invalid_payment_entry';
    end if;

    requested_payment_id := (payment_payload ->> 'id')::uuid;
    payment_method := payment_payload ->> 'method';
    payment_amount_minor := (payment_payload ->> 'amountMinor')::bigint;
    if payment_method not in ('cash', 'card') or payment_amount_minor <= 0 then
      raise exception using errcode = '22023', message = 'invalid_payment_tender';
    end if;
    if payment_method = 'cash' then
      if not (payment_payload ? 'tenderedMinor') then
        raise exception using errcode = '22023', message = 'cash_tender_required';
      end if;
      payment_tendered_minor := (payment_payload ->> 'tenderedMinor')::bigint;
      if payment_tendered_minor < payment_amount_minor then
        raise exception using errcode = '22023', message = 'cash_tender_too_low';
      end if;
    else
      payment_tendered_minor := coalesce(
        (payment_payload ->> 'tenderedMinor')::bigint,
        payment_amount_minor
      );
      if payment_tendered_minor <> payment_amount_minor then
        raise exception using errcode = '22023', message = 'card_tender_mismatch';
      end if;
    end if;

    select coalesce(sum((allocation ->> 'amountMinor')::bigint), 0)
    into payment_allocation_total
    from jsonb_array_elements(payment_payload -> 'allocations') as allocation;
    if payment_allocation_total <> payment_amount_minor then
      raise exception using errcode = '22023', message = 'payment_allocation_total_mismatch';
    end if;

    requested_total_minor := requested_total_minor + payment_amount_minor;
    if requested_total_minor > check_total_minor - confirmed_paid_minor then
      raise exception using errcode = '22023', message = 'payment_exceeds_remaining';
    end if;

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
      created_at,
      confirmed_at,
      idempotency_key,
      device_id
    )
    values (
      requested_payment_id,
      requested_organization_id,
      requested_branch_id,
      prior_check.table_session_id,
      payment_method,
      'confirmed',
      payment_amount_minor,
      payment_tendered_minor,
      case
        when payment_method = 'cash' then payment_tendered_minor - payment_amount_minor
        else 0
      end,
      canonical_currency_code,
      caller_user_id,
      now(),
      now(),
      concat(requested_client_mutation_id::text, ':', requested_payment_id::text),
      requested_device_id
    );

    for allocation_payload in
      select value from jsonb_array_elements(payment_payload -> 'allocations')
    loop
      if jsonb_typeof(allocation_payload) is distinct from 'object'
        or allocation_payload - array[
          'id',
          'orderItemId',
          'quantity',
          'amountMinor'
        ] <> '{}'::jsonb
        or not (allocation_payload ?& array['id', 'amountMinor']) then
        raise exception using errcode = '22023', message = 'invalid_payment_allocation';
      end if;
      requested_allocation_id := (allocation_payload ->> 'id')::uuid;
      allocation_amount_minor := (allocation_payload ->> 'amountMinor')::bigint;
      if allocation_amount_minor <= 0 then
        raise exception using errcode = '22023', message = 'invalid_allocation_amount';
      end if;
      allocation_quantity := case
        when allocation_payload ? 'quantity'
          then (allocation_payload ->> 'quantity')::numeric
        else null
      end;
      if allocation_quantity is not null and allocation_quantity <= 0 then
        raise exception using errcode = '22023', message = 'invalid_allocation_quantity';
      end if;
      if allocation_quantity is not null and not (allocation_payload ? 'orderItemId') then
        raise exception using errcode = '22023', message = 'allocation_quantity_requires_item';
      end if;

      if allocation_payload ? 'orderItemId' then
        select item.*
        into target_item
        from public.order_items as item
        where item.organization_id = requested_organization_id
          and item.branch_id = requested_branch_id
          and item.id = (allocation_payload ->> 'orderItemId')::uuid
          and item.check_id = prior_check.id
          and item.status <> 'cancelled'
          and item.deleted_at is null;
        if target_item.id is null then
          raise exception using errcode = '22023', message = 'allocation_item_not_payable';
        end if;

        select
          (
            target_item.unit_price_minor
            + coalesce(sum(modifier.price_delta_minor * modifier.quantity), 0)
          ),
          (
            target_item.unit_price_minor
            + coalesce(sum(modifier.price_delta_minor * modifier.quantity), 0)
          ) * target_item.quantity
        into item_unit_total_numeric, item_total_numeric
        from public.order_item_modifiers as modifier
        where modifier.organization_id = requested_organization_id
          and modifier.branch_id = requested_branch_id
          and modifier.order_item_id = target_item.id;
        if trunc(item_total_numeric) <> item_total_numeric then
          raise exception using errcode = '22023', message = 'invalid_payable_item_total';
        end if;
        item_total_minor := item_total_numeric::bigint;

        select
          coalesce(sum(allocation.amount_minor), 0),
          coalesce(sum(allocation.quantity), 0)
        into item_paid_minor, item_paid_quantity
        from public.payment_allocations as allocation
        join public.payments as payment
          on payment.organization_id = allocation.organization_id
         and payment.branch_id = allocation.branch_id
         and payment.id = allocation.payment_id
        where allocation.organization_id = requested_organization_id
          and allocation.branch_id = requested_branch_id
          and allocation.order_item_id = target_item.id
          and payment.status = 'confirmed';

        if item_paid_minor + allocation_amount_minor > item_total_minor then
          raise exception using errcode = '22023', message = 'allocation_exceeds_item_amount';
        end if;
        if allocation_quantity is not null then
          if item_paid_quantity + allocation_quantity > target_item.quantity then
            raise exception using errcode = '22023', message = 'allocation_exceeds_item_quantity';
          end if;
          if item_unit_total_numeric * allocation_quantity <> allocation_amount_minor then
            raise exception using errcode = '22023', message = 'allocation_quantity_amount_mismatch';
          end if;
        end if;
      end if;

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
        requested_allocation_id,
        requested_organization_id,
        requested_branch_id,
        requested_payment_id,
        prior_check.id,
        case
          when allocation_payload ? 'orderItemId'
            then (allocation_payload ->> 'orderItemId')::uuid
          else null
        end,
        allocation_quantity,
        allocation_amount_minor
      );
    end loop;

    payment_ids := payment_ids || jsonb_build_array(requested_payment_id);
  end loop;

  final_paid_minor := confirmed_paid_minor + requested_total_minor;
  update public.checks
  set status = case
        when final_paid_minor = check_total_minor then 'paid'
        else 'partially_paid'
      end,
      closed_at = case
        when final_paid_minor = check_total_minor then now()
        else null
      end,
      updated_at = now(),
      version = prior_check.version + 1
  where id = prior_check.id
  returning * into canonical_check;

  update public.table_sessions
  set status = 'payment_pending',
      updated_at = now(),
      version = target_session.version + 1
  where id = target_session.id;

  insert into public.session_participants (
    organization_id,
    branch_id,
    table_session_id,
    user_id,
    first_action_at,
    last_action_at
  )
  values (
    requested_organization_id,
    requested_branch_id,
    target_session.id,
    caller_user_id,
    now(),
    now()
  )
  on conflict (table_session_id, user_id) do update
  set last_action_at = excluded.last_action_at;

  mutation_result := jsonb_build_object(
    'status', 'confirmed',
    'checkId', canonical_check.id,
    'checkStatus', canonical_check.status,
    'checkVersion', canonical_check.version,
    'totalMinor', check_total_minor,
    'paidMinor', final_paid_minor,
    'remainingMinor', check_total_minor - final_paid_minor,
    'paymentIds', payment_ids
  );

  insert into public.audit_events (
    organization_id,
    branch_id,
    actor_user_id,
    device_id,
    entity_type,
    entity_id,
    action,
    before_json,
    after_json,
    client_mutation_id,
    correlation_id
  )
  values (
    requested_organization_id,
    requested_branch_id,
    caller_user_id,
    requested_device_id,
    'checks',
    canonical_check.id,
    'checks.confirm_payments',
    to_jsonb(prior_check),
    jsonb_build_object(
      'check', to_jsonb(canonical_check),
      'paymentIds', payment_ids,
      'totalMinor', check_total_minor,
      'paidMinor', final_paid_minor,
      'remainingMinor', check_total_minor - final_paid_minor
    ),
    requested_client_mutation_id,
    requested_client_mutation_id
  );

  update public.client_mutations
  set result_json = mutation_result,
      committed_at = now()
  where id = claimed_mutation_id;

  return mutation_result;
end;
$$;

revoke execute on function public.confirm_check_payments(
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb
) from public, anon;
grant execute on function public.confirm_check_payments(
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb
) to authenticated;
