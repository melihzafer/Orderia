import uuid from 'react-native-uuid';
import {
  Check,
  CheckId,
  DeviceId,
  MutationId,
  OrderBatch,
  OrderBatchId,
  OrderItem,
  OrderItemId,
  OrderItemModifier,
  OrderItemModifierId,
  UserId,
  toDomainId,
} from '../../domain';
import { LocalDatabase, OutboxMutation, RepositoryScope } from '../../data/contracts';
import { CheckSplitLinePlan, CheckSplitPlan } from './checkSplitPlanner';

export interface ApplyCheckSplitInput {
  readonly database: LocalDatabase;
  readonly scope: Required<RepositoryScope>;
  readonly deviceId: DeviceId;
  readonly actorUserId: UserId;
  readonly sourceCheck: Check;
  readonly targetCheck?: Check;
  readonly plan: CheckSplitPlan;
  readonly now?: Date;
  readonly createUuid?: () => string;
}

export interface ApplyCheckSplitResult {
  readonly targetCheck: Check;
  readonly batch: OrderBatch;
  readonly movedItems: readonly OrderItem[];
  readonly updatedSourceItems: readonly OrderItem[];
}

/**
 * Plani yerel veritabanina yazar ve sunucuya tek bir komut olarak kuyruklar.
 * Cevrimdisi calisir: garson kasadan uzakta adisyonu bolebilir, cihaz ag
 * bulunca komut aynen tekrarlanabilir bicimde gonderilir.
 */
export async function applyCheckSplit(input: ApplyCheckSplitInput): Promise<ApplyCheckSplitResult> {
  const createUuid = input.createUuid ?? defaultUuid;
  const occurredAt = (input.now ?? new Date()).toISOString();
  const mutationId = toDomainId<MutationId>(createUuid());

  const targetCheck: Check =
    input.targetCheck ??
    ({
      id: toDomainId<CheckId>(createUuid()),
      ...input.scope,
      tableSessionId: input.sourceCheck.tableSessionId,
      name: input.plan.targetCheckName,
      status: 'open',
      openedBy: input.actorUserId,
      openedAt: occurredAt,
      version: 1,
      createdAt: occurredAt,
      updatedAt: occurredAt,
      syncStatus: 'pending',
      clientMutationId: mutationId,
    } satisfies Check);

  // Tasinan kalemler hedef adisyonun kendi partisine baglanir; boylece
  // order_batches -> checks referansi hicbir zaman capraz kalmaz.
  const batch: OrderBatch = {
    id: toDomainId<OrderBatchId>(createUuid()),
    ...input.scope,
    tableSessionId: input.sourceCheck.tableSessionId,
    checkId: targetCheck.id,
    createdBy: input.actorUserId,
    createdAt: occurredAt,
    clientMutationId: mutationId,
    syncStatus: 'pending',
  };

  const writes = input.plan.lines.map((line) =>
    planLineWrites(line, targetCheck, batch, input.actorUserId, occurredAt, mutationId, createUuid),
  );

  const mutation: OutboxMutation = {
    id: mutationId,
    ...input.scope,
    deviceId: input.deviceId,
    clientMutationId: mutationId,
    idempotencyKey: `${input.deviceId}:${mutationId}`,
    repository: 'checks',
    entityId: input.sourceCheck.id,
    operation: 'command',
    payload: {
      kind: 'split',
      sourceCheckId: input.sourceCheck.id,
      targetCheck: {
        id: targetCheck.id,
        name: targetCheck.name,
        openedAt: targetCheck.openedAt,
        isNew: !input.targetCheck,
      },
      batch: { id: batch.id, createdAt: batch.createdAt },
      moves: writes.map((write) => ({
        sourceItemId: write.line.sourceItem.id,
        expectedVersion: write.line.sourceItem.serverVersion ?? write.line.sourceItem.version,
        quantity: write.line.movedQuantity,
        mode: write.line.mode,
        ...(write.movedItem ? { newItemId: write.movedItem.id } : {}),
        modifiers: write.movedModifiers.map((modifier) => ({
          id: modifier.entity.id,
          sourceModifierId: modifier.sourceModifierId,
        })),
      })),
    },
    baseVersion: input.sourceCheck.serverVersion ?? input.sourceCheck.version,
    status: 'pending',
    attemptCount: 0,
    createdAt: occurredAt,
  };

  await input.database.transaction(async (transaction) => {
    if (!input.targetCheck) {
      await transaction.repository('checks').put(input.scope, targetCheck);
    }
    await transaction.repository('orderBatches').put(input.scope, batch);
    for (const write of writes) {
      await transaction
        .repository('orderItems')
        .put(input.scope, write.sourceItem, { expectedVersion: write.line.sourceItem.version });
      if (write.movedItem) {
        await transaction.repository('orderItems').put(input.scope, write.movedItem);
      }
      for (const modifier of write.movedModifiers) {
        await transaction.repository('orderItemModifiers').put(input.scope, modifier.entity);
      }
    }
    await transaction.outbox.enqueue(mutation);
  });

  return {
    targetCheck,
    batch,
    movedItems: writes.map((write) => write.movedItem ?? write.sourceItem),
    updatedSourceItems: writes.map((write) => write.sourceItem),
  };
}

interface LineWrites {
  readonly line: CheckSplitLinePlan;
  /** Kaynak adisyonda kalan (veya tamamen tasinan) satirin yeni hali. */
  readonly sourceItem: OrderItem;
  /** Kismi bolmede olusan yeni satir. */
  readonly movedItem?: OrderItem;
  readonly movedModifiers: readonly {
    readonly entity: OrderItemModifier;
    readonly sourceModifierId: OrderItemModifierId;
  }[];
}

function planLineWrites(
  line: CheckSplitLinePlan,
  targetCheck: Check,
  batch: OrderBatch,
  actorUserId: UserId,
  occurredAt: string,
  mutationId: MutationId,
  createUuid: () => string,
): LineWrites {
  if (line.mode === 'move') {
    return {
      line,
      sourceItem: {
        ...line.sourceItem,
        checkId: targetCheck.id,
        orderBatchId: batch.id,
        updatedBy: actorUserId,
        updatedAt: occurredAt,
        version: line.sourceItem.version + 1,
        syncStatus: 'pending',
        clientMutationId: mutationId,
      },
      movedModifiers: [],
    };
  }

  const movedItemId = toDomainId<OrderItemId>(createUuid());
  return {
    line,
    sourceItem: {
      ...line.sourceItem,
      quantity: line.remainingQuantity,
      updatedBy: actorUserId,
      updatedAt: occurredAt,
      version: line.sourceItem.version + 1,
      syncStatus: 'pending',
      clientMutationId: mutationId,
    },
    movedItem: {
      ...line.sourceItem,
      id: movedItemId,
      checkId: targetCheck.id,
      orderBatchId: batch.id,
      quantity: line.movedQuantity,
      createdBy: line.sourceItem.createdBy,
      updatedBy: actorUserId,
      createdAt: occurredAt,
      updatedAt: occurredAt,
      version: 1,
      syncStatus: 'pending',
      clientMutationId: mutationId,
    },
    movedModifiers: line.modifiers.map((modifier) => ({
      sourceModifierId: modifier.id,
      entity: {
        ...modifier,
        id: toDomainId<OrderItemModifierId>(createUuid()),
        orderItemId: movedItemId,
      },
    })),
  };
}

function defaultUuid(): string {
  const value = uuid.v4();
  if (typeof value !== 'string') {
    throw new Error('UUID generation failed');
  }
  return value;
}
