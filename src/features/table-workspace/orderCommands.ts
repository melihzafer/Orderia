import uuid from 'react-native-uuid';
import {
  CancellationReasonId,
  Check,
  CheckId,
  DeviceId,
  JsonValue,
  MenuItemId,
  ModifierOptionId,
  MutationId,
  OrderBatch,
  OrderBatchId,
  OrderItem,
  OrderItemId,
  OrderItemModifier,
  OrderItemModifierId,
  RestaurantTableId,
  TableSession,
  TableSessionId,
  UserId,
  assertOrderItemTransition,
  toDomainId,
} from '../../domain';
import { LocalDatabase, OutboxMutation, RepositoryScope, SyncConflict } from '../../data/contracts';
import { WorkspaceProduct } from './workspaceModel';

export interface DraftOrderLine {
  readonly id: string;
  readonly product: WorkspaceProduct;
  readonly quantity: number;
  readonly note?: string;
  readonly selectedOptionIds: readonly ModifierOptionId[];
}

export interface SendOrderBatchInput {
  readonly database: LocalDatabase;
  readonly scope: Required<RepositoryScope>;
  readonly deviceId: DeviceId;
  readonly actorUserId: UserId;
  readonly tableId: RestaurantTableId;
  readonly session?: TableSession;
  readonly check?: Check;
  readonly checkName: string;
  readonly lines: readonly DraftOrderLine[];
  readonly now?: Date;
  readonly createUuid?: () => string;
}

export interface SendOrderBatchResult {
  readonly session: TableSession;
  readonly check: Check;
  readonly batch: OrderBatch;
  readonly items: readonly OrderItem[];
}

export class OrderDraftValidationError extends Error {
  constructor(
    message: string,
    readonly code:
      'EMPTY_BATCH' | 'INVALID_QUANTITY' | 'INVALID_MODIFIER_SELECTION' | 'CHECK_NAME_REQUIRED',
  ) {
    super(message);
    this.name = 'OrderDraftValidationError';
  }
}

export async function sendOrderBatch(input: SendOrderBatchInput): Promise<SendOrderBatchResult> {
  validateDraft(input);
  const createUuid = input.createUuid ?? defaultUuid;
  const createdAt = (input.now ?? new Date()).toISOString();
  const mutationId = toDomainId<MutationId>(createUuid());
  const session =
    input.session ??
    ({
      id: toDomainId<TableSessionId>(createUuid()),
      ...input.scope,
      tableId: input.tableId,
      status: 'open',
      openedBy: input.actorUserId,
      openedAt: createdAt,
      version: 1,
      createdAt,
      updatedAt: createdAt,
      syncStatus: 'pending',
      clientMutationId: mutationId,
    } satisfies TableSession);
  const check =
    input.check ??
    ({
      id: toDomainId<CheckId>(createUuid()),
      ...input.scope,
      tableSessionId: session.id,
      name: input.checkName.trim(),
      status: 'open',
      openedBy: input.actorUserId,
      openedAt: createdAt,
      version: 1,
      createdAt,
      updatedAt: createdAt,
      syncStatus: 'pending',
      clientMutationId: mutationId,
    } satisfies Check);
  const batch: OrderBatch = {
    id: toDomainId<OrderBatchId>(createUuid()),
    ...input.scope,
    tableSessionId: session.id,
    checkId: check.id,
    createdBy: input.actorUserId,
    createdAt,
    clientMutationId: mutationId,
    syncStatus: 'pending',
  };
  const itemRecords = input.lines.map((line) =>
    createOrderItem(input, batch, line, createdAt, mutationId, createUuid),
  );
  const modifierRecords = itemRecords.flatMap(({ item, line }) =>
    createOrderItemModifiers(item.id, line, createUuid),
  );
  const mutation: OutboxMutation = {
    id: mutationId,
    ...input.scope,
    deviceId: input.deviceId,
    clientMutationId: mutationId,
    idempotencyKey: `${input.deviceId}:${mutationId}`,
    repository: 'orderBatches',
    entityId: batch.id,
    operation: 'command',
    payload: {
      tableId: input.tableId,
      session: {
        id: session.id,
        openedAt: session.openedAt,
      },
      check: {
        id: check.id,
        name: check.name,
        openedAt: check.openedAt,
      },
      batch: {
        id: batch.id,
        createdAt: batch.createdAt,
      },
      items: itemRecords.map(({ item, line }) => {
        const lineModifiers = modifierRecords.filter(
          ({ entity }) => entity.orderItemId === item.id,
        );
        return {
          id: item.id,
          menuItemId: line.product.id,
          menuItemVersion: line.product.version,
          quantity: line.quantity,
          ...(line.note ? { note: line.note } : {}),
          modifierSelections: lineModifiers.map(({ entity, optionId }) => ({
            id: entity.id,
            optionId,
          })),
        };
      }),
    },
    status: 'pending',
    attemptCount: 0,
    createdAt,
  };

  await input.database.transaction(async (transaction) => {
    if (!input.session) {
      await transaction.repository('tableSessions').put(input.scope, session);
    }
    if (!input.check) {
      await transaction.repository('checks').put(input.scope, check);
    }
    await transaction.repository('orderBatches').put(input.scope, batch);
    for (const { item } of itemRecords) {
      await transaction.repository('orderItems').put(input.scope, item);
    }
    for (const { entity } of modifierRecords) {
      await transaction.repository('orderItemModifiers').put(input.scope, entity);
    }
    await transaction.outbox.enqueue(mutation);
  });

  return {
    session,
    check,
    batch,
    items: itemRecords.map(({ item }) => item),
  };
}

