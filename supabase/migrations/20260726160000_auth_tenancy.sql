create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  plan text not null default 'trial'
    check (plan in ('trial', 'starter', 'growth', 'enterprise')),
  status text not null default 'active'
    check (status in ('active', 'suspended', 'closed')),
  created_at timestamptz not null default now(),
  unique (slug)
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  timezone text not null default 'Europe/Sofia',
  currency_code text not null default 'EUR'
    check (currency_code ~ '^[A-Z]{3}$'),
  business_day_cutoff time not null default time '04:00',
  receipt_prefix text not null default 'ORD'
    check (receipt_prefix ~ '^[A-Z0-9]{1,12}$'),
  status text not null default 'active'
    check (status in ('active', 'suspended', 'closed')),
  allow_offline_payments boolean not null default false,
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id)
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  email text not null,
  avatar_url text,
  locale text not null default 'tr'
    check (locale in ('tr', 'bg', 'en')),
  created_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  branch_id uuid,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('waiter', 'manager')),
  status text not null default 'invited'
    check (status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint memberships_waiter_branch_required
    check (role <> 'waiter' or branch_id is not null),
  constraint memberships_branch_organization_fkey
    foreign key (organization_id, branch_id)
    references public.branches (organization_id, id)
    on delete cascade
);

create table public.devices (
  id uuid primary key,
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  branch_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('android', 'ios_web', 'web')),
  app_version text not null check (char_length(trim(app_version)) between 1 and 40),
  last_seen_at timestamptz not null default now(),
  last_sync_at timestamptz,
  push_endpoint text,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint devices_branch_organization_fkey
    foreign key (organization_id, branch_id)
    references public.branches (organization_id, id)
    on delete cascade
);

create index branches_organization_id_idx
  on public.branches (organization_id);

create index branches_organization_active_idx
  on public.branches (organization_id, status, id)
  where deleted_at is null;

create index memberships_organization_id_idx
  on public.memberships (organization_id);

create index memberships_organization_branch_idx
  on public.memberships (organization_id, branch_id);

create index memberships_user_id_idx
  on public.memberships (user_id);

create index memberships_user_active_idx
  on public.memberships (user_id, organization_id, branch_id)
  where status = 'active' and deleted_at is null;

create index memberships_organization_user_idx
  on public.memberships (organization_id, user_id, branch_id)
  where deleted_at is null;

create index memberships_branch_user_idx
  on public.memberships (branch_id, user_id)
  where branch_id is not null and deleted_at is null;

create unique index memberships_active_organization_user_unique
  on public.memberships (organization_id, user_id)
  where branch_id is null and deleted_at is null;

create unique index memberships_active_branch_user_unique
  on public.memberships (organization_id, branch_id, user_id)
  where branch_id is not null and deleted_at is null;

create index devices_organization_branch_user_idx
  on public.devices (organization_id, branch_id, user_id);

create index devices_user_id_idx
  on public.devices (user_id);

create index devices_user_active_idx
  on public.devices (user_id, last_seen_at desc)
  where revoked_at is null;

create or replace function private.is_active_member(
  requested_organization_id uuid,
  requested_branch_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships as membership
    where membership.user_id = (select auth.uid())
      and membership.organization_id = requested_organization_id
      and membership.status = 'active'
      and membership.deleted_at is null
      and (
        requested_branch_id is null
        or membership.branch_id = requested_branch_id
        or (membership.role = 'manager' and membership.branch_id is null)
      )
  );
$$;

create or replace function private.is_manager(
  requested_organization_id uuid,
  requested_branch_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships as membership
    where membership.user_id = (select auth.uid())
      and membership.organization_id = requested_organization_id
      and membership.role = 'manager'
      and membership.status = 'active'
      and membership.deleted_at is null
      and (
        requested_branch_id is null
        or membership.branch_id is null
        or membership.branch_id = requested_branch_id
      )
  );
$$;

create or replace function private.can_view_profile(requested_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    requested_user_id = (select auth.uid())
    or exists (
      select 1
      from public.memberships as caller_membership
      join public.memberships as requested_membership
        on requested_membership.organization_id = caller_membership.organization_id
      where caller_membership.user_id = (select auth.uid())
        and requested_membership.user_id = requested_user_id
        and caller_membership.status = 'active'
        and requested_membership.status = 'active'
        and caller_membership.deleted_at is null
        and requested_membership.deleted_at is null
        and (
          (
            caller_membership.role = 'manager'
            and caller_membership.branch_id is null
          )
          or caller_membership.branch_id = requested_membership.branch_id
        )
    );
$$;

create or replace function private.handle_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    display_name,
    email,
    avatar_url,
    locale
  )
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(coalesce(new.email, 'Orderia User'), '@', 1)
    ),
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    case
      when new.raw_user_meta_data ->> 'locale' in ('tr', 'bg', 'en')
        then new.raw_user_meta_data ->> 'locale'
      else 'tr'
    end
  )
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

create trigger auth_user_profile_created
  after insert or update of email on auth.users
  for each row execute function private.handle_auth_user_profile();

insert into public.profiles (
  id,
  display_name,
  email,
  avatar_url,
  locale,
  created_at
)
select
  auth_user.id,
  coalesce(
    nullif(trim(auth_user.raw_user_meta_data ->> 'display_name'), ''),
    split_part(coalesce(auth_user.email, 'Orderia User'), '@', 1)
  ),
  coalesce(auth_user.email, ''),
  nullif(auth_user.raw_user_meta_data ->> 'avatar_url', ''),
  case
    when auth_user.raw_user_meta_data ->> 'locale' in ('tr', 'bg', 'en')
      then auth_user.raw_user_meta_data ->> 'locale'
    else 'tr'
  end,
  coalesce(auth_user.created_at, now())
