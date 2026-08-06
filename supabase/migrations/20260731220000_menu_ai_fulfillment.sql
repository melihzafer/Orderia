-- AI taslağı yayınlanırken gözden geçirilen fulfillment grubu da kataloğa yazılır.

create or replace function public.publish_menu_ai_draft_with_fulfillment(
  requested_organization_id uuid,
  requested_branch_id uuid,
  requested_request_id uuid,
  requested_expected_version bigint,
  requested_reviewed_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  payload_group text := coalesce(requested_reviewed_payload ->> 'fulfillmentGroup', 'kitchen');
  published jsonb;
  published_item public.menu_items;
begin
  if payload_group not in ('kitchen', 'drinks') then
    raise exception using errcode = '22023', message = 'invalid_fulfillment_group';
  end if;

  published := public.publish_menu_ai_draft(
    requested_organization_id,
    requested_branch_id,
    requested_request_id,
    requested_expected_version,
    requested_reviewed_payload
  );

  update public.menu_items as item
  set fulfillment_group = payload_group,
      updated_at = now(),
      version = item.version + 1
  where item.organization_id = requested_organization_id
    and item.branch_id = requested_branch_id
    and item.id = (published #>> '{item,id}')::uuid
    and item.deleted_at is null
  returning item.* into published_item;

  if published_item.id is null then
    raise exception using errcode = '22023', message = 'catalog_item_not_found';
  end if;

  return published
    || jsonb_build_object(
      'item', (published -> 'item')
        || jsonb_build_object(
          'version', published_item.version,
          'fulfillmentGroup', published_item.fulfillment_group
        )
    );
end;
$$;

revoke execute on function public.publish_menu_ai_draft_with_fulfillment(uuid, uuid, uuid, bigint, jsonb)
  from public, anon;
grant execute on function public.publish_menu_ai_draft_with_fulfillment(uuid, uuid, uuid, bigint, jsonb)
  to authenticated;
