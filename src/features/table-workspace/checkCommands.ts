import uuid from 'react-native-uuid';
import {
  CancellationReasonId,
  Check,
  DeviceId,
  MutationId,
  OrderItem,
  OrderItemModifier,
  UserId,
  assertCheckTransition,
  assertOrderItemTransition,
  toDomainId,
} from '../../domain';
import { LocalDatabase, OutboxMutation, RepositoryScope } from '../../data/contracts';

/**
 * Hesap düzeyinde komutlar: yeniden adlandırma ve toptan iptal ("silme").
 *
 * `orderCommands.ts`'teki `updateTableSessionNote` (versiyon artırma + tek
 * outbox mutation) ve `voidOrderItemQuantity` (tam iptal dalı) desenlerini
 * izler — burada yeni bir kalıp icat edilmiyor.
 */

export interface RenameCheckInput {
  readonly database: LocalDatabase;
  readonly scope: Required<RepositoryScope>;
  readonly deviceId: DeviceId;
  readonly actorUserId: UserId;
  readonly check: Check;
  readonly name: string;
  readonly now?: Date;
  readonly createUuid?: () => string;
}

export async function renameCheck(input: RenameCheckInput): Promise<Check> {
  if (input.check.status !== 'open') {
    throw new Error('Only an open check can be renamed');
  }
  const name = input.name.trim();
  if (!name) {
    throw new Error('A check name is required');
  }
  const updatedAt = (input.now ?? new Date()).toISOString();
  const mutationId = toDomainId<MutationId>((input.createUuid ?? defaultUuid)());
  const updated: Check = {
    ...input.check,
    name,
    updatedAt,
    version: input.check.version + 1,
    syncStatus: 'pending',
    clientMutationId: mutationId,
  };
  const mutation: OutboxMutation = {
    id: mutationId,
    ...input.scope,
    deviceId: input.deviceId,
    clientMutationId: mutationId,
    idempotencyKey: `${input.deviceId}:${mutationId}`,
    repository: 'checks',
    entityId: input.check.id,
    operation: 'command',
    payload: { name },
    baseVersion: input.check.serverVersion ?? input.check.version,
    status: 'pending',
    attemptCount: 0,
    createdAt: updatedAt,
  };

  return input.database.transaction(async (transaction) => {
    const stored = await transaction.repository('checks').put(input.scope, updated, {
      expectedVersion: input.check.version,
    });
    await transaction.outbox.enqueue(mutation);
    return stored;
  });
}

export interface VoidCheckInput {
  readonly database: LocalDatabase;
  readonly scope: Required<RepositoryScope>;
  readonly deviceId: DeviceId;
  readonly actorUserId: UserId;
  readonly check: Check;
  readonly items: readonly OrderItem[];
  readonly modifiers: readonly OrderItemModifier[];
  readonly reasonId: CancellationReasonId;
  /** Onaylanmış ödemesi olan bir hesap iptal edilemez. */
  readonly hasConfirmedPayments: boolean;
  readonly now?: Date;
  readonly createUuid?: () => string;
}

export interface VoidCheckResult {
  readonly check: Check;
  readonly voidedItems: readonly OrderItem[];
}

/**
 * Hesabı ve içindeki tüm aktif satırları tek bir gerekçeyle iptal eder.
 * Tek satır iptaliyle aynı denetim izini bırakır — "sil" aslında hesabı ve
 * her satırını aynı nedenle `cancelled`/`voided` durumuna taşır, hiçbir kayıt
 * gerçekten silinmez.
 */
export async function voidCheck(input: VoidCheckInput): Promise<VoidCheckResult> {
  assertCheckTransition(input.check.status, 'voided');
  if (input.hasConfirmedPayments) {
    throw new Error('A check with confirmed payments cannot be voided');
  }

  const occurredAt = (input.now ?? new Date()).toISOString();
  const createUuid = input.createUuid ?? defaultUuid;
  const activeItems = input.items.filter(
    (item) => item.checkId === input.check.id && item.status !== 'cancelled',
  );

  const itemUpdates = activeItems.map((item) => {
    assertOrderItemTransition(item.status, 'cancelled');
    const mutationId = toDomainId<MutationId>(createUuid());
    const voided: OrderItem = {
      ...item,
      status: 'cancelled',
      updatedBy: input.actorUserId,
      updatedAt: occurredAt,
      cancelledBy: input.actorUserId,
      cancelledAt: occurredAt,
      cancellationReasonId: input.reasonId,
      version: item.version + 1,
      syncStatus: 'pending',
      clientMutationId: mutationId,
    };
    const mutation: OutboxMutation = {
      id: mutationId,
      ...input.scope,
      deviceId: input.deviceId,
      clientMutationId: mutationId,
      idempotencyKey: `${input.deviceId}:${mutationId}`,
      repository: 'orderItems',
      entityId: item.id,
      operation: 'command',
      payload: { reasonId: input.reasonId },
      baseVersion: item.serverVersion ?? item.version,
      status: 'pending',
      attemptCount: 0,
      createdAt: occurredAt,
    };
    return { item, mutation, voided };
  });

  const checkMutationId = toDomainId<MutationId>(createUuid());
  const voidedCheck: Check = {
    ...input.check,
    status: 'voided',
    updatedAt: occurredAt,
    version: input.check.version + 1,
    syncStatus: 'pending',
    clientMutationId: checkMutationId,
  };
  const checkMutation: OutboxMutation = {
    id: checkMutationId,
    ...input.scope,
    deviceId: input.deviceId,
    clientMutationId: checkMutationId,
    idempotencyKey: `${input.deviceId}:${checkMutationId}`,
    repository: 'checks',
    entityId: input.check.id,
    operation: 'command',
    payload: { voided: true, reasonId: input.reasonId },
    baseVersion: input.check.serverVersion ?? input.check.version,
    status: 'pending',
    attemptCount: 0,
    createdAt: occurredAt,
  };

  return input.database.transaction(async (transaction) => {
    const storedItems: OrderItem[] = [];
    for (const update of itemUpdates) {
      const stored = await transaction.repository('orderItems').put(input.scope, update.voided, {
        expectedVersion: update.item.version,
      });
      await transaction.outbox.enqueue(update.mutation);
      storedItems.push(stored);
    }
    const storedCheck = await transaction.repository('checks').put(input.scope, voidedCheck, {
      expectedVersion: input.check.version,
    });
    await transaction.outbox.enqueue(checkMutation);
    return { check: storedCheck, voidedItems: storedItems };
  });
}

function defaultUuid(): string {
  const value = uuid.v4();
  if (typeof value !== 'string') {
    throw new Error('UUID generation failed');
  }
  return value;
}
