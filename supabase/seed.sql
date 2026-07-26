insert into public.organizations (id, name, slug, plan, status)
values (
  '00000000-0000-4000-8000-000000000001',
  'Orderia Demo',
  'orderia-demo',
  'trial',
  'active'
)
on conflict (id) do nothing;

insert into public.branches (
  id,
  organization_id,
  name,
  timezone,
  currency_code,
  business_day_cutoff,
  receipt_prefix,
  status
)
values (
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000001',
  'Merkez',
  'Europe/Sofia',
  'EUR',
  time '04:00',
  'ORD',
  'active'
)
on conflict (id) do nothing;
