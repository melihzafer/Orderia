import { SupabaseClient } from '@supabase/supabase-js';
import { BranchId, DeviceId, MutationId, OrganizationId } from '../../domain';
import { Database, Json } from '../../services/supabase';
import { ConfirmCheckPaymentsCommand } from './paymentPlanner';

export interface ConfirmCheckPaymentsRequest {
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly deviceId: DeviceId;
  readonly clientMutationId: MutationId;
  readonly command: ConfirmCheckPaymentsCommand;
}

export interface ConfirmCheckPaymentsResult {
  readonly status: 'confirmed';
  readonly checkId: string;
  readonly checkStatus: 'partially_paid' | 'paid';
  readonly checkVersion: number;
  readonly totalMinor: number;
  readonly paidMinor: number;
  readonly remainingMinor: number;
  readonly paymentIds: readonly string[];
}

export class PaymentCommandError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly details?: string,
  ) {
    super(message);
    this.name = 'PaymentCommandError';
  }
}

export class SupabasePaymentGateway {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async confirm(request: ConfirmCheckPaymentsRequest): Promise<ConfirmCheckPaymentsResult> {
    const { data, error } = await this.client.rpc('confirm_check_payments', {
      requested_organization_id: request.organizationId,
      requested_branch_id: request.branchId,
      requested_device_id: request.deviceId,
      requested_client_mutation_id: request.clientMutationId,
      requested_payload: request.command as unknown as Json,
    });
    if (error) {
      throw new PaymentCommandError(error.message, error.code, error.details);
    }
    return parseResult(data);
  }
}

function parseResult(value: Json): ConfirmCheckPaymentsResult {
  if (!isRecord(value)) throw new Error('Payment RPC returned a non-object result');
  const paymentIds = value.paymentIds;
  if (
    value.status !== 'confirmed' ||
    typeof value.checkId !== 'string' ||
    (value.checkStatus !== 'partially_paid' && value.checkStatus !== 'paid') ||
    !isSafeInteger(value.checkVersion) ||
    !isSafeInteger(value.totalMinor) ||
    !isSafeInteger(value.paidMinor) ||
    !isSafeInteger(value.remainingMinor) ||
    !Array.isArray(paymentIds) ||
    !paymentIds.every((id) => typeof id === 'string')
  ) {
    throw new Error('Payment RPC returned an invalid result');
  }
  return {
    status: value.status,
    checkId: value.checkId,
    checkStatus: value.checkStatus,
    checkVersion: value.checkVersion,
    totalMinor: value.totalMinor,
    paidMinor: value.paidMinor,
    remainingMinor: value.remainingMinor,
    paymentIds,
  };
}

function isRecord(value: Json): value is { readonly [key: string]: Json | undefined } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSafeInteger(value: Json | undefined): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}
