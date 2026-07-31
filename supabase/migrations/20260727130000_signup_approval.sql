-- Garson kayıt/onay akışı:
-- 1) Garson uygulamadan kaydolur (auth.signUp) → profiles trigger'ı profili yaratır.
-- 2) Uygulama request_signup çağırır → signup_requests'e 'pending' kaydı düşer.
-- 3) Onay e-postası SADECE işletme sahibinin adresine gider (edge function: signup-approval).
-- 4) Sahip e-postadaki bağlantıya tıklar VEYA yönetici uygulama içinden onaylar
--    → approve_signup_request membership'i 'active' olarak açar.
-- Onaylanmayan kullanıcının membership'i olmadığı için şube erişimi yoktur.

create table public.signup_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null check (char_length(email) between 3 and 320),
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  organization_id uuid references public.organizations (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  decided_by uuid references auth.users (id),
  decided_at timestamptz,
  notified_at timestamptz
);

-- Aynı kullanıcının aynı anda tek bekleyen başvurusu olabilir
create unique index signup_requests_one_pending_per_user
  on public.signup_requests (user_id)
  where status = 'pending';

create index signup_requests_pending_org_idx
  on public.signup_requests (organization_id)
  where status = 'pending';

alter table public.signup_requests enable row level security;

create policy signup_requests_insert_own
  on public.signup_requests
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy signup_requests_select_own_or_manager
  on public.signup_requests
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (organization_id is not null and private.is_manager(organization_id))
  );

-- Doğrudan update/delete yok: kararlar security definer RPC'ler üzerinden.

create or replace function public.request_signup(requested_display_name text)
returns public.signup_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_user_id uuid := (select auth.uid());
  caller_email text;
  target_organization_id uuid;
  organization_count int;
  created_request public.signup_requests;
begin
  if caller_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if requested_display_name is null or char_length(trim(requested_display_name)) not between 1 and 120 then
    raise exception using errcode = '22023', message = 'invalid_display_name';
  end if;

  select auth_user.email into caller_email
  from auth.users as auth_user
  where auth_user.id = caller_user_id;
  if caller_email is null then
    raise exception using errcode = '22023', message = 'authenticated_user_not_found';
  end if;

  -- Zaten aktif üyeliği olan kullanıcı yeni başvuru yapamaz
  if exists (
    select 1
    from public.memberships as membership
    where membership.user_id = caller_user_id
      and membership.status = 'active'
      and membership.deleted_at is null
  ) then
    raise exception using errcode = '22023', message = 'already_member';
  end if;

  -- Bekleyen başvuru varsa aynısını döndür (idempotent)
  select request.*
  into created_request
  from public.signup_requests as request
  where request.user_id = caller_user_id
    and request.status = 'pending';
  if created_request.id is not null then
    return created_request;
  end if;

  -- Tek organizasyonlu kurulumda organizasyonu otomatik bağla
  select count(*) into organization_count
  from public.organizations as organization
  where organization.status = 'active';
  if organization_count = 1 then
    select organization.id into target_organization_id
    from public.organizations as organization
    where organization.status = 'active'
    limit 1;
  end if;

  insert into public.signup_requests (
    user_id,
    email,
    display_name,
    organization_id
  )
  values (
    caller_user_id,
    caller_email,
    trim(requested_display_name),
    target_organization_id
  )
  returning * into created_request;

  return created_request;
end;
$$;

create or replace function public.my_signup_request()
returns public.signup_requests
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  found_request public.signup_requests;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select request.*
  into found_request
  from public.signup_requests as request
  where request.user_id = (select auth.uid())
  order by request.requested_at desc
  limit 1;

  return found_request;
end;
$$;

create or replace function public.list_pending_signup_requests()
returns setof public.signup_requests
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  return query
  select request.*
  from public.signup_requests as request
  where request.status = 'pending'
    and (
      request.organization_id is null
      or private.is_manager(request.organization_id)
    )
    and exists (
      select 1
      from public.memberships as membership
      where membership.user_id = (select auth.uid())
        and membership.role = 'manager'
        and membership.status = 'active'
        and membership.deleted_at is null
    )
  order by request.requested_at asc;
end;
$$;

