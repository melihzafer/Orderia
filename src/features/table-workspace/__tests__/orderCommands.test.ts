import {
  BranchId,
  CancellationReason,
  CancellationReasonId,
  DeviceId,
  MenuCategory,
  MenuCategoryId,
  MenuItem,
  MenuItemId,
  ModifierGroup,
  ModifierGroupId,
  ModifierOption,
  ModifierOptionId,
  OrganizationId,
  RestaurantTable,
  RestaurantTableId,
  UserId,
  toCurrencyCode,
  toDomainId,
} from '../../../domain';
import { RepositoryScope } from '../../../data/contracts';
import { InMemoryLocalDatabase } from '../../../data/testing/inMemoryLocalDatabase';
import { MutationPushError, OutboxPushWorker } from '../../../data/sync';
import {
  cancelOrderItem,
  markOrderItemsServed,
  resolveOrderItemNoteConflict,
  sendOrderBatch,
  updateTableSessionNote,
  updateOrderItemNote,
} from '../orderCommands';
import { loadTableWorkspace } from '../workspaceModel';

const organizationId = toDomainId<OrganizationId>('organization-1');
const branchId = toDomainId<BranchId>('branch-1');
const userId = toDomainId<UserId>('waiter-1');
const deviceId = toDomainId<DeviceId>('device-1');
const tableId = toDomainId<RestaurantTableId>('table-1');
const categoryId = toDomainId<MenuCategoryId>('category-1');
const productId = toDomainId<MenuItemId>('product-1');
const groupId = toDomainId<ModifierGroupId>('group-1');
const optionId = toDomainId<ModifierOptionId>('option-1');
const reasonId = toDomainId<CancellationReasonId>('reason-1');
const scope: Required<RepositoryScope> = { organizationId, branchId };
const timestamp = '2026-07-26T18:00:00.000Z';

