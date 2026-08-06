-- İçeceklerin götürüldü işaretini kalıcı ve offline-idempotent bir komut olarak saklar.

create or replace function public.apply_order_item_served_command(
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
  mutation_result jsonb;
begin
  if caller_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if requested_payload is null
    or jsonb_typeof(requested_payload) is distinct from 'object'
    or requested_payload - array['served'] <> '{}'::jsonb
    or requested_payload ->> 'served' is distinct from 'true' then
    raise exception using errcode = '22023', message = 'invalid_order_item_served_payload';
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
    'order_items.mark_served',
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
    'order_items.mark_served',
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
  if prior_order_item.status = 'served' then
    mutation_result := jsonb_build_object(
      'status', 'applied',
      'repository', 'orderItems',
      'entityId', prior_order_item.id,
      'serverVersion', prior_order_item.version,
      'committedAt', now(),
      'alreadyServed', true
    );
  elsif prior_order_item.status <> 'ordered' then
    raise exception using errcode = '22023', message = 'order_item_is_not_ordered';
  else
    update public.order_items
    set status = 'served',
        updated_by = caller_user_id,
        updated_at = now(),
        version = prior_order_item.version + 1
    where id = prior_order_item.id
    returning * into canonical_order_item;

    mutation_result := jsonb_build_object(
      'status', 'applied',
      'repository', 'orderItems',
      'entityId', canonical_order_item.id,
      'serverVersion', canonical_order_item.version,
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
      'order_items.mark_served',
      to_jsonb(prior_order_item),
      to_jsonb(canonical_order_item),
      requested_client_mutation_id,
      requested_client_mutation_id
    );
  end if;

  update public.client_mutations
  set result_json = mutation_result,
      committed_at = now()
  where id = claimed_mutation_id;

  return mutation_result;
end;
$$;

revoke execute on function public.apply_order_item_served_command(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb,
  bigint
) from public, anon;
grant execute on function public.apply_order_item_served_command(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb,
  bigint
) to authenticated;
