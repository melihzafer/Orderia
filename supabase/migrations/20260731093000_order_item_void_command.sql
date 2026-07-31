-- Kısmi iptal: "3 bira gelmiş, 1'i fazla, kimse içmemiş" durumu.
-- Satırın adedi sessizce azaltılmaz; taşınan adet gerekçesiyle birlikte ayrı
-- bir iptal satırı olarak bırakılır, böylece adisyon, rapor ve fiş aynı
-- hikâyeyi anlatır.
--
-- apply_order_item_quantity_command deseni birebir korunur.

create or replace function public.apply_order_item_void_command(
  requested_organization_id uuid,
  requested_branch_id uuid,
  requested_device_id uuid,
  requested_client_mutation_id uuid,
  requested_entity_id uuid,
  requested_payload jsonb,
  requested_base_version bigint
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
  prior_order_item public.order_items;
  canonical_order_item public.order_items;
  voided_order_item public.order_items;
  modifier_entry jsonb;
  void_quantity numeric(12, 3);
  reason_id uuid;
  voided_item_id uuid;
  mutation_result jsonb;
begin
  if caller_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if requested_payload is null or jsonb_typeof(requested_payload) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'mutation_payload_must_be_an_object';
  end if;
  if not (requested_payload ? 'voidQuantity')
    or jsonb_typeof(requested_payload -> 'voidQuantity') is distinct from 'number'
    or not (requested_payload ? 'reasonId') then
    raise exception using errcode = '22023', message = 'invalid_order_void_payload';
  end if;
  if requested_base_version is null or requested_base_version < 1 then
    raise exception using errcode = '22023', message = 'base_version_required';
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

  void_quantity := (requested_payload ->> 'voidQuantity')::numeric;
  reason_id := (requested_payload ->> 'reasonId')::uuid;
  voided_item_id := (requested_payload ->> 'voidedItemId')::uuid;
  if void_quantity <= 0 then
    raise exception using errcode = '22023', message = 'order_void_quantity_out_of_range';
  end if;

  fingerprint := md5(concat_ws(
    ':',
    requested_organization_id::text,
    requested_branch_id::text,
    requested_device_id::text,
    requested_client_mutation_id::text,
    'order_items.void_quantity',
    requested_entity_id::text,
    requested_payload::text,
    requested_base_version::text
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
    'order_items.void_quantity',
    requested_entity_id,
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

  select order_item.*
  into prior_order_item
  from public.order_items as order_item
  where order_item.organization_id = requested_organization_id
    and order_item.branch_id = requested_branch_id
    and order_item.id = requested_entity_id
    and order_item.deleted_at is null
  for update;
  if prior_order_item.id is null then
    raise exception using errcode = '22023', message = 'order_item_not_found';
  end if;
  if prior_order_item.version <> requested_base_version then
    raise exception using
      errcode = 'P0001',
      message = 'version_conflict',
      detail = jsonb_build_object(
        'serverVersion', prior_order_item.version,
        'serverPayload', to_jsonb(prior_order_item)
      )::text;
  end if;
  if prior_order_item.status = 'cancelled' then
    raise exception using errcode = '22023', message = 'cancelled_item_is_immutable';
  end if;
  if void_quantity > prior_order_item.quantity then
    raise exception using errcode = '22023', message = 'order_void_quantity_out_of_range';
  end if;
  if exists (
    select 1
    from public.payment_allocations as allocation
    join public.payments as payment on payment.id = allocation.payment_id
    where allocation.order_item_id = prior_order_item.id
      and payment.status = 'confirmed'
  ) then
    raise exception using errcode = '22023', message = 'paid_item_cannot_be_voided';
  end if;
  if not exists (
    select 1
    from public.cancellation_reasons as reason
    where reason.id = reason_id
      and reason.organization_id = requested_organization_id
      and reason.branch_id = requested_branch_id
      and reason.is_active
      and reason.deleted_at is null
  ) then
    raise exception using errcode = '22023', message = 'cancellation_reason_not_found';
  end if;

  if void_quantity = prior_order_item.quantity then
    update public.order_items
    set status = 'cancelled',
        cancelled_by = caller_user_id,
        cancelled_at = now(),
        cancellation_reason_id = reason_id,
        updated_by = caller_user_id,
        updated_at = now(),
        version = prior_order_item.version + 1
    where id = prior_order_item.id
    returning * into canonical_order_item;
  else
    if voided_item_id is null then
      raise exception using errcode = '22023', message = 'order_void_requires_voided_item_id';
    end if;

    update public.order_items
    set quantity = prior_order_item.quantity - void_quantity,
        updated_by = caller_user_id,
        updated_at = now(),
        version = prior_order_item.version + 1
    where id = prior_order_item.id
    returning * into canonical_order_item;

    insert into public.order_items (
      id,
      organization_id,
      branch_id,
      table_session_id,
      check_id,
      order_batch_id,
      menu_item_id,
      name_snapshot,
      category_id_snapshot,
      category_name_snapshot,
      unit_price_minor,
      currency_code,
      tax_rate_basis_points,
      quantity,
      status,
      note,
      created_by,
      updated_by,
      cancelled_by,
      cancelled_at,
      cancellation_reason_id,
      original_table_id,
      original_table_session_id
    )
    values (
      voided_item_id,
      requested_organization_id,
      requested_branch_id,
      prior_order_item.table_session_id,
      prior_order_item.check_id,
      prior_order_item.order_batch_id,
      prior_order_item.menu_item_id,
      prior_order_item.name_snapshot,
      prior_order_item.category_id_snapshot,
      prior_order_item.category_name_snapshot,
      prior_order_item.unit_price_minor,
      prior_order_item.currency_code,
      prior_order_item.tax_rate_basis_points,
      void_quantity,
      'cancelled',
      prior_order_item.note,
      prior_order_item.created_by,
      caller_user_id,
      caller_user_id,
      now(),
      reason_id,
      prior_order_item.original_table_id,
      prior_order_item.original_table_session_id
    )
    on conflict (id) do nothing
    returning * into voided_order_item;

    for modifier_entry in
      select value from jsonb_array_elements(coalesce(requested_payload -> 'modifiers', '[]'::jsonb))
    loop
      insert into public.order_item_modifiers (
        id,
        organization_id,
        branch_id,
        order_item_id,
        modifier_group_name_snapshot,
        modifier_option_name_snapshot,
        price_delta_minor,
        quantity
      )
      select
        (modifier_entry ->> 'id')::uuid,
        requested_organization_id,
        requested_branch_id,
        voided_item_id,
        source_modifier.modifier_group_name_snapshot,
        source_modifier.modifier_option_name_snapshot,
        source_modifier.price_delta_minor,
        source_modifier.quantity
      from public.order_item_modifiers as source_modifier
      where source_modifier.id = (modifier_entry ->> 'sourceModifierId')::uuid
        and source_modifier.order_item_id = prior_order_item.id
      on conflict (id) do nothing;
    end loop;
  end if;

  mutation_result := jsonb_build_object(
    'status', 'applied',
    'repository', 'orderItems',
    'entityId', canonical_order_item.id,
    'serverVersion', canonical_order_item.version,
    'voidedQuantity', void_quantity,
    'voidedItemId', voided_item_id,
    'committedAt', now()
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
    'order_items',
    canonical_order_item.id,
    'order_items.void_quantity',
    to_jsonb(prior_order_item),
    to_jsonb(canonical_order_item)
      || jsonb_build_object(
        'voidedQuantity', void_quantity,
        'voidedItem', to_jsonb(voided_order_item)
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

revoke execute on function public.apply_order_item_void_command(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb,
  bigint
) from public, anon;
grant execute on function public.apply_order_item_void_command(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb,
  bigint
) to authenticated;