export interface CancelOrderItemInput {
  readonly database: LocalDatabase;
  readonly scope: Required<RepositoryScope>;
  readonly deviceId: DeviceId;
  readonly actorUserId: UserId;
  readonly item: OrderItem;
  readonly reasonId: CancellationReasonId;
  readonly now?: Date;
  readonly createUuid?: () => string;
}

export async function cancelOrderItem(input: CancelOrderItemInput): Promise<OrderItem> {
  assertOrderItemTransition(input.item.status, 'cancelled');
  const cancelledAt = (input.now ?? new Date()).toISOString();
  const mutationId = toDomainId<MutationId>((input.createUuid ?? defaultUuid)());
  const cancelled: OrderItem = {
    ...input.item,
    status: 'cancelled',
    updatedBy: input.actorUserId,
    updatedAt: cancelledAt,
    cancelledBy: input.actorUserId,
    cancelledAt,
    cancellationReasonId: input.reasonId,
    version: input.item.version + 1,
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
    entityId: input.item.id,
    operation: 'command',
    payload: {
      reasonId: input.reasonId,
    },
    baseVersion: input.item.serverVersion ?? input.item.version,
    status: 'pending',
    attemptCount: 0,
    createdAt: cancelledAt,
  };

  return input.database.transaction(async (transaction) => {
    const stored = await transaction.repository('orderItems').put(input.scope, cancelled, {
      expectedVersion: input.item.version,
    });
    await transaction.outbox.enqueue(mutation);
    return stored;
  });
}

export interface UpdateOrderItemNoteInput {
  readonly database: LocalDatabase;
  readonly scope: Required<RepositoryScope>;
  readonly deviceId: DeviceId;
  readonly actorUserId: UserId;
  readonly item: OrderItem;
  readonly note?: string;
  readonly now?: Date;
  readonly createUuid?: () => string;
}

export async function updateOrderItemNote(input: UpdateOrderItemNoteInput): Promise<OrderItem> {
  if (input.item.status === 'cancelled') {
    throw new Error('A cancelled order item note cannot be edited');
  }
  const updatedAt = (input.now ?? new Date()).toISOString();
  const mutationId = toDomainId<MutationId>((input.createUuid ?? defaultUuid)());
  const note = input.note?.trim() || undefined;
  const updated: OrderItem = {
    ...input.item,
    note,
    updatedBy: input.actorUserId,
    updatedAt,
    version: input.item.version + 1,
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
    entityId: input.item.id,
    operation: 'command',
    payload: { note: note ?? null },
    baseVersion: input.item.serverVersion ?? input.item.version,
    status: 'pending',
    attemptCount: 0,
    createdAt: updatedAt,
  };

  return input.database.transaction(async (transaction) => {
    const stored = await transaction.repository('orderItems').put(input.scope, updated, {
      expectedVersion: input.item.version,
    });
    await transaction.outbox.enqueue(mutation);
    return stored;
  });
}