describe('rapid table workspace commands', () => {
  it('projects the offline catalog and commits a named check order atomically', async () => {
    const database = new InMemoryLocalDatabase();
    await seedWorkspace(database);
    const workspace = await loadTableWorkspace(database, scope, tableId);

    expect(workspace?.products).toHaveLength(1);
    expect(workspace?.products[0].modifierGroups[0].options[0].name).toBe('Peynirli');

    const created = await sendOrderBatch({
      database,
      scope,
      deviceId,
      actorUserId: userId,
      tableId,
      checkName: 'Teras misafiri',
      lines: [
        {
          id: 'draft-1',
          product: workspace!.products[0],
          quantity: 2,
          note: 'Sos ayrı',
          selectedOptionIds: [optionId],
        },
      ],
      now: new Date(timestamp),
      createUuid: sequentialIds(),
    });

    expect(created.check.name).toBe('Teras misafiri');
    expect(created.items[0]).toMatchObject({
      createdBy: userId,
      nameSnapshot: 'Patates kızartması',
      note: 'Sos ayrı',
      quantity: 2,
      status: 'ordered',
      unitPriceMinor: 400,
    });
    const outbox = await database.outbox.list(scope, ['pending']);
    expect(outbox).toHaveLength(1);
    expect(outbox[0]).toMatchObject({
      operation: 'command',
      repository: 'orderBatches',
    });
    expect(outbox[0].payload).toMatchObject({
      items: [
        {
          menuItemId: productId,
          menuItemVersion: 3,
          modifierSelections: [{ optionId }],
        },
      ],
    });

    const reloaded = await loadTableWorkspace(database, scope, tableId);
    expect(reloaded?.checks).toHaveLength(1);
    expect(reloaded?.orderItems).toHaveLength(1);
    expect(reloaded?.orderItemModifiers).toHaveLength(1);
  });

  it('rejects missing required modifiers without leaving local records or outbox work', async () => {
    const database = new InMemoryLocalDatabase();
    await seedWorkspace(database);
    const workspace = await loadTableWorkspace(database, scope, tableId);

    await expect(
      sendOrderBatch({
        database,
        scope,
        deviceId,
        actorUserId: userId,
        tableId,
        checkName: 'Hesap 1',
        lines: [
          {
            id: 'draft-1',
            product: workspace!.products[0],
            quantity: 1,
            selectedOptionIds: [],
          },
        ],
        createUuid: sequentialIds(),
      }),
    ).rejects.toMatchObject({ code: 'INVALID_MODIFIER_SELECTION' });

    expect(await database.outbox.list(scope)).toHaveLength(0);
    expect((await database.repository('tableSessions').list(scope)).items).toHaveLength(0);
  });

  it('uses a reasoned command instead of deleting a sent item', async () => {
    const database = new InMemoryLocalDatabase();
    await seedWorkspace(database);
    const workspace = await loadTableWorkspace(database, scope, tableId);
    const sent = await sendOrderBatch({
      database,
      scope,
      deviceId,
      actorUserId: userId,
      tableId,
      checkName: 'Hesap 1',
      lines: [
        {
          id: 'draft-1',
          product: workspace!.products[0],
          quantity: 1,
          selectedOptionIds: [optionId],
        },
      ],
      now: new Date(timestamp),
      createUuid: sequentialIds(),
    });

    const cancelled = await cancelOrderItem({
      database,
      scope,
      deviceId,
      actorUserId: userId,
      item: sent.items[0],
      reasonId,
      now: new Date('2026-07-26T18:01:00.000Z'),
      createUuid: () => 'cancel-mutation',
    });

    expect(cancelled).toMatchObject({
      cancellationReasonId: reasonId,
      cancelledBy: userId,
      status: 'cancelled',
      version: 2,
    });
    const mutations = await database.outbox.list(scope, ['pending']);
    expect(mutations).toHaveLength(2);
    expect(mutations[1]).toMatchObject({
      entityId: sent.items[0].id,
      operation: 'command',
      payload: { reasonId },
      repository: 'orderItems',
    });
  });

  it('marks all ordered drink lines as served in one local transaction', async () => {
    const database = new InMemoryLocalDatabase();
    await seedWorkspace(database);
    const workspace = await loadTableWorkspace(database, scope, tableId);
    const sent = await sendOrderBatch({
      database,
      scope,
      deviceId,
      actorUserId: userId,
      tableId,
      checkName: 'Hesap 1',
      lines: [
        {
          id: 'draft-1',
          product: workspace!.products[0],
          quantity: 1,
          selectedOptionIds: [optionId],
        },
      ],
      createUuid: sequentialIds(),
    });

    const served = await markOrderItemsServed({
      database,
      scope,
      deviceId,
      actorUserId: userId,
      items: sent.items,
      createUuid: () => 'served-mutation',
    });

    expect(served[0]).toMatchObject({ status: 'served', version: 2 });
    expect(await database.outbox.list(scope, ['pending'])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityId: sent.items[0].id,
          payload: { served: true },
        }),
      ]),
    );
  });

  it('stores a physical location note with an idempotent session mutation', async () => {
    const database = new InMemoryLocalDatabase();
    await seedWorkspace(database);
    const workspace = await loadTableWorkspace(database, scope, tableId);
    const sent = await sendOrderBatch({
      database,
      scope,
      deviceId,
      actorUserId: userId,
      tableId,
      checkName: 'Hesap 1',
      lines: [
        {
          id: 'draft-1',
          product: workspace!.products[0],
          quantity: 1,
          selectedOptionIds: [optionId],
        },
      ],
      createUuid: sequentialIds(),
    });

    const updated = await updateTableSessionNote({
      database,
      scope,
      deviceId,
      actorUserId: userId,
      session: sent.session,
      note: 'Mavi çadırın yanında',
      createUuid: () => 'location-note-mutation',
    });

    expect(updated).toMatchObject({ note: 'Mavi çadırın yanında', version: 2 });
    expect(await database.outbox.list(scope, ['pending'])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityId: sent.session.id,
          payload: { note: 'Mavi çadırın yanında' },
          repository: 'tableSessions',
        }),
      ]),
    );
  });

  it('retains both note versions and lets the waiter explicitly keep the local note', async () => {
    const database = new InMemoryLocalDatabase();
    await seedWorkspace(database);
    const workspace = await loadTableWorkspace(database, scope, tableId);
    const sent = await sendOrderBatch({
      database,
      scope,
      deviceId,
      actorUserId: userId,
      tableId,
      checkName: 'Hesap 1',
      lines: [
        {
          id: 'draft-1',
          product: workspace!.products[0],
          quantity: 1,
          selectedOptionIds: [optionId],
        },
      ],
      now: new Date(timestamp),
      createUuid: sequentialIds(),
    });
    await markPendingApplied(database);
    const localEdit = await updateOrderItemNote({
      database,
      scope,
      deviceId,
      actorUserId: userId,
      item: { ...sent.items[0], syncStatus: 'synced', serverVersion: 1 },
      note: 'Benim notum',
      now: new Date('2026-07-26T18:02:00.000Z'),
      createUuid: () => 'note-mutation',
    });
    const worker = new OutboxPushWorker(
      database,
      {
        push: jest.fn().mockRejectedValue(
          new MutationPushError('version_conflict', {
            code: 'P0001',
            serverVersion: 2,
            serverPayload: {
              id: localEdit.id,
              note: 'Diğer garsonun notu',
              updated_at: '2026-07-26T18:01:00.000Z',
              updated_by: 'waiter-2',
              version: 2,
            },
          }),
        ),
      },
      { now: () => new Date('2026-07-26T18:03:00.000Z') },
    );

    await expect(worker.runOnce(scope)).resolves.toMatchObject({ conflicted: 1 });
    const [conflict] = await database.syncState.listConflicts(scope, ['unresolved']);
    expect(conflict).toMatchObject({
      entityId: localEdit.id,
      localPayload: { note: 'Benim notum' },
      serverPayload: { note: 'Diğer garsonun notu' },
      serverVersion: 2,
    });

    const resolved = await resolveOrderItemNoteConflict({
      database,
      scope,
      deviceId,
      actorUserId: userId,
      item: localEdit,
      conflict,
      resolution: 'local',
      now: new Date('2026-07-26T18:04:00.000Z'),
      createUuid: () => 'note-retry',
    });

    expect(resolved).toMatchObject({
      note: 'Benim notum',
      serverVersion: 2,
      syncStatus: 'pending',
      version: 3,
    });
    await expect(database.outbox.getById(conflict.mutationId)).resolves.toMatchObject({
      status: 'resolved',
    });
    expect(await database.outbox.list(scope, ['pending'])).toEqual([
      expect.objectContaining({
        baseVersion: 2,
        id: 'note-retry',
        payload: { note: 'Benim notum' },
      }),
    ]);
    await expect(database.syncState.getConflict(conflict.id)).resolves.toMatchObject({
      status: 'resolved_local',
    });
  });
});

