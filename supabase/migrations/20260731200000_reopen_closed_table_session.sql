-- Yönetici yeniden açma: eski kapanış zamanını koruyup yeni açık oturum akışı başlatır.

alter table public.table_sessions
  add column if not exists previous_closed_at timestamptz;

create or replace function public.reopen_closed_table_session(
  requested_organization_id uuid,
  requested_branch_id uuid,
  requested_device_id uuid,
  requested_client_mutation_id uuid,
  requested_table_session_id uuid,
  requested_reason text
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
  if not private.is_manager(requested_organization_id, requested_branch_id) then
    raise exception using errcode = '42501', message = 'manager_role_required';
  end if;
  if char_length(trim(coalesce(requested_reason, ''))) not between 3 and 500 then
    raise exception using errcode = '22023', message = 'reopen_reason_required';
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
    'orders.reopen',
    requested_table_session_id::text,
    trim(requested_reason)
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
    'orders.reopen',
    requested_table_session_id,
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
    and session.id = requested_table_session_id
    and session.deleted_at is null
  for update;
  if prior_session.id is null then
    raise exception using errcode = '22023', message = 'table_session_not_found';
  end if;
  if prior_session.status <> 'closed' or prior_session.closed_at is null then
    raise exception using errcode = '22023', message = 'table_session_is_not_closed';
  end if;

  update public.table_sessions
  set status = 'open',
      closed_by = null,
      closed_at = null,
      previous_closed_at = prior_session.closed_at,
      updated_at = now(),
      version = prior_session.version + 1
  where id = prior_session.id
  returning * into canonical_session;

  mutation_result := jsonb_build_object(
    'status', 'applied',
    'tableSessionId', canonical_session.id,
    'tableId', canonical_session.table_id,
    'tableSessionVersion', canonical_session.version,
    'previousClosedAt', prior_session.closed_at,
    'reopenReason', trim(requested_reason),
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
    reason,
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
    'orders.reopen',
    to_jsonb(prior_session),
    to_jsonb(canonical_session),
    trim(requested_reason),
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

revoke execute on function public.reopen_closed_table_session(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  text
) from public, anon;
grant execute on function public.reopen_closed_table_session(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  text
) to authenticated;
