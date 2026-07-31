-- Adisyon bölme: bir adisyondaki kalemleri (ya da kalemin bir kısmını) aynı
-- masa oturumundaki başka bir adisyona taşır. Garsonun "bu bira Ali'nin, şu
-- kola Ayşe'nin" akışının sunucu tarafı.
--
-- apply_order_item_quantity_command deseni birebir korunur:
-- idempotent client_mutations + base_version kontrolü + audit_events.
--
-- Taşınan kalem her zaman hedef adisyonun kendi partisine bağlanır; çünkü
-- order_items -> order_batches bileşik yabancı anahtarı check_id içerir.

create or replace function public.apply_check_split_command(
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
  prior_source_check public.checks;
  canonical_source_check public.checks;
  canonical_target_check public.checks;
  prior_order_item public.order_items;
  canonical_order_item public.order_items;
  target_check_id uuid;
  target_check_name text;
  target_check_is_new boolean;
  target_batch_id uuid;
  move_entry jsonb;
  modifier_entry jsonb;
  move_quantity numeric(12, 3);
  move_mode text;
  new_item_id uuid;
  moved_item_count int := 0;
  mutation_result jsonb;
begin
  if caller_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if requested_payload is null or jsonb_typeof(requested_payload) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'mutation_payload_must_be_an_object';
  end if;
  if requested_payload ->> 'kind' is distinct from 'split' then
    raise exception using errcode = '22023', message = 'invalid_check_split_payload';
  end if;
  if (requested_payload ->> 'sourceCheckId')::uuid is distinct from requested_entity_id then
    raise exception using errcode = '22023', message = 'check_split_entity_mismatch';
  end if;
  if jsonb_typeof(requested_payload -> 'moves') is distinct from 'array'
    or jsonb_array_length(requested_payload -> 'moves') = 0 then
    raise exception using errcode = '22023', message = 'check_split_requires_moves';
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

  fingerprint := md5(concat_ws(
    ':',
    requested_organization_id::text,
    requested_branch_id::text,
    requested_device_id::text,
    requested_client_mutation_id::text,
    'checks.split',
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
    'checks.split',
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

  select source_check.*
  into prior_source_check
  from public.checks as source_check
  where source_check.organization_id = requested_organization_id
    and source_check.branch_id = requested_branch_id
    and source_check.id = requested_entity_id
    and source_check.deleted_at is null
  for update;
  if prior_source_check.id is null then
    raise exception using errcode = '22023', message = 'check_not_found';
  end if;
  if prior_source_check.version <> requested_base_version then
    raise exception using
      errcode = 'P0001',
      message = 'version_conflict',
      detail = jsonb_build_object(
        'serverVersion', prior_source_check.version,
        'serverPayload', to_jsonb(prior_source_check)
      )::text;
  end if;
  if prior_source_check.status not in ('open', 'partially_paid') then
    raise exception using errcode = '22023', message = 'settled_check_cannot_be_split';
  end if;

  target_check_id := (requested_payload -> 'targetCheck' ->> 'id')::uuid;
  target_check_name := trim(requested_payload -> 'targetCheck' ->> 'name');
  target_check_is_new := coalesce(
    (requested_payload -> 'targetCheck' ->> 'isNew')::boolean,
    false
  );
  if target_check_id is null or target_check_id = prior_source_check.id then
    raise exception using errcode = '22023', message = 'invalid_check_split_target';
  end if;
  if target_check_name is null or char_length(target_check_name) = 0 then
    raise exception using errcode = '22023', message = 'check_split_target_name_required';
  end if;

  if target_check_is_new then
    insert into public.checks (
      id,
      organization_id,
      branch_id,
      table_session_id,
      name,
      status,
      opened_by,
      opened_at
    )
    values (
      target_check_id,
      requested_organization_id,
      requested_branch_id,
      prior_source_check.table_session_id,
      target_check_name,
      'open',
      caller_user_id,
      coalesce(
        (requested_payload -> 'targetCheck' ->> 'openedAt')::timestamptz,
        now()
      )
    )
    on conflict (id) do nothing;
  end if;

  select target_check.*
  into canonical_target_check
  from public.checks as target_check
  where target_check.organization_id = requested_organization_id
    and target_check.branch_id = requested_branch_id
    and target_check.id = target_check_id
    and target_check.deleted_at is null
  for update;
  if canonical_target_check.id is null then
    raise exception using errcode = '22023', message = 'check_split_target_not_found';
  end if;
  if canonical_target_check.table_session_id <> prior_source_check.table_session_id then
    raise exception using errcode = '22023', message = 'check_split_target_other_session';
  end if;
  if canonical_target_check.status not in ('open', 'partially_paid') then
    raise exception using errcode = '22023', message = 'settled_check_cannot_receive_items';
  end if;

  target_batch_id := (requested_payload -> 'batch' ->> 'id')::uuid;
  if target_batch_id is null then
    raise exception using errcode = '22023', message = 'check_split_requires_batch';
  end if;
  insert into public.order_batches (
    id,
    organization_id,
    branch_id,
    table_session_id,
    check_id,
    created_by,
    created_at,
    client_mutation_id
  )
  values (
    target_batch_id,
    requested_organization_id,
    requested_branch_id,
    prior_source_check.table_session_id,
    canonical_target_check.id,
    caller_user_id,
    coalesce((requested_payload -> 'batch' ->> 'createdAt')::timestamptz, now()),
    requested_client_mutation_id
  )
  on conflict (id) do nothing;

  for move_entry in select value from jsonb_array_elements(requested_payload -> 'moves')
  loop
    select order_item.*
    into prior_order_item
    from public.order_items as order_item
    where order_item.organization_id = requested_organization_id
      and order_item.branch_id = requested_branch_id
      and order_item.id = (move_entry ->> 'sourceItemId')::uuid
      and order_item.deleted_at is null
    for update;
    if prior_order_item.id is null then
      raise exception using errcode = '22023', message = 'order_item_not_found';
    end if;
    if prior_order_item.check_id <> prior_source_check.id then
      raise exception using errcode = '22023', message = 'order_item_not_in_source_check';
    end if;
    if prior_order_item.version <> (move_entry ->> 'expectedVersion')::bigint then
      raise exception using
        errcode = 'P0001',
        message = 'version_conflict',
        detail = jsonb_build_object(
          'serverVersion', prior_order_item.version,
          'serverPayload', to_jsonb(prior_order_item)
        )::text;
    end if;
    if prior_order_item.status = 'cancelled' then
      raise exception using errcode = '22023', message = 'cancelled_item_cannot_be_moved';
    end if;
    -- Ödemesi onaylanmış kalem taşınmaz; fiş izi kopmasın.
    if exists (
      select 1
      from public.payment_allocations as allocation
      join public.payments as payment on payment.id = allocation.payment_id
      where allocation.order_item_id = prior_order_item.id
        and payment.status = 'confirmed'
    ) then
      raise exception using errcode = '22023', message = 'paid_item_cannot_be_moved';
    end if;

    move_quantity := (move_entry ->> 'quantity')::numeric;
    move_mode := move_entry ->> 'mode';
    if move_quantity <= 0 or move_quantity > prior_order_item.quantity then
      raise exception using errcode = '22023', message = 'check_split_quantity_out_of_range';
    end if;

    if move_mode = 'move' then
      if move_quantity <> prior_order_item.quantity then
        raise exception using errcode = '22023', message = 'check_split_mode_mismatch';
      end if;
      update public.order_items
      set check_id = canonical_target_check.id,
          order_batch_id = target_batch_id,
          updated_by = caller_user_id,
          updated_at = now(),
          version = prior_order_item.version + 1
      where id = prior_order_item.id
      returning * into canonical_order_item;
    elsif move_mode = 'split' then
      new_item_id := (move_entry ->> 'newItemId')::uuid;
      if new_item_id is null then
        raise exception using errcode = '22023', message = 'check_split_requires_new_item_id';
      end if;
      if move_quantity >= prior_order_item.quantity then
        raise exception using errcode = '22023', message = 'check_split_mode_mismatch';
      end if;

      update public.order_items
      set quantity = prior_order_item.quantity - move_quantity,
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
        original_table_id,
        original_table_session_id
      )
      values (
        new_item_id,
        requested_organization_id,
        requested_branch_id,
        prior_order_item.table_session_id,
        canonical_target_check.id,
        target_batch_id,
        prior_order_item.menu_item_id,
        prior_order_item.name_snapshot,
        prior_order_item.category_id_snapshot,
        prior_order_item.category_name_snapshot,
        prior_order_item.unit_price_minor,
        prior_order_item.currency_code,
        prior_order_item.tax_rate_basis_points,
        move_quantity,
        prior_order_item.status,
        prior_order_item.note,
        prior_order_item.created_by,
        caller_user_id,
        prior_order_item.original_table_id,
        prior_order_item.original_table_session_id
      )
      on conflict (id) do nothing;

      for modifier_entry in
        select value from jsonb_array_elements(coalesce(move_entry -> 'modifiers', '[]'::jsonb))
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
          new_item_id,
          source_modifier.modifier_group_name_snapshot,
          source_modifier.modifier_option_name_snapshot,
          source_modifier.price_delta_minor,
          source_modifier.quantity
        from public.order_item_modifiers as source_modifier
        where source_modifier.id = (modifier_entry ->> 'sourceModifierId')::uuid
          and source_modifier.order_item_id = prior_order_item.id
        on conflict (id) do nothing;
      end loop;
    else
      raise exception using errcode = '22023', message = 'invalid_check_split_mode';
    end if;

    moved_item_count := moved_item_count + 1;

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
      prior_order_item.id,
      'order_items.split_to_check',
      to_jsonb(prior_order_item),
      to_jsonb(canonical_order_item)
        || jsonb_build_object('targetCheckId', canonical_target_check.id),
      requested_client_mutation_id,
      requested_client_mutation_id
    );
  end loop;

  update public.checks
  set updated_at = now(),
      version = prior_source_check.version + 1
  where id = prior_source_check.id
  returning * into canonical_source_check;

  update public.checks
  set updated_at = now(),
      version = canonical_target_check.version + 1
  where id = canonical_target_check.id
  returning * into canonical_target_check;

  mutation_result := jsonb_build_object(
    'status', 'applied',
    'repository', 'checks',
    'entityId', canonical_source_check.id,
    'serverVersion', canonical_source_check.version,
    'targetCheckId', canonical_target_check.id,
    'targetCheckVersion', canonical_target_check.version,
    'movedItemCount', moved_item_count,
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
    'checks',
    canonical_source_check.id,
    'checks.split',
    to_jsonb(prior_source_check),
    to_jsonb(canonical_source_check)
      || jsonb_build_object(
        'targetCheckId', canonical_target_check.id,
        'movedItemCount', moved_item_count
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

revoke execute on function public.apply_check_split_command(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb,
  bigint
) from public, anon;
grant execute on function public.apply_check_split_command(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb,
  bigint
) to authenticated;
