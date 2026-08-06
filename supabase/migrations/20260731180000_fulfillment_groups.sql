-- Product-level handoff metadata for the festival workflow.
-- Existing products stay kitchen-first; managers can move a product to drinks.

alter table public.menu_items
  add column if not exists fulfillment_group text not null default 'kitchen';

alter table public.menu_items
  drop constraint if exists menu_items_fulfillment_group_check;

alter table public.menu_items
  add constraint menu_items_fulfillment_group_check
  check (fulfillment_group in ('kitchen', 'drinks'));

-- Keep the original catalog command stable for already-deployed databases while
-- adding one validated field around it. The inner command still owns category,
-- modifier, duplicate, and optimistic-version validation.
create or replace function public.save_catalog_item_with_fulfillment(
  requested_organization_id uuid,
  requested_branch_id uuid,
  requested_item_id uuid,
  requested_expected_version bigint,
  requested_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  payload_group text := coalesce(requested_payload ->> 'fulfillmentGroup', 'kitchen');
  saved jsonb;
  saved_item public.menu_items;
begin
  if payload_group not in ('kitchen', 'drinks') then
    raise exception using errcode = '22023', message = 'invalid_fulfillment_group';
  end if;

  saved := public.save_catalog_item(
    requested_organization_id,
    requested_branch_id,
    requested_item_id,
    requested_expected_version,
    requested_payload
  );

  update public.menu_items as item
  set fulfillment_group = payload_group,
      updated_at = now(),
      version = item.version + 1
  where item.organization_id = requested_organization_id
    and item.branch_id = requested_branch_id
    and item.id = (saved ->> 'id')::uuid
    and item.deleted_at is null
  returning item.* into saved_item;

  if saved_item.id is null then
    raise exception using errcode = '22023', message = 'catalog_item_not_found';
  end if;

  return saved
    || jsonb_build_object(
      'version', saved_item.version,
      'fulfillmentGroup', saved_item.fulfillment_group
    );
end;
$$;

revoke execute on function public.save_catalog_item_with_fulfillment(
  uuid,
  uuid,
  uuid,
  bigint,
  jsonb
) from public, anon;
grant execute on function public.save_catalog_item_with_fulfillment(
  uuid,
  uuid,
  uuid,
  bigint,
  jsonb
) to authenticated;
