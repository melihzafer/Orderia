import { SupabaseClient } from '@supabase/supabase-js';
import {
  BranchId,
  DeviceId,
  MutationId,
  OrganizationId,
  RestaurantTableId,
  TableSessionId,
} from '../../domain';
import { Database, Json } from '../../services/supabase';

export interface TransferTableSessionCommand {
  readonly sourceSessionId: TableSessionId;
  readonly targetTableId: RestaurantTableId;
  readonly expectedSourceVersion: number;
  readonly expectedTargetVersion: number | null;
}

export interface TransferTableSessionRequest {
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly deviceId: DeviceId;
  readonly clientMutationId: MutationId;
  readonly command: TransferTableSessionCommand;
}

export interface TransferTableSessionResult {
  readonly status: 'applied';
  readonly mode: 'moved' | 'merged';
  readonly sourceTableId: string;
  readonly targetTableId: string;
  readonly sourceSessionId: string;
  readonly canonicalSessionId: string;
  readonly canonicalSessionVersion: number;
  readonly movedCheckCount: number;
}

export class TableOperationError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly details?: string,
  ) {
    super(message);
    this.name = 'TableOperationError';
  }
}

export class SupabaseTableOperationGateway {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async transferOrMerge(request: TransferTableSessionRequest): Promise<TransferTableSessionResult> {
    const { data, error } = await this.client.rpc('transfer_or_merge_table_session', {
      requested_organization_id: request.organizationId,
      requested_branch_id: request.branchId,
      requested_device_id: request.deviceId,
      requested_client_mutation_id: request.clientMutationId,
      requested_payload: request.command as unknown as Json,
    });
    if (error) throw new TableOperationError(error.message, error.code, error.details);
    return parseResult(data);
  }
}

function parseResult(value: Json): TransferTableSessionResult {
  if (
    !isRecord(value) ||
    value.status !== 'applied' ||
    (value.mode !== 'moved' && value.mode !== 'merged') ||
    typeof value.sourceTableId !== 'string' ||
    typeof value.targetTableId !== 'string' ||
    typeof value.sourceSessionId !== 'string' ||
    typeof value.canonicalSessionId !== 'string' ||
    !isSafeInteger(value.canonicalSessionVersion) ||
    !isSafeInteger(value.movedCheckCount)
  ) {
    throw new Error('Table operation RPC returned an invalid result');
  }
  return {
    status: value.status,
    mode: value.mode,
    sourceTableId: value.sourceTableId,
    targetTableId: value.targetTableId,
    sourceSessionId: value.sourceSessionId,
    canonicalSessionId: value.canonicalSessionId,
    canonicalSessionVersion: value.canonicalSessionVersion,
    movedCheckCount: value.movedCheckCount,
  };
}

function isRecord(value: Json): value is { readonly [key: string]: Json | undefined } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSafeInteger(value: Json | undefined): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}