export type NoteConflictResolution = 'server' | 'local';

export interface ResolveOrderItemNoteConflictInput {
  readonly database: LocalDatabase;
  readonly scope: Required<RepositoryScope>;
  readonly deviceId: DeviceId;
  readonly actorUserId: UserId;
  readonly item: OrderItem;
  readonly conflict: SyncConflict;
  readonly resolution: NoteConflictResolution;
  readonly now?: Date;
  readonly createUuid?: () => string;
}

export async function resolveOrderItemNoteConflict(
  input: ResolveOrderItemNoteConflictInput,
): Promise<OrderItem> {
  if (
    input.conflict.repository !== 'orderItems' ||
    input.conflict.entityId !== input.item.id ||
    input.conflict.status !== 'unresolved'
  ) {
    throw new Error('The note conflict does not belong to this order item');
  }
  const occurredAt = (input.now ?? new Date()).toISOString();
  const oldMutation = await input.database.outbox.getById(input.conflict.mutationId);
  if (!oldMutation || oldMutation.status !== 'conflict') {
    throw new Error('The conflicted note mutation is no longer available');
  }
  const serverPayload = jsonRecord(input.conflict.serverPayload);
  const serverNote =
    typeof serverPayload.note === 'string' && serverPayload.note.trim()
      ? serverPayload.note.trim()
      : undefined;
  const serverUpdatedAt =
    typeof serverPayload.updated_at === 'string' ? serverPayload.updated_at : occurredAt;
  const serverUpdatedBy =
    typeof serverPayload.updated_by === 'string'
      ? toDomainId<UserId>(serverPayload.updated_by)
      : input.item.updatedBy;
  const localPayload = jsonRecord(input.conflict.localPayload);
  const localNote =
    typeof localPayload.note === 'string' && localPayload.note.trim()
      ? localPayload.note.trim()
      : undefined;
  const resolvedEntity: OrderItem =
    input.resolution === 'server'
      ? {
          ...input.item,
          note: serverNote,
          updatedAt: serverUpdatedAt,
          updatedBy: serverUpdatedBy,
          version: input.conflict.serverVersion,
          syncStatus: 'synced',
          serverVersion: input.conflict.serverVersion,
          lastSyncedAt: occurredAt,
        }
      : {
          ...input.item,
          note: localNote,
          updatedAt: occurredAt,
          updatedBy: input.actorUserId,
          version: input.conflict.serverVersion + 1,
          syncStatus: 'pending',
          serverVersion: input.conflict.serverVersion,
        };
  const retryMutationId =
    input.resolution === 'local'
      ? toDomainId<MutationId>((input.createUuid ?? defaultUuid)())
      : undefined;
  const retryMutation: OutboxMutation | undefined = retryMutationId
    ? {
        id: retryMutationId,
        ...input.scope,
        deviceId: input.deviceId,
        clientMutationId: retryMutationId,
        idempotencyKey: `${input.deviceId}:${retryMutationId}`,
        repository: 'orderItems',
        entityId: input.item.id,
        operation: 'command',
        payload: { note: localNote ?? null },
        baseVersion: input.conflict.serverVersion,
        status: 'pending',
        attemptCount: 0,
        createdAt: occurredAt,
      }
    : undefined;

  return input.database.transaction(async (transaction) => {
    await transaction.outbox.transition(input.conflict.mutationId, 'conflict', 'resolved', {
      appliedAt: occurredAt,
      errorCode: undefined,
      errorMessage: undefined,
    });
    await transaction.syncState.resolveConflict(
      input.conflict.id,
      input.resolution === 'server' ? 'resolved_server' : 'resolved_local',
      occurredAt,
      {
        note: input.resolution === 'server' ? (serverNote ?? null) : (localNote ?? null),
      },
    );
    const stored = await transaction
      .repository('orderItems')
      .put(input.scope, resolvedEntity, { expectedVersion: input.item.version });
    if (retryMutation) {
      await transaction.outbox.enqueue(retryMutation);
    }
    return stored;
  });
}

