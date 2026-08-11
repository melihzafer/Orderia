-- The cancellation_reasons table shipped with manager-insert RLS but no seed
-- data and no client screen to add rows, so voiding or deleting a sent item
-- was a dead end for every role, including managers, on every branch:
-- "Изтрий сметката" -> "Няма причини за отказ. Помолете управителя да добави
-- причини за този обект." with no way for the manager to actually do that.
--
-- This backfills a sensible starting set for existing branches and seeds the
-- same set for every newly created restaurant, so the void/cancel flow works
-- out of the box. A management screen (Settings) lets a manager edit this
-- list afterwards; seeding does not need to be perfect, just non-empty.

insert into public.cancellation_reasons (organization_id, branch_id, name, requires_manager)
select
  branch.organization_id,
  branch.id,
  reason.name,
  reason.requires_manager
from public.branches as branch
cross join (
  values
    ('Entered by mistake', false),
    ('Customer changed their mind', false),
    ('Out of stock', false),
    ('Prepared incorrectly', false),
    ('Complimentary', true),
    ('Staff meal', true),
    ('Other', false)
) as reason(name, requires_manager)
where branch.deleted_at is null
  and not exists (
    select 1
    from public.cancellation_reasons as existing
    where existing.organization_id = branch.organization_id
      and existing.branch_id = branch.id
      and existing.deleted_at is null
  );

-- Seed the same defaults for every restaurant created from here on.
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

  insert into public.cancellation_reasons (organization_id, branch_id, name, requires_manager)
  values
    (created_organization.id, created_branch.id, 'Entered by mistake', false),
    (created_organization.id, created_branch.id, 'Customer changed their mind', false),
    (created_organization.id, created_branch.id, 'Out of stock', false),
    (created_organization.id, created_branch.id, 'Prepared incorrectly', false),
    (created_organization.id, created_branch.id, 'Complimentary', true),
    (created_organization.id, created_branch.id, 'Staff meal', true),
    (created_organization.id, created_branch.id, 'Other', false);

  return jsonb_build_object(
    'organizationId', created_organization.id,
    'branchId', created_branch.id,
    'restaurantCode', created_branch.restaurant_code,
    'restaurantName', created_organization.name,
    'role', 'manager'
  );
end;
$$;

revoke all on function public.create_restaurant(text, text) from public, anon;
grant execute on function public.create_restaurant(text, text) to authenticated;
