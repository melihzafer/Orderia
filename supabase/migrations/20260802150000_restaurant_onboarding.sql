-- First-run onboarding for managers and waiters.
-- A restaurant code is a branch-scoped invite secret. The RPCs below are
-- security-definer entry points so authenticated users never receive direct
-- insert access to tenant or membership tables.

alter table public.branches
  add column if not exists restaurant_code text;

update public.branches
set restaurant_code = upper(substr(replace(id::text, '-', ''), 1, 8))
where restaurant_code is null;

alter table public.branches
  alter column restaurant_code set default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  alter column restaurant_code set not null;

alter table public.branches
  drop constraint if exists branches_restaurant_code_format;

alter table public.branches
  add constraint branches_restaurant_code_format
  check (restaurant_code ~ '^[A-Z0-9]{8}$');

create unique index if not exists branches_restaurant_code_unique
  on public.branches (restaurant_code);

create or replace function public.join_restaurant(
  requested_code text,
  requested_role text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_user_id uuid := (select auth.uid());
  normalized_code text;
  target_branch public.branches;
  target_membership public.memberships;
begin
  if caller_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if requested_role not in ('waiter', 'manager') then
    raise exception using errcode = '22023', message = 'invalid_role';
  end if;

  normalized_code := upper(regexp_replace(coalesce(trim(requested_code), ''), '[^A-Za-z0-9]', '', 'g'));
  if normalized_code !~ '^[A-Z0-9]{8}$' then
    raise exception using errcode = '22023', message = 'invalid_restaurant_code';
  end if;

  select branch.*
  into target_branch
  from public.branches as branch
  where branch.restaurant_code = normalized_code
    and branch.status = 'active'
    and branch.deleted_at is null
  limit 1;

  if target_branch.id is null then
    raise exception using errcode = '22023', message = 'restaurant_not_found';
  end if;

  if requested_role = 'manager' then
    select membership.*
    into target_membership
    from public.memberships as membership
    where membership.organization_id = target_branch.organization_id
      and membership.user_id = caller_user_id
      and membership.role = 'manager'
      and membership.branch_id is null
      and membership.status = 'active'
      and membership.deleted_at is null
    limit 1;

    if target_membership.id is null then
      insert into public.memberships (
        organization_id,
        branch_id,
        user_id,
        role,
        status
      )
      values (
        target_branch.organization_id,
        null,
        caller_user_id,
        'manager',
        'active'
      )
      returning * into target_membership;
    end if;
  else
    select membership.*
    into target_membership
    from public.memberships as membership
    where membership.organization_id = target_branch.organization_id
      and membership.branch_id = target_branch.id
      and membership.user_id = caller_user_id
      and membership.role = 'waiter'
      and membership.status = 'active'
      and membership.deleted_at is null
    limit 1;

    if target_membership.id is null then
      insert into public.memberships (
        organization_id,
        branch_id,
        user_id,
        role,
        status
      )
      values (
        target_branch.organization_id,
        target_branch.id,
        caller_user_id,
        'waiter',
        'active'
      )
      returning * into target_membership;
    end if;
  end if;

  return jsonb_build_object(
    'organizationId', target_branch.organization_id,
    'branchId', target_branch.id,
    'restaurantCode', target_branch.restaurant_code,
    'restaurantName', (
      select organization.name
      from public.organizations as organization
      where organization.id = target_branch.organization_id
    ),
    'role', requested_role
  );
end;
$$;

create or replace function public.create_restaurant(
  requested_name text,
  requested_branch_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_user_id uuid := (select auth.uid());
  restaurant_name text := trim(coalesce(requested_name, ''));
  branch_name text := trim(coalesce(requested_branch_name, ''));
  base_slug text;
  organization_slug text;
  created_organization public.organizations;
  created_branch public.branches;
begin
  if caller_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if char_length(restaurant_name) not between 1 and 120 then
    raise exception using errcode = '22023', message = 'invalid_restaurant_name';
  end if;

  if branch_name = '' then
    branch_name := restaurant_name;
  end if;
  if char_length(branch_name) not between 1 and 120 then
    raise exception using errcode = '22023', message = 'invalid_branch_name';
  end if;

  if exists (
    select 1
    from public.memberships as membership
    where membership.user_id = caller_user_id
      and membership.status = 'active'
      and membership.deleted_at is null
  ) then
    raise exception using errcode = '22023', message = 'already_member';
  end if;

  base_slug := lower(regexp_replace(restaurant_name, '[^A-Za-z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  if base_slug = '' then
    base_slug := 'restaurant';
  end if;
  organization_slug := substr(base_slug, 1, 80) || '-' || lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.organizations (name, slug)
  values (restaurant_name, organization_slug)
  returning * into created_organization;

  insert into public.branches (organization_id, name)
  values (created_organization.id, branch_name)
  returning * into created_branch;

  insert into public.memberships (
    organization_id,
    branch_id,
    user_id,
    role,
    status
  )
  values (
    created_organization.id,
    null,
    caller_user_id,
    'manager',
    'active'
  );

  return jsonb_build_object(
    'organizationId', created_organization.id,
    'branchId', created_branch.id,
    'restaurantCode', created_branch.restaurant_code,
    'restaurantName', created_organization.name,
    'role', 'manager'
  );
end;
$$;

revoke all on function public.join_restaurant(text, text) from public, anon;
revoke all on function public.create_restaurant(text, text) from public, anon;
grant execute on function public.join_restaurant(text, text) to authenticated;
grant execute on function public.create_restaurant(text, text) to authenticated;
