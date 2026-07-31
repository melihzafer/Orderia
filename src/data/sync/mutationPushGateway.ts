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
    const payload = remotePayload(mutation);
    const { data, error } = await this.invoke(mutation, payload);

    if (error) {
      throw new MutationPushError(error.message, parseRemoteErrorDetails(error));
    }

    return parseMutationResult(data);
  }

  /**
   * Her yerel komut kendi sunucu fonksiyonuna gider. Ayrim once depoya, sonra
   * yuke bakilarak yapilir; yeni bir komut eklerken buraya tek bir dal eklenir.
   */
  private async invoke(
    mutation: OutboxMutation,
    payload: Json,
  ): Promise<{ readonly data: Json; readonly error: RemoteError | null }> {
    const identity = {
      requested_organization_id: mutation.organizationId,
      requested_branch_id: mutation.branchId,
      requested_device_id: mutation.deviceId,
      requested_client_mutation_id: mutation.clientMutationId,
      requested_entity_id: mutation.entityId,
      requested_payload: payload,
    };
    const versioned = { ...identity, requested_base_version: mutation.baseVersion ?? null };

    if (mutation.operation === 'command') {
      if (mutation.repository === 'orderBatches') {
        return this.client.rpc('apply_concurrent_order_batch', identity);
      }
      if (mutation.repository === 'checks' && hasKey(payload, 'kind')) {
        return this.client.rpc('apply_check_split_command', versioned);
      }
      if (mutation.repository === 'orderItems') {
        if (hasKey(payload, 'voidQuantity')) {
          return this.client.rpc('apply_order_item_void_command', versioned);
        }
        if (hasKey(payload, 'note')) {
          return this.client.rpc('apply_order_item_note_command', versioned);
        }
        if (hasKey(payload, 'quantity')) {
          return this.client.rpc('apply_order_item_quantity_command', versioned);
        }
      }
    }

    return this.client.rpc('apply_client_mutation', {
      ...versioned,
      requested_mutation_type: remoteMutationType(mutation),
    });
  }
}

interface RemoteError {
  readonly message: string;
  readonly code?: string;
  readonly details?: string;
}

function hasKey(payload: Json, key: string): boolean {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    !Array.isArray(payload) &&
    Object.prototype.hasOwnProperty.call(payload, key)
  );
}

function parseRemoteErrorDetails(error: { readonly code?: string; readonly details?: string }): {
  readonly code?: string;
  readonly serverVersion?: number;
  readonly serverPayload?: JsonValue;
} {
  const base = error.code ? { code: error.code } : {};
  if (!error.details) return base;

  try {
    const parsed = JSON.parse(error.details) as {
      readonly serverVersion?: unknown;
      readonly serverPayload?: unknown;
    };
    return {
      ...base,
      ...(typeof parsed.serverVersion === 'number' && Number.isSafeInteger(parsed.serverVersion)
        ? { serverVersion: parsed.serverVersion }
        : {}),
      ...(isJsonValue(parsed.serverPayload)
        ? { serverPayload: parsed.serverPayload as JsonValue }
        : {}),
    };
  } catch {
    return base;
  }
}

function isJsonValue(value: unknown): boolean {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return true;
  }
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === 'object') {
    return Object.values(value).every(isJsonValue);
  }
  return false;
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
