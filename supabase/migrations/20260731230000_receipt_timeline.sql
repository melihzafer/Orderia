-- Kapalı fişin değişmez snapshot'ı ile ilgili audit olaylarını birlikte gösterir.

create or replace function public.get_receipt_timeline(
  requested_organization_id uuid,
  requested_branch_id uuid,
  requested_receipt_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  receipt_row public.receipts;
  timeline jsonb;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not private.is_active_member(requested_organization_id, requested_branch_id) then
    raise exception using errcode = '42501', message = 'branch_access_denied';
  end if;

  select receipt.*
  into receipt_row
  from public.receipts as receipt
  where receipt.organization_id = requested_organization_id
    and receipt.branch_id = requested_branch_id
    and receipt.id = requested_receipt_id;
  if receipt_row.id is null then
    raise exception using errcode = '22023', message = 'receipt_not_found';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'occurredAt', event.created_at,
        'action', event.action,
        'actorDisplayName', coalesce(profile.display_name, 'Unknown user'),
        'reason', event.reason
      )
      order by event.created_at, event.id
    ),
    '[]'::jsonb
  )
  into timeline
  from public.audit_events as event
  left join public.profiles as profile on profile.id = event.actor_user_id
  where event.organization_id = requested_organization_id
    and event.branch_id = requested_branch_id
    and (
      event.entity_id = receipt_row.table_session_id
      or event.entity_id = receipt_row.check_id
      or event.entity_id in (
        select (check_json ->> 'checkId')::uuid
        from jsonb_array_elements(receipt_row.snapshot_json -> 'checks') as check_json
      )
      or event.entity_id in (
        select (item_json ->> 'orderItemId')::uuid
        from jsonb_array_elements(receipt_row.snapshot_json -> 'checks') as check_json
        cross join lateral jsonb_array_elements(check_json -> 'items') as item_json
      )
      or event.entity_id in (
        select (payment_json ->> 'paymentId')::uuid
        from jsonb_array_elements(receipt_row.snapshot_json -> 'payments') as payment_json
      )
    );

  return timeline;
end;
$$;

revoke execute on function public.get_receipt_timeline(uuid, uuid, uuid) from public, anon;
grant execute on function public.get_receipt_timeline(uuid, uuid, uuid) to authenticated;
