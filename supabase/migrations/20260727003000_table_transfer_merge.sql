-- Atomic table transfer and merge.
--
-- Composite foreign keys are made explicitly deferrable so a complete session
-- graph can move to another active session inside one transaction. They remain
-- immediate by default everywhere else.

alter table public.order_batches
  alter constraint order_batches_check_scope_fkey
  deferrable initially immediate;
alter table public.order_items
  alter constraint order_items_batch_scope_fkey
  deferrable initially immediate;

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
  caller_user_id uuid := (select auth.uid());
  fingerprint text;
  claimed_mutation_id uuid;
  prior_mutation public.client_mutations;
  source_table public.restaurant_tables;
  target_table public.restaurant_tables;
  source_session public.table_sessions;
  target_session public.table_sessions;
  canonical_session public.table_sessions;
  requested_source_session_id uuid;
  requested_target_table_id uuid;
  expected_source_version bigint;
  expected_target_version bigint;
  operation_mode text;
  moved_check_count bigint := 0;
  mutation_result jsonb;
begin
  if caller_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if requested_payload is null
    or jsonb_typeof(requested_payload) is distinct from 'object'
    or requested_payload - array[
      'sourceSessionId',
      'targetTableId',
      'expectedSourceVersion',
      'expectedTargetVersion'
    ] <> '{}'::jsonb
    or not (requested_payload ?& array[
      'sourceSessionId',
      'targetTableId',
      'expectedSourceVersion',
      'expectedTargetVersion'
    ]) then
    raise exception using errcode = '22023', message = 'invalid_table_transfer_payload';
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

  requested_source_session_id := (requested_payload ->> 'sourceSessionId')::uuid;
  requested_target_table_id := (requested_payload ->> 'targetTableId')::uuid;
  expected_source_version := (requested_payload ->> 'expectedSourceVersion')::bigint;
  expected_target_version := (requested_payload ->> 'expectedTargetVersion')::bigint;
  if expected_source_version is null or expected_source_version < 1 then
    raise exception using errcode = '22023', message = 'invalid_source_session_version';
  end if;

  fingerprint := md5(concat_ws(
    ':',
    requested_organization_id::text,
    requested_branch_id::text,
    requested_device_id::text,
    requested_client_mutation_id::text,
    'table_sessions.transfer_or_merge',
    requested_source_session_id::text,
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
    'table_sessions.transfer_or_merge',
    requested_source_session_id,
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

  select session.*
  into source_session
  from public.table_sessions as session
  where session.organization_id = requested_organization_id
    and session.branch_id = requested_branch_id
    and session.id = requested_source_session_id
    and session.status in ('open', 'payment_pending')
    and session.deleted_at is null;
  if source_session.id is null then
    raise exception using errcode = '22023', message = 'source_session_not_active';
  end if;
  if source_session.table_id = requested_target_table_id then
    raise exception using errcode = '22023', message = 'source_and_target_table_match';
  end if;

  perform 1
  from public.restaurant_tables as restaurant_table
  where restaurant_table.organization_id = requested_organization_id
    and restaurant_table.branch_id = requested_branch_id
    and restaurant_table.id in (source_session.table_id, requested_target_table_id)
    and restaurant_table.deleted_at is null
  order by restaurant_table.id
  for update;

  select restaurant_table.*
  into source_table
  from public.restaurant_tables as restaurant_table
  where restaurant_table.organization_id = requested_organization_id
    and restaurant_table.branch_id = requested_branch_id
    and restaurant_table.id = source_session.table_id
    and restaurant_table.deleted_at is null;
  select restaurant_table.*
  into target_table
  from public.restaurant_tables as restaurant_table
  where restaurant_table.organization_id = requested_organization_id
    and restaurant_table.branch_id = requested_branch_id
    and restaurant_table.id = requested_target_table_id
    and restaurant_table.deleted_at is null;
  if source_table.id is null or target_table.id is null then
    raise exception using errcode = '22023', message = 'transfer_table_not_found';
  end if;

  select session.*
  into target_session
  from public.table_sessions as session
  where session.organization_id = requested_organization_id
    and session.branch_id = requested_branch_id
    and session.table_id = target_table.id
    and session.status in ('open', 'payment_pending')
    and session.deleted_at is null
  order by session.opened_at desc
  limit 1;

  -- Payments lock check -> session. Match that order here to avoid a transfer
  -- deadlock while a waiter is confirming a payment.
  perform 1
  from public.checks as check_row
  where check_row.organization_id = requested_organization_id
    and check_row.branch_id = requested_branch_id
    and check_row.table_session_id in (
      source_session.id,
      coalesce(target_session.id, source_session.id)
    )
    and check_row.deleted_at is null
  order by check_row.id
  for update;

  perform 1
  from public.table_sessions as session
  where session.organization_id = requested_organization_id
    and session.branch_id = requested_branch_id
    and session.table_id in (source_table.id, target_table.id)
    and session.status in ('open', 'payment_pending')
    and session.deleted_at is null
  order by session.id
  for update;

  select session.*
  into source_session
  from public.table_sessions as session
  where session.organization_id = requested_organization_id
    and session.branch_id = requested_branch_id
    and session.id = requested_source_session_id
    and session.table_id = source_table.id
    and session.status in ('open', 'payment_pending')
    and session.deleted_at is null;
  if source_session.id is null then
    raise exception using errcode = 'P0001', message = 'source_session_changed';
  end if;
  if source_session.version <> expected_source_version then
    raise exception using
      errcode = 'P0001',
      message = 'source_session_version_conflict',
      detail = jsonb_build_object(
        'serverVersion', source_session.version,
        'serverPayload', to_jsonb(source_session)
      )::text;
  end if;

  select session.*
  into target_session
  from public.table_sessions as session
  where session.organization_id = requested_organization_id
    and session.branch_id = requested_branch_id
    and session.table_id = target_table.id
    and session.status in ('open', 'payment_pending')
    and session.deleted_at is null
  order by session.opened_at desc
  limit 1;

  select count(*)
  into moved_check_count
  from public.checks as check_row
  where check_row.organization_id = requested_organization_id
    and check_row.branch_id = requested_branch_id
    and check_row.table_session_id = source_session.id
    and check_row.status in ('open', 'partially_paid')
    and check_row.deleted_at is null;

  if target_session.id is null then
    if expected_target_version is not null then
      raise exception using errcode = 'P0001', message = 'target_session_changed';
    end if;
    update public.table_sessions
    set table_id = target_table.id,
        transferred_from_table_id = source_table.id,
        updated_at = now(),
        version = source_session.version + 1
    where id = source_session.id
    returning * into canonical_session;
    operation_mode := 'moved';
  else
    if expected_target_version is null or target_session.version <> expected_target_version then
      raise exception using
        errcode = 'P0001',
        message = 'target_session_version_conflict',
        detail = jsonb_build_object(
          'serverVersion', target_session.version,
          'serverPayload', to_jsonb(target_session)
        )::text;
    end if;

    set constraints
      public.order_batches_check_scope_fkey,
      public.order_items_batch_scope_fkey
    deferred;

    update public.checks
    set table_session_id = target_session.id,
        updated_at = now(),
        version = version + 1
    where organization_id = requested_organization_id
      and branch_id = requested_branch_id
      and table_session_id = source_session.id
      and status in ('open', 'partially_paid');
    update public.order_batches
    set table_session_id = target_session.id
    where organization_id = requested_organization_id
      and branch_id = requested_branch_id
      and table_session_id = source_session.id
      and check_id in (
        select check_row.id
        from public.checks as check_row
        where check_row.organization_id = requested_organization_id
          and check_row.branch_id = requested_branch_id
          and check_row.table_session_id = target_session.id
          and check_row.status in ('open', 'partially_paid')
      );

    update public.order_items
    set table_session_id = target_session.id,
        updated_at = now(),
        updated_by = caller_user_id,
        version = version + 1
    where organization_id = requested_organization_id
      and branch_id = requested_branch_id
      and table_session_id = source_session.id
      and check_id in (
        select check_row.id
        from public.checks as check_row
        where check_row.organization_id = requested_organization_id
          and check_row.branch_id = requested_branch_id
          and check_row.table_session_id = target_session.id
          and check_row.status in ('open', 'partially_paid')
      );

    update public.payments
    set table_session_id = target_session.id
    where organization_id = requested_organization_id
      and branch_id = requested_branch_id
      and table_session_id = source_session.id
      and exists (
        select 1
        from public.payment_allocations as allocation
        join public.checks as check_row
          on check_row.organization_id = allocation.organization_id
         and check_row.branch_id = allocation.branch_id
         and check_row.id = allocation.check_id
        where allocation.organization_id = requested_organization_id
          and allocation.branch_id = requested_branch_id
          and allocation.payment_id = public.payments.id
          and check_row.table_session_id = target_session.id
          and check_row.status in ('open', 'partially_paid')
      );

    insert into public.session_participants (
      organization_id,
      branch_id,
      table_session_id,
      user_id,
      first_action_at,
      last_action_at
    )
    select
      participant.organization_id,
      participant.branch_id,
      target_session.id,
      participant.user_id,
      participant.first_action_at,
      participant.last_action_at
    from public.session_participants as participant
    where participant.organization_id = requested_organization_id
      and participant.branch_id = requested_branch_id
      and participant.table_session_id = source_session.id
    on conflict (table_session_id, user_id) do update
    set first_action_at = least(
          public.session_participants.first_action_at,
          excluded.first_action_at
        ),
        last_action_at = greatest(
          public.session_participants.last_action_at,
          excluded.last_action_at
        );

    delete from public.session_participants
    where organization_id = requested_organization_id
      and branch_id = requested_branch_id
      and table_session_id = source_session.id;

    update public.table_sessions
    set status = 'voided',
        closed_by = caller_user_id,
        closed_at = now(),
        transferred_from_table_id = source_table.id,
        note = concat_ws(
          E'\n',
          nullif(trim(note), ''),
          concat('Merged into session ', target_session.id::text)
        ),
        updated_at = now(),
        version = source_session.version + 1
    where id = source_session.id;

    update public.table_sessions
    set status = case
          when status = 'payment_pending' or source_session.status = 'payment_pending'
            then 'payment_pending'
          else 'open'
        end,
        updated_at = now(),
        version = target_session.version + 1
    where id = target_session.id
    returning * into canonical_session;
    operation_mode := 'merged';
  end if;

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
    canonical_session.id,
    caller_user_id,
    now(),
    now()
  )
  on conflict (table_session_id, user_id) do update
  set last_action_at = excluded.last_action_at;

  mutation_result := jsonb_build_object(
    'status', 'applied',
    'mode', operation_mode,
    'sourceTableId', source_table.id,
    'targetTableId', target_table.id,
    'sourceSessionId', source_session.id,
    'canonicalSessionId', canonical_session.id,
    'canonicalSessionVersion', canonical_session.version,
    'movedCheckCount', moved_check_count
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
    'table_sessions',
    source_session.id,
    concat('table_sessions.', operation_mode),
    to_jsonb(source_session),
    mutation_result,
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