create or replace function public.approve_signup_request(
  requested_signup_id uuid,
  requested_role text default 'waiter',
  requested_branch_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_user_id uuid := (select auth.uid());
  signup public.signup_requests;
  target_organization_id uuid;
  target_branch_id uuid;
begin
  if caller_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if requested_role not in ('waiter', 'manager') then
    raise exception using errcode = '22023', message = 'invalid_role';
  end if;

  select request.*
  into signup
  from public.signup_requests as request
  where request.id = requested_signup_id
  for update;
  if signup.id is null then
    raise exception using errcode = '22023', message = 'signup_request_not_found';
  end if;
  if signup.status <> 'pending' then
    raise exception using errcode = '22023', message = 'signup_request_already_decided';
  end if;

  -- Organizasyon: başvuruda belirtilmemişse onaylayan yöneticinin ilk organizasyonu
  target_organization_id := signup.organization_id;
  if target_organization_id is null then
    select membership.organization_id
    into target_organization_id
    from public.memberships as membership
    where membership.user_id = caller_user_id
      and membership.role = 'manager'
      and membership.status = 'active'
      and membership.deleted_at is null
    order by membership.created_at asc
    limit 1;
    if target_organization_id is null then
      raise exception using errcode = '42501', message = 'approval_denied';
    end if;
  end if;

  if not private.is_manager(target_organization_id) then
    raise exception using errcode = '42501', message = 'approval_denied';
  end if;

  -- Şube: garson için zorunlu; verilmemişse organizasyonun ilk aktif şubesi
  target_branch_id := requested_branch_id;
  if target_branch_id is null and requested_role = 'waiter' then
    select branch.id
    into target_branch_id
    from public.branches as branch
    where branch.organization_id = target_organization_id
      and branch.status = 'active'
      and branch.deleted_at is null
    order by branch.created_at asc
    limit 1;
  end if;
  if target_branch_id is not null and not exists (
    select 1
    from public.branches as branch
    where branch.id = target_branch_id
      and branch.organization_id = target_organization_id
      and branch.status = 'active'
      and branch.deleted_at is null
  ) then
    raise exception using errcode = '22023', message = 'branch_not_found';
  end if;
  if requested_role = 'waiter' and target_branch_id is null then
    raise exception using errcode = '22023', message = 'branch_required_for_waiter';
  end if;

  -- Üyelik zaten varsa tekrar açma
  if not exists (
    select 1
    from public.memberships as membership
    where membership.user_id = signup.user_id
      and membership.organization_id = target_organization_id
      and membership.status = 'active'
      and membership.deleted_at is null
      and membership.branch_id is not distinct from target_branch_id
  ) then
    insert into public.memberships (
      organization_id,
      branch_id,
      user_id,
      role,
      status
    )
    values (
      target_organization_id,
      target_branch_id,
      signup.user_id,
      requested_role,
      'active'
    );
  end if;

  update public.signup_requests
  set status = 'approved',
      organization_id = target_organization_id,
      decided_by = caller_user_id,
      decided_at = now()
  where id = signup.id;

  return jsonb_build_object(
    'status', 'approved',
    'signupRequestId', signup.id,
    'organizationId', target_organization_id,
    'branchId', target_branch_id,
    'role', requested_role
  );
end;
$$;

create or replace function public.reject_signup_request(requested_signup_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_user_id uuid := (select auth.uid());
  signup public.signup_requests;
begin
  if caller_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select request.*
  into signup
  from public.signup_requests as request
  where request.id = requested_signup_id
  for update;
  if signup.id is null then
    raise exception using errcode = '22023', message = 'signup_request_not_found';
  end if;
  if signup.status <> 'pending' then
    raise exception using errcode = '22023', message = 'signup_request_already_decided';
  end if;
  if signup.organization_id is not null and not private.is_manager(signup.organization_id) then
    raise exception using errcode = '42501', message = 'approval_denied';
  end if;

  update public.signup_requests
  set status = 'rejected',
      decided_by = caller_user_id,
      decided_at = now()
  where id = signup.id;

  return jsonb_build_object('status', 'rejected', 'signupRequestId', signup.id);
end;
$$;

revoke all on table public.signup_requests from public, anon;
grant select, insert on table public.signup_requests to authenticated;

revoke execute on function public.request_signup(text) from public, anon;
grant execute on function public.request_signup(text) to authenticated;

revoke execute on function public.my_signup_request() from public, anon;
grant execute on function public.my_signup_request() to authenticated;

revoke execute on function public.list_pending_signup_requests() from public, anon;
grant execute on function public.list_pending_signup_requests() to authenticated;

revoke execute on function public.approve_signup_request(uuid, text, uuid) from public, anon;
grant execute on function public.approve_signup_request(uuid, text, uuid) to authenticated;

revoke execute on function public.reject_signup_request(uuid) from public, anon;
grant execute on function public.reject_signup_request(uuid) to authenticated;