function validateDraft(input: SendOrderBatchInput): void {
  if (input.lines.length === 0) {
    throw new OrderDraftValidationError('At least one product is required', 'EMPTY_BATCH');
  }
  if (!input.check && !input.checkName.trim()) {
    throw new OrderDraftValidationError('A check name is required', 'CHECK_NAME_REQUIRED');
  }

  for (const line of input.lines) {
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 999) {
      throw new OrderDraftValidationError(
        `Invalid quantity for ${line.product.name}`,
        'INVALID_QUANTITY',
      );
    }
    const selected = new Set(line.selectedOptionIds);
    if (selected.size !== line.selectedOptionIds.length) {
      throw new OrderDraftValidationError(
        `Duplicate modifier for ${line.product.name}`,
        'INVALID_MODIFIER_SELECTION',
      );
    }

    for (const group of line.product.modifierGroups) {
      const availableIds = new Set(group.options.map((option) => option.id));
      const selectedCount = line.selectedOptionIds.filter((id) => availableIds.has(id)).length;
      const minimum = group.isRequired ? Math.max(1, group.minimumChoices) : group.minimumChoices;
      const maximum =
        group.selectionType === 'single' ? 1 : (group.maximumChoices ?? Number.MAX_SAFE_INTEGER);
      if (selectedCount < minimum || selectedCount > maximum) {
        throw new OrderDraftValidationError(
          `Invalid ${group.name} selection for ${line.product.name}`,
          'INVALID_MODIFIER_SELECTION',
        );
      }
    }
    const validOptionIds = new Set(
      line.product.modifierGroups.flatMap((group) => group.options.map((option) => option.id)),
    );
    if (line.selectedOptionIds.some((id) => !validOptionIds.has(id))) {
      throw new OrderDraftValidationError(
        `Unknown modifier for ${line.product.name}`,
        'INVALID_MODIFIER_SELECTION',
      );
    }
  }
}

function createOrderItem(
  input: SendOrderBatchInput,
  batch: OrderBatch,
  line: DraftOrderLine,
  createdAt: string,
  mutationId: MutationId,
  createUuid: () => string,
): { readonly item: OrderItem; readonly line: DraftOrderLine } {
  return {
    line,
    item: {
      id: toDomainId<OrderItemId>(createUuid()),
      ...input.scope,
      tableSessionId: batch.tableSessionId,
      checkId: batch.checkId,
      orderBatchId: batch.id,
      menuItemId: toDomainId<MenuItemId>(line.product.id),
      nameSnapshot: line.product.name,
      categoryIdSnapshot: line.product.categoryId,
      categoryNameSnapshot: line.product.categoryName,
      unitPriceMinor: line.product.priceMinor,
      currencyCode: line.product.currencyCode,
      taxRateBasisPoints: line.product.taxRateBasisPoints,
      quantity: line.quantity,
      status: 'ordered',
      ...(line.note?.trim() ? { note: line.note.trim() } : {}),
      createdBy: input.actorUserId,
      updatedBy: input.actorUserId,
      originalTableId: input.tableId,
      originalTableSessionId: batch.tableSessionId,
      version: 1,
      createdAt,
      updatedAt: createdAt,
      syncStatus: 'pending',
      clientMutationId: mutationId,
    },
  };
}

function createOrderItemModifiers(
  orderItemId: OrderItemId,
  line: DraftOrderLine,
  createUuid: () => string,
): readonly {
  readonly entity: OrderItemModifier;
  readonly optionId: ModifierOptionId;
}[] {
  const selected = new Set(line.selectedOptionIds);
  return line.product.modifierGroups.flatMap((group) =>
    group.options
      .filter((option) => selected.has(option.id))
      .map((option) => ({
        optionId: option.id,
        entity: {
          id: toDomainId<OrderItemModifierId>(createUuid()),
          orderItemId,
          modifierGroupNameSnapshot: group.name,
          modifierOptionNameSnapshot: option.name,
          priceDeltaMinor: option.priceDeltaMinor,
          quantity: 1,
        },
      })),
  );
}

function defaultUuid(): string {
  const value = uuid.v4();
  if (typeof value !== 'string') {
    throw new Error('UUID generation failed');
  }
  return value;
}

function jsonRecord(value: JsonValue): Readonly<Record<string, JsonValue>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }
  return value;
}
