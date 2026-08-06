import { SupabaseClient } from '@supabase/supabase-js';
import { BranchId, DeviceId, MutationId, OrganizationId, TableSessionId } from '../../domain';
import { Database } from '../../services/supabase';

export interface ReopenTableSessionRequest {
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly deviceId: DeviceId;
  readonly clientMutationId: MutationId;
  readonly tableSessionId: TableSessionId;
  readonly reason: string;
  readonly pin: string;
}

export interface ReopenTableSessionResult {
  readonly status: 'applied';
  readonly tableSessionId: TableSessionId;
  readonly tableId: string;
  readonly tableSessionVersion: number;
  readonly previousClosedAt: string;
}

export class SupabaseReopenTableSessionGateway {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async reopen(request: ReopenTableSessionRequest): Promise<ReopenTableSessionResult> {
    const { data, error } = await this.client.rpc('reopen_closed_table_session', {
      requested_organization_id: request.organizationId,
      requested_branch_id: request.branchId,
      requested_device_id: request.deviceId,
      requested_client_mutation_id: request.clientMutationId,
      requested_table_session_id: request.tableSessionId,
      requested_reason: request.reason.trim(),
      requested_pin: request.pin,
    });
    if (error) throw error;
    return parseResult(data);
  }

  async setManagerPin(request: {
    readonly organizationId: OrganizationId;
    readonly branchId: BranchId;
    readonly deviceId: DeviceId;
    readonly clientMutationId: MutationId;
    readonly pin: string;
  }): Promise<void> {
    const { error } = await this.client.rpc('set_manager_action_pin', {
      requested_organization_id: request.organizationId,
      requested_branch_id: request.branchId,
      requested_device_id: request.deviceId,
      requested_client_mutation_id: request.clientMutationId,
      requested_pin: request.pin,
    });
    if (error) throw error;
  }
}

function parseResult(value: unknown): ReopenTableSessionResult {
  if (
    !isRecord(value) ||
    value.status !== 'applied' ||
    typeof value.tableSessionId !== 'string' ||
    typeof value.tableId !== 'string' ||
    !isSafeInteger(value.tableSessionVersion) ||
    typeof value.previousClosedAt !== 'string'
  ) {
    throw new Error('Reopen table session RPC returned an invalid result');
  }
  return {
    status: 'applied',
    tableSessionId: value.tableSessionId as TableSessionId,
    tableId: value.tableId,
    tableSessionVersion: value.tableSessionVersion,
    previousClosedAt: value.previousClosedAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}
