-- A location note belongs to the active table session, not to a product line.
-- Keep it offline-capable and auditable through the same idempotent command path.
create or replace function public.apply_table_session_note_command(
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
  prior_session public.table_sessions;
  canonical_session public.table_sessions;
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
    raise exception using errcode = '22023', message = 'invalid_table_session_note_payload';
  end if;
  if char_length(coalesce(requested_payload ->> 'note', '')) > 500 then
    raise exception using errcode = '22023', message = 'table_session_note_too_long';
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
    'table_sessions.update_note',
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
    'table_sessions.update_note',
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

  select session.*
  into prior_session
  from public.table_sessions as session
  where session.organization_id = requested_organization_id
    and session.branch_id = requested_branch_id
    and session.id = requested_entity_id
    and session.deleted_at is null
  for update;
  if prior_session.id is null then
    raise exception using errcode = '22023', message = 'table_session_not_found';
  end if;
  if prior_session.version <> requested_base_version then
    raise exception using
      errcode = 'P0001',
      message = 'version_conflict',
      detail = jsonb_build_object(
        'serverVersion', prior_session.version,
        'serverPayload', to_jsonb(prior_session)
      )::text;
  end if;
  if prior_session.status not in ('open', 'payment_pending') then
    raise exception using errcode = '22023', message = 'table_session_not_active';
  end if;

  update public.table_sessions
  set note = nullif(trim(requested_payload ->> 'note'), ''),
      updated_at = now(),
      version = prior_session.version + 1
  where id = prior_session.id
  returning * into canonical_session;

  mutation_result := jsonb_build_object(
    'status', 'applied',
    'repository', 'tableSessions',
    'entityId', canonical_session.id,
    'serverVersion', canonical_session.version,
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
    'table_sessions',
    canonical_session.id,
    'table_sessions.update_note',
    to_jsonb(prior_session),
    to_jsonb(canonical_session),
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

revoke execute on function public.apply_table_session_note_command(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb,
  bigint
) from public, anon;
grant execute on function public.apply_table_session_note_command(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb,
  bigint
) to authenticated;
