-- Renaming a check ("Mehmet Ağa") had no server-side command handler at all:
-- the client wrote the new name to local IndexedDB optimistically and queued
-- an outbox mutation that mutationPushGateway could never route anywhere
-- (repository "checks" + operation "command" without a "kind" key matched no
-- branch and fell through to remoteMutationType(), which throws
-- UNSUPPORTED_LOCAL_MUTATION). The rename looked like it worked for a moment,
-- then got silently discarded the next time local state was reconciled with
-- a server pull (e.g. right after a split, or after reload). This gives the
-- rename its own idempotent command path, following the same shape as
-- apply_table_session_note_command.
create or replace function public.apply_check_rename_command(
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
  prior_check public.checks;
  canonical_check public.checks;
  next_name text;
  mutation_result jsonb;
begin
  if caller_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if requested_payload is null or jsonb_typeof(requested_payload) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'mutation_payload_must_be_an_object';
  end if;
  if requested_payload - array['name'] <> '{}'::jsonb
    or not (requested_payload ? 'name')
    or jsonb_typeof(requested_payload -> 'name') is distinct from 'string' then
    raise exception using errcode = '22023', message = 'invalid_check_rename_payload';
  end if;
  next_name := trim(requested_payload ->> 'name');
  if char_length(next_name) not between 1 and 80 then
    raise exception using errcode = '22023', message = 'check_name_length_invalid';
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
    'checks.rename',
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
    'checks.rename',
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

  select check_row.*
  into prior_check
  from public.checks as check_row
  where check_row.organization_id = requested_organization_id
    and check_row.branch_id = requested_branch_id
    and check_row.id = requested_entity_id
    and check_row.deleted_at is null
  for update;
  if prior_check.id is null then
    raise exception using errcode = '22023', message = 'check_not_found';
  end if;
  if prior_check.version <> requested_base_version then
    raise exception using
      errcode = 'P0001',
      message = 'version_conflict',
      detail = jsonb_build_object(
        'serverVersion', prior_check.version,
        'serverPayload', to_jsonb(prior_check)
      )::text;
  end if;
  if prior_check.status not in ('open', 'partially_paid') then
    raise exception using errcode = '22023', message = 'settled_check_cannot_be_renamed';
  end if;

  update public.checks
  set name = next_name,
      updated_at = now(),
      version = prior_check.version + 1
  where id = prior_check.id
  returning * into canonical_check;

  mutation_result := jsonb_build_object(
    'status', 'applied',
    'repository', 'checks',
    'entityId', canonical_check.id,
    'serverVersion', canonical_check.version,
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
    canonical_check.id,
    'checks.rename',
    to_jsonb(prior_check),
    to_jsonb(canonical_check),
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

revoke execute on function public.apply_check_rename_command(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb,
  bigint
) from public, anon;
grant execute on function public.apply_check_rename_command(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb,
  bigint
) to authenticated;
