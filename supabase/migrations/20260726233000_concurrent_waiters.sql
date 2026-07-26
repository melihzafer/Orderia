-- Concurrent waiter collaboration.
--
-- Order appends are reconciled onto the server's active table session instead
-- of rejecting a second offline device that opened its own provisional
-- session. Provisional rows are retained as explicit voided records so pull
-- sync can converge the originating device without silent deletion.

create or replace function public.apply_concurrent_order_batch(
  requested_organization_id uuid,
  requested_branch_id uuid,
  requested_device_id uuid,
  requested_client_mutation_id uuid,
  requested_entity_id uuid,
  requested_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_user_id uuid := (select auth.uid());
  target_table public.restaurant_tables;
  active_session public.table_sessions;
  matched_check public.checks;
  requested_session_id uuid;
  requested_check_id uuid;
  adjusted_payload jsonb := requested_payload;
  mutation_result jsonb;
  canonical_session_id uuid;
  canonical_check_id uuid;
begin
  if caller_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
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
  if requested_payload is null
    or jsonb_typeof(requested_payload) is distinct from 'object'
    or jsonb_typeof(requested_payload -> 'session') is distinct from 'object'
    or jsonb_typeof(requested_payload -> 'check') is distinct from 'object' then
    raise exception using errcode = '22023', message = 'invalid_order_payload_shape';
  end if;

  requested_session_id := (requested_payload #>> '{session,id}')::uuid;
  requested_check_id := (requested_payload #>> '{check,id}')::uuid;

  select restaurant_table.*
  into target_table
  from public.restaurant_tables as restaurant_table
  where restaurant_table.organization_id = requested_organization_id
    and restaurant_table.branch_id = requested_branch_id
    and restaurant_table.id = (requested_payload ->> 'tableId')::uuid
    and restaurant_table.deleted_at is null
  for update;
  if target_table.id is null then
    raise exception using errcode = '22023', message = 'table_not_found';
  end if;

  select session.*
  into active_session
  from public.table_sessions as session
  where session.organization_id = requested_organization_id
    and session.branch_id = requested_branch_id
    and session.table_id = target_table.id
    and session.status in ('open', 'payment_pending')
    and session.deleted_at is null
  order by session.opened_at desc
  limit 1;

  if active_session.id is not null and active_session.id <> requested_session_id then
    insert into public.table_sessions (
      id,
      organization_id,
      branch_id,
      table_id,
      status,
      opened_by,
      opened_at,
      closed_by,
      closed_at,
      note,
      version
    )
    values (
      requested_session_id,
      requested_organization_id,
      requested_branch_id,
      target_table.id,
      'voided',
      caller_user_id,
      (requested_payload #>> '{session,openedAt}')::timestamptz,
      caller_user_id,
      now(),
      'Reconciled to an already active table session',
      1
    )
    on conflict (id) do nothing;

    adjusted_payload := jsonb_set(
      adjusted_payload,
      '{session,id}',
      to_jsonb(active_session.id)
    );
    adjusted_payload := jsonb_set(
      adjusted_payload,
      '{session,openedAt}',
      to_jsonb(active_session.opened_at)
    );

    select check_row.*
    into matched_check
    from public.checks as check_row
    where check_row.organization_id = requested_organization_id
      and check_row.branch_id = requested_branch_id
      and check_row.table_session_id = active_session.id
      and check_row.status in ('open', 'partially_paid')
      and check_row.deleted_at is null
      and lower(trim(check_row.name)) =
        lower(trim(requested_payload #>> '{check,name}'))
    order by check_row.opened_at
    limit 1;

    if matched_check.id is not null and matched_check.id <> requested_check_id then
      insert into public.checks (
        id,
        organization_id,
        branch_id,
        table_session_id,
        name,
        status,
        opened_by,
        opened_at,
        closed_at,
        version
      )
      values (
        requested_check_id,
        requested_organization_id,
        requested_branch_id,
        requested_session_id,
        trim(requested_payload #>> '{check,name}'),
        'voided',
        caller_user_id,
        (requested_payload #>> '{check,openedAt}')::timestamptz,
        now(),
        1
      )
      on conflict (id) do nothing;

      adjusted_payload := jsonb_set(
        adjusted_payload,
        '{check,id}',
        to_jsonb(matched_check.id)
      );
      adjusted_payload := jsonb_set(
        adjusted_payload,
        '{check,name}',
        to_jsonb(matched_check.name)
      );
      adjusted_payload := jsonb_set(
        adjusted_payload,
        '{check,openedAt}',
        to_jsonb(matched_check.opened_at)
      );
    end if;
  end if;

  mutation_result := public.apply_client_mutation(
    requested_organization_id,
    requested_branch_id,
    requested_device_id,
    requested_client_mutation_id,
    'orders.send_batch',
    requested_entity_id,
    adjusted_payload,
    null
  );
  canonical_session_id := (mutation_result ->> 'sessionId')::uuid;
  canonical_check_id := (mutation_result ->> 'checkId')::uuid;

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
    canonical_session_id,
    caller_user_id,
    now(),
    now()
  )
  on conflict (table_session_id, user_id) do update
  set last_action_at = excluded.last_action_at;

  return mutation_result || jsonb_build_object(
    'requestedSessionId', requested_session_id,
    'canonicalSessionId', canonical_session_id,
    'requestedCheckId', requested_check_id,
    'canonicalCheckId', canonical_check_id
  );
end;
$$;

create or replace function public.apply_order_item_note_command(
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
  if requested_payload is null or jsonb_typeof(requested_payload) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'mutation_payload_must_be_an_object';
  end if;
  if requested_payload - array['note'] <> '{}'::jsonb
    or not (requested_payload ? 'note')
    or jsonb_typeof(requested_payload -> 'note') not in ('string', 'null') then
    raise exception using errcode = '22023', message = 'invalid_order_note_payload';
  end if;
  if char_length(coalesce(requested_payload ->> 'note', '')) > 500 then
    raise exception using errcode = '22023', message = 'order_note_too_long';
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
    'order_items.update_note',
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
    'order_items.update_note',
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
    raise exception using errcode = '22023', message = 'cancelled_item_note_is_immutable';
  end if;

  update public.order_items
  set note = nullif(trim(requested_payload ->> 'note'), ''),
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
    'order_items.update_note',
    to_jsonb(prior_order_item),
    to_jsonb(canonical_order_item),
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

create or replace function public.list_active_session_participants(
  requested_organization_id uuid,
  requested_branch_id uuid,
  requested_table_session_id uuid,
  active_since timestamptz default (now() - interval '15 minutes')
)
returns table (
  user_id uuid,
  display_name text,
  first_action_at timestamptz,
  last_action_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not private.is_active_member(requested_organization_id, requested_branch_id) then
    raise exception using errcode = '42501', message = 'branch_access_denied';
  end if;

  return query
  select
    participant.user_id,
    profile.display_name,
    participant.first_action_at,
    participant.last_action_at
  from public.session_participants as participant
  join public.profiles as profile on profile.id = participant.user_id
  where participant.organization_id = requested_organization_id
    and participant.branch_id = requested_branch_id
    and participant.table_session_id = requested_table_session_id
    and participant.last_action_at >= active_since
  order by participant.last_action_at desc;
end;
$$;

revoke execute on function public.apply_concurrent_order_batch(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb
) from public, anon;
grant execute on function public.apply_concurrent_order_batch(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb
) to authenticated;

revoke execute on function public.apply_order_item_note_command(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb,
  bigint
) from public, anon;
grant execute on function public.apply_order_item_note_command(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb,
  bigint
) to authenticated;

revoke execute on function public.list_active_session_participants(
  uuid,
  uuid,
  uuid,
  timestamptz
) from public, anon;
grant execute on function public.list_active_session_participants(
  uuid,
  uuid,
  uuid,
  timestamptz
) to authenticated;
