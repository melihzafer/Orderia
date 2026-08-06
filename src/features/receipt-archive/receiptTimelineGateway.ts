import { SupabaseClient } from '@supabase/supabase-js';
import { BranchId, OrganizationId, ReceiptId } from '../../domain';
import { Database, Json } from '../../services/supabase';

export interface ReceiptTimelineEntry {
  readonly occurredAt: string;
  readonly action: string;
  readonly actorDisplayName: string;
  readonly reason?: string;
}

export class ReceiptTimelineGateway {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async load(input: {
    readonly organizationId: OrganizationId;
    readonly branchId: BranchId;
    readonly receiptId: ReceiptId;
  }): Promise<readonly ReceiptTimelineEntry[]> {
    const { data, error } = await this.client.rpc('get_receipt_timeline', {
      requested_organization_id: input.organizationId,
      requested_branch_id: input.branchId,
      requested_receipt_id: input.receiptId,
    });
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Receipt timeline response is invalid');
    return data.map(parseTimelineEntry);
  }
}

function parseTimelineEntry(value: Json): ReceiptTimelineEntry {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    typeof value.occurredAt !== 'string' ||
    typeof value.action !== 'string' ||
    typeof value.actorDisplayName !== 'string'
  ) {
    throw new Error('Receipt timeline entry is invalid');
  }
  return {
    occurredAt: value.occurredAt,
    action: value.action,
    actorDisplayName: value.actorDisplayName,
    ...(typeof value.reason === 'string' ? { reason: value.reason } : {}),
  };
}