from auth.users as auth_user
on conflict (id) do nothing;

create or replace function public.register_device(
  device_id uuid,
  requested_organization_id uuid,
  requested_branch_id uuid,
  device_platform text,
  client_app_version text,
  device_push_endpoint text default null
)
returns public.devices
language plpgsql
security definer
set search_path = ''
as $$
declare
  registered_device public.devices;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not private.is_active_member(
    requested_organization_id,
    requested_branch_id
  ) then
    raise exception using errcode = '42501', message = 'branch_access_denied';
  end if;

  if device_platform not in ('android', 'ios_web', 'web') then
    raise exception using errcode = '22023', message = 'invalid_device_platform';
  end if;

  insert into public.devices (
    id,
    organization_id,
    branch_id,
    user_id,
    platform,
    app_version,
    last_seen_at,
    push_endpoint,
    updated_at
  )
  values (
    device_id,
    requested_organization_id,
    requested_branch_id,
    (select auth.uid()),
    device_platform,
    client_app_version,
    now(),
    device_push_endpoint,
    now()
  )
  on conflict (id) do update
    set platform = excluded.platform,
        app_version = excluded.app_version,
        last_seen_at = excluded.last_seen_at,
        push_endpoint = coalesce(
          excluded.push_endpoint,
          public.devices.push_endpoint
        ),
        updated_at = excluded.updated_at
    where public.devices.user_id = (select auth.uid())
      and public.devices.organization_id = requested_organization_id
      and public.devices.branch_id = requested_branch_id
  returning * into registered_device;

  if registered_device.id is null then
    raise exception using errcode = '42501', message = 'device_scope_mismatch';
  end if;

  if registered_device.revoked_at is not null then
    raise exception using errcode = '42501', message = 'device_revoked';
  end if;

  return registered_device;
end;
$$;

create or replace function public.touch_device(
  device_id uuid,
  synced_at timestamptz default null
)
returns public.devices
language plpgsql
security definer
set search_path = ''
as $$
declare
  touched_device public.devices;
begin
  update public.devices
  set last_seen_at = now(),
      last_sync_at = coalesce(synced_at, last_sync_at),
      updated_at = now()
  where id = device_id
    and user_id = (select auth.uid())
    and revoked_at is null
  returning * into touched_device;

  if touched_device.id is null then
    raise exception using errcode = '42501', message = 'device_unavailable';
  end if;

  return touched_device;
end;
$$;

create or replace function public.revoke_device(device_id uuid)
returns public.devices
language plpgsql
security definer
set search_path = ''
as $$
declare
  revoked_device public.devices;
begin
  update public.devices as device
  set revoked_at = coalesce(device.revoked_at, now()),
      updated_at = now()
  where device.id = device_id
    and private.is_manager(device.organization_id, device.branch_id)
  returning device.* into revoked_device;

  if revoked_device.id is null then
    raise exception using errcode = '42501', message = 'device_revoke_denied';
  end if;

  return revoked_device;
end;
$$;

alter table public.organizations enable row level security;
alter table public.organizations force row level security;
alter table public.branches enable row level security;
alter table public.branches force row level security;
alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.memberships enable row level security;
alter table public.memberships force row level security;
alter table public.devices enable row level security;
alter table public.devices force row level security;

create policy organizations_active_members_select
on public.organizations
for select
to authenticated
using ((select private.is_active_member(id, null)));

create policy branches_active_members_select
on public.branches
for select
to authenticated
using (
  deleted_at is null
  and (select private.is_active_member(organization_id, id))
);

create policy profiles_authorized_colleagues_select
on public.profiles
for select
to authenticated
using ((select private.can_view_profile(id)));

create policy profiles_self_update
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy memberships_self_or_manager_select
on public.memberships
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_manager(organization_id, branch_id))
);

create policy devices_self_or_manager_select
on public.devices
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_manager(organization_id, branch_id))
);

revoke all on public.organizations from anon;
revoke all on public.branches from anon;
revoke all on public.profiles from anon;
revoke all on public.memberships from anon;
revoke all on public.devices from anon;

revoke all on public.organizations from authenticated;
revoke all on public.branches from authenticated;
revoke all on public.profiles from authenticated;
revoke all on public.memberships from authenticated;
revoke all on public.devices from authenticated;

grant select on public.organizations to authenticated;
grant select on public.branches to authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, avatar_url, locale) on public.profiles to authenticated;
grant select on public.memberships to authenticated;
grant select on public.devices to authenticated;

revoke execute on all functions in schema private from public;
revoke execute on all functions in schema private from anon;
revoke execute on all functions in schema private from authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_active_member(uuid, uuid) to authenticated;
grant execute on function private.is_manager(uuid, uuid) to authenticated;
grant execute on function private.can_view_profile(uuid) to authenticated;

revoke execute on function public.register_device(uuid, uuid, uuid, text, text, text)
  from public, anon;
revoke execute on function public.touch_device(uuid, timestamptz)
  from public, anon;
revoke execute on function public.revoke_device(uuid)
  from public, anon;

grant execute on function public.register_device(uuid, uuid, uuid, text, text, text)
  to authenticated;
grant execute on function public.touch_device(uuid, timestamptz)
  to authenticated;
grant execute on function public.revoke_device(uuid)
  to authenticated;

revoke execute on function private.handle_auth_user_profile() from public;
revoke execute on function private.handle_auth_user_profile() from anon;
revoke execute on function private.handle_auth_user_profile() from authenticated;
