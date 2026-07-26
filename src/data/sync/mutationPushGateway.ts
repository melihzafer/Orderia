import { SupabaseClient } from '@supabase/supabase-js';
import { JsonValue } from '../../domain';
import { OutboxMutation } from '../contracts';
import { Database, Json } from '../../services/supabase';
import { MutationPushError } from './retryPolicy';

export interface MutationPushResult {
  readonly status: 'applied';
  readonly repository: string;
  readonly entityId: string;
  readonly serverVersion: number;
  readonly committedAt: string;
  readonly result: JsonValue;
}

export interface MutationPushGateway {
  push(mutation: OutboxMutation): Promise<MutationPushResult>;
}

export class SupabaseMutationPushGateway implements MutationPushGateway {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async push(mutation: OutboxMutation): Promise<MutationPushResult> {
    const { data, error } = await this.client.rpc('apply_client_mutation', {
      requested_organization_id: mutation.organizationId,
      requested_branch_id: mutation.branchId,
      requested_device_id: mutation.deviceId,
      requested_client_mutation_id: mutation.clientMutationId,
      requested_mutation_type: remoteMutationType(mutation),
      requested_entity_id: mutation.entityId,
      requested_payload: remotePayload(mutation),
      requested_base_version: mutation.baseVersion ?? null,
    });

    if (error) {
      throw new MutationPushError(error.message, {
        code: error.code,
      });
    }

    return parseMutationResult(data);
  }
}

function remoteMutationType(mutation: OutboxMutation): string {
  if (
    mutation.repository === 'halls' &&
    (mutation.operation === 'create' ||
      mutation.operation === 'update' ||
      mutation.operation === 'delete')
  ) {
    return 'halls.put';
  }

  if (mutation.repository === 'orderBatches' && mutation.operation === 'command') {
    return 'orders.send_batch';
  }

  if (mutation.repository === 'orderItems' && mutation.operation === 'command') {
    return 'order_items.cancel';
  }

  throw new MutationPushError(
    `No remote mutation handler for ${mutation.repository}.${mutation.operation}`,
    { code: 'UNSUPPORTED_LOCAL_MUTATION' },
  );
}

function remotePayload(mutation: OutboxMutation): Json {
  if (mutation.repository !== 'halls') {
    return mutation.payload as Json;
  }

  const payload = asRecord(mutation.payload);
  return {
    name: requiredString(payload.name, 'Hall mutation requires a name'),
    sortOrder: optionalNumber(payload.sortOrder) ?? 0,
    ...(typeof payload.deletedAt === 'string' ? { deletedAt: payload.deletedAt } : {}),
  };
}

function parseMutationResult(data: Json): MutationPushResult {
  const result = asRecord(data);
  const status = requiredString(result.status, 'Mutation response has no status');
  if (status !== 'applied') {
    throw new MutationPushError(`Unsupported mutation response status: ${status}`, {
      code: 'INVALID_MUTATION_RESPONSE',
    });
  }

  return {
    status,
    repository: requiredString(result.repository, 'Mutation response has no repository'),
    entityId: requiredString(result.entityId, 'Mutation response has no entity ID'),
    serverVersion: requiredNumber(result.serverVersion, 'Mutation response has no server version'),
    committedAt: requiredString(result.committedAt, 'Mutation response has no commit timestamp'),
    result: data as JsonValue,
  };
}

function asRecord(value: JsonValue | Json): Record<string, Json> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new MutationPushError('Mutation value must be a JSON object', {
      code: 'INVALID_MUTATION_PAYLOAD',
    });
  }

  return value as Record<string, Json>;
}

function requiredString(value: Json | undefined, message: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new MutationPushError(message, { code: 'INVALID_MUTATION_PAYLOAD' });
  }
  return value;
}

function requiredNumber(value: Json | undefined, message: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new MutationPushError(message, { code: 'INVALID_MUTATION_RESPONSE' });
  }
  return value;
}

function optionalNumber(value: Json | undefined): number | undefined {
  if (value === undefined) return undefined;
  return requiredNumber(value, 'Mutation number is invalid');
}