async function seedWorkspace(database: InMemoryLocalDatabase): Promise<void> {
  const table: RestaurantTable = {
    id: tableId,
    ...scope,
    hallId: toDomainId('hall-1'),
    label: 'Masa 4',
    sequenceNumber: 4,
    sortOrder: 4,
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: 'synced',
  };
  const category: MenuCategory = {
    id: categoryId,
    ...scope,
    name: 'Atıştırmalık',
    sortOrder: 1,
    isActive: true,
    createdBy: userId,
    version: 2,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: 'synced',
  };
  const product: MenuItem = {
    id: productId,
    ...scope,
    categoryId,
    name: 'Patates kızartması',
    priceMinor: 400,
    currencyCode: toCurrencyCode('EUR'),
    taxRateBasisPoints: 2000,
    isActive: true,
    isAvailable: true,
    createdBy: userId,
    version: 3,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: 'synced',
  };
  const group: ModifierGroup = {
    id: groupId,
    ...scope,
    menuItemId: productId,
    name: 'Peynir',
    selectionType: 'single',
    minimumChoices: 1,
    maximumChoices: 1,
    isRequired: true,
    sortOrder: 1,
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: 'synced',
  };
  const option: ModifierOption = {
    id: optionId,
    ...scope,
    modifierGroupId: groupId,
    name: 'Peynirli',
    priceDeltaMinor: 100,
    isDefault: true,
    isActive: true,
    sortOrder: 1,
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: 'synced',
  };
  const reason: CancellationReason = {
    id: reasonId,
    ...scope,
    name: 'Müşteri vazgeçti',
    requiresManager: false,
    isActive: true,
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: 'synced',
  };

  await database.transaction(async (transaction) => {
    await transaction.repository('restaurantTables').put(scope, table);
    await transaction.repository('menuCategories').put(scope, category);
    await transaction.repository('menuItems').put(scope, product);
    await transaction.repository('modifierGroups').put(scope, group);
    await transaction.repository('modifierOptions').put(scope, option);
    await transaction.repository('cancellationReasons').put(scope, reason);
  });
}

function sequentialIds(): () => string {
  let index = 0;
  return () => `generated-${++index}`;
}

async function markPendingApplied(database: InMemoryLocalDatabase): Promise<void> {
  await database.transaction(async (transaction) => {
    const [claimed] = await transaction.outbox.claimNext(scope, 1, timestamp);
    await transaction.outbox.transition(claimed.id, 'processing', 'applied', {
      appliedAt: timestamp,
    });
  });
}
