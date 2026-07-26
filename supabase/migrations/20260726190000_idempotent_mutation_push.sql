alter table public.client_mutations
  add column request_fingerprint text;

update public.client_mutations
set request_fingerprint = md5(
  concat_ws(
    ':',
    device_id::text,
    client_mutation_id::text,
    mutation_type,
    coalesce(entity_id::text, '')
  )
);

alter table public.client_mutations
  alter column request_fingerprint set not null,
  add constraint client_mutations_request_fingerprint_check
    check (request_fingerprint ~ '^[a-f0-9]{32}$');

create or replace function public.apply_client_mutation(
  requested_organization_id uuid,
  requested_branch_id uuid,
  requested_device_id uuid,
  requested_client_mutation_id uuid,
  requested_mutation_type text,
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
  prior_hall public.halls;
  canonical_hall public.halls;
  mutation_result jsonb;
begin
  if caller_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if requested_payload is null
    or jsonb_typeof(requested_payload) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'mutation_payload_must_be_an_object';
  end if;

  if octet_length(requested_payload::text) > 65536 then
    raise exception using
      errcode = '22023',
      message = 'mutation_payload_too_large';
  end if;

  if not private.is_active_member(
    requested_organization_id,
    requested_branch_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'branch_access_denied';
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
    raise exception using
      errcode = '42501',
      message = 'device_access_denied';
  end if;

  fingerprint := md5(
    concat_ws(
      ':',
      requested_organization_id::text,
      requested_branch_id::text,
      requested_device_id::text,
      requested_client_mutation_id::text,
      requested_mutation_type,
      requested_entity_id::text,
      requested_payload::text,
      coalesce(requested_base_version::text, 'null')
    )
  );

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
    requested_mutation_type,
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

  case requested_mutation_type
    when 'halls.put' then
      if not private.is_manager(
        requested_organization_id,
        requested_branch_id
      ) then
        raise exception using
          errcode = '42501',
          message = 'manager_role_required';
      end if;

      if requested_payload - array['name', 'sortOrder', 'deletedAt'] <> '{}'::jsonb then
        raise exception using
          errcode = '22023',
          message = 'unsupported_hall_payload_field';
      end if;

      if nullif(trim(requested_payload ->> 'name'), '') is null then
        raise exception using
          errcode = '22023',
          message = 'hall_name_required';
      end if;

      select hall.*
      into prior_hall
      from public.halls as hall
      where hall.organization_id = requested_organization_id
        and hall.branch_id = requested_branch_id
        and hall.id = requested_entity_id
      for update;

      if prior_hall.id is null then
        if requested_base_version is not null
          and requested_base_version <> 0 then
          raise exception using
            errcode = 'P0001',
            message = 'version_conflict';
        end if;

        insert into public.halls (
          id,
          organization_id,
          branch_id,
          name,
          sort_order,
          version,
          deleted_at
        )
        values (
          requested_entity_id,
          requested_organization_id,
          requested_branch_id,
          trim(requested_payload ->> 'name'),
          coalesce((requested_payload ->> 'sortOrder')::integer, 0),
          1,
          (requested_payload ->> 'deletedAt')::timestamptz
        )
        returning * into canonical_hall;
      else
        if requested_base_version is null
          or requested_base_version <> prior_hall.version then
          raise exception using
            errcode = 'P0001',
            message = 'version_conflict';
        end if;

        update public.halls
        set name = trim(requested_payload ->> 'name'),
            sort_order = coalesce(
              (requested_payload ->> 'sortOrder')::integer,
              prior_hall.sort_order
            ),
            version = prior_hall.version + 1,
            updated_at = now(),
            deleted_at = case
              when requested_payload ? 'deletedAt'
                then (requested_payload ->> 'deletedAt')::timestamptz
              else prior_hall.deleted_at
            end
        where id = prior_hall.id
        returning * into canonical_hall;
      end if;

      mutation_result := jsonb_build_object(
        'status',
        'applied',
        'repository',
        'halls',
        'entityId',
        canonical_hall.id,
        'serverVersion',
        canonical_hall.version,
        'committedAt',
        now()
      );
    else
      raise exception using
        errcode = '22023',
        message = 'unsupported_mutation_type';
  end case;

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
    split_part(requested_mutation_type, '.', 1),
    requested_entity_id,
    requested_mutation_type,
    case
      when prior_hall.id is null then null
      else to_jsonb(prior_hall)
    end,
    to_jsonb(canonical_hall),
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

revoke execute on function public.apply_client_mutation(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  jsonb,
  bigint
) from public, anon;

grant execute on function public.apply_client_mutation(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  jsonb,
  bigint
) to authenticated;
