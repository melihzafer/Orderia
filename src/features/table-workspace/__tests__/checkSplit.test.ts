import {
  BranchId,
  CancellationReason,
  CancellationReasonId,
  Check,
  DeviceId,
  MenuCategory,
  MenuCategoryId,
  MenuItem,
  MenuItemId,
  OrderItem,
  OrganizationId,
  Payment,
  PaymentAllocation,
  PaymentAllocationId,
  PaymentId,
  RestaurantTable,
  RestaurantTableId,
  UserId,
  calculateCheckTotal,
  toCurrencyCode,
  toDomainId,
} from '../../../domain';
import { RepositoryScope } from '../../../data/contracts';
import { InMemoryLocalDatabase } from '../../../data/testing/inMemoryLocalDatabase';
import { applyCheckSplit } from '../checkSplitCommands';
import {
  buildCheckSplitPlan,
  buildSplittableOrderItems,
  groupSplittableItemsByNote,
} from '../checkSplitPlanner';
import { sendOrderBatch, voidOrderItemQuantity } from '../orderCommands';
import { loadTableWorkspace } from '../workspaceModel';

const organizationId = toDomainId<OrganizationId>('organization-1');
const branchId = toDomainId<BranchId>('branch-1');
const userId = toDomainId<UserId>('waiter-1');
const deviceId = toDomainId<DeviceId>('device-1');
const tableId = toDomainId<RestaurantTableId>('table-1');
const categoryId = toDomainId<MenuCategoryId>('category-1');
const beerId = toDomainId<MenuItemId>('product-beer');
const colaId = toDomainId<MenuItemId>('product-cola');
const reasonId = toDomainId<CancellationReasonId>('reason-1');
const scope: Required<RepositoryScope> = { organizationId, branchId };
const timestamp = '2026-07-31T18:00:00.000Z';

describe('one table, four guests, four receipts', () => {
  it('splits a shared check into a per-guest check and moves only the guest quantity', async () => {
    const database = new InMemoryLocalDatabase();
    await seedWorkspace(database);
    const workspace = await loadTableWorkspace(database, scope, tableId);
    const beer = workspace!.products.find((product) => product.id === beerId)!;
    const cola = workspace!.products.find((product) => product.id === colaId)!;

    // Masa tek adisyonla acildi: 4 bira, 1 kola.
    const sent = await sendOrderBatch({
      database,
      scope,
      deviceId,
      actorUserId: userId,
      tableId,
      checkName: 'Masa 4',
      lines: [
        { id: 'draft-1', product: beer, quantity: 4, selectedOptionIds: [] },
        { id: 'draft-2', product: cola, quantity: 1, note: 'Ayse', selectedOptionIds: [] },
      ],
      now: new Date(timestamp),
      createUuid: sequentialIds('order'),
    });

    const splittable = buildSplittableOrderItems(sent.check, sent.items, [], [], []);
    expect(splittable.map((entry) => entry.movableQuantity)).toEqual([4, 1]);

    const beerItem = sent.items.find((item) => item.menuItemId === beerId)!;
    const colaItem = sent.items.find((item) => item.menuItemId === colaId)!;

    // Ayse kendi hesabini istiyor: 1 bira + 1 kola yeni adisyona.
    const plan = buildCheckSplitPlan({
      sourceCheck: sent.check,
      targetCheckName: 'Ayse',
      items: sent.items,
      modifiers: [],
      payments: [],
      allocations: [],
      moves: [
        { orderItemId: beerItem.id, quantity: 1 },
        { orderItemId: colaItem.id, quantity: 1 },
      ],
    });

    expect(plan.lines.map((line) => line.mode)).toEqual(['split', 'move']);
    expect(plan.movedTotalMinor).toBe(500 + 300);
    expect(plan.sourceRemainingTotalMinor).toBe(3 * 500);
    expect(plan.emptiesSourceCheck).toBe(false);

    const applied = await applyCheckSplit({
      database,
      scope,
      deviceId,
      actorUserId: userId,
      sourceCheck: sent.check,
      plan,
      now: new Date('2026-07-31T19:00:00.000Z'),
      createUuid: sequentialIds('split'),
    });

    expect(applied.targetCheck.name).toBe('Ayse');

    const reloaded = await loadTableWorkspace(database, scope, tableId);
    expect(reloaded?.checks).toHaveLength(2);
    const sourceTotal = calculateCheckTotal(sent.check.id, reloaded!.orderItems, []);
    const targetTotal = calculateCheckTotal(applied.targetCheck.id, reloaded!.orderItems, []);
    expect(sourceTotal).toBe(1500);
    expect(targetTotal).toBe(800);

    // Kaynak adisyon 3 bira ile duruyor, kola tamamen tasindi.
    const sourceItems = reloaded!.orderItems.filter((item) => item.checkId === sent.check.id);
    expect(sourceItems).toHaveLength(1);
    expect(sourceItems[0]).toMatchObject({ nameSnapshot: 'Bira', quantity: 3 });

    // Sunucuya tek bir tekrar edilebilir komut gitti.
    const outbox = await database.outbox.list(scope, ['pending']);
    const splitMutation = outbox[outbox.length - 1];
    expect(splitMutation).toMatchObject({
      entityId: sent.check.id,
      operation: 'command',
      repository: 'checks',
    });
    expect(splitMutation.payload).toMatchObject({
      kind: 'split',
      moves: [
        { mode: 'split', quantity: 1, sourceItemId: beerItem.id },
        { mode: 'move', quantity: 1, sourceItemId: colaItem.id },
      ],
      targetCheck: { isNew: true, name: 'Ayse' },
    });
  });

  it('refuses to move an item that a guest has already paid for', async () => {
    const database = new InMemoryLocalDatabase();
    await seedWorkspace(database);
    const workspace = await loadTableWorkspace(database, scope, tableId);
    const beer = workspace!.products.find((product) => product.id === beerId)!;
    const sent = await sendOrderBatch({
      database,
      scope,
      deviceId,
      actorUserId: userId,
      tableId,
      checkName: 'Masa 4',
      lines: [{ id: 'draft-1', product: beer, quantity: 2, selectedOptionIds: [] }],
      now: new Date(timestamp),
      createUuid: sequentialIds('order'),
    });
    const beerItem = sent.items[0];
    const { payments, allocations } = confirmedPaymentFor(sent.check, beerItem, 1000);

    const splittable = buildSplittableOrderItems(sent.check, sent.items, [], payments, allocations);
    expect(splittable[0]).toMatchObject({ lockedQuantity: 2, movableQuantity: 0 });

    expect(() =>
      buildCheckSplitPlan({
        sourceCheck: sent.check,
        targetCheckName: 'Ali',
        items: sent.items,
        modifiers: [],
        payments,
        allocations,
        moves: [{ orderItemId: beerItem.id, quantity: 1 }],
      }),
    ).toThrow(expect.objectContaining({ code: 'ITEM_ALREADY_PAID' }));
  });

  it('rejects a split into a settled check and a split with no selection', async () => {
    const database = new InMemoryLocalDatabase();
    await seedWorkspace(database);
    const workspace = await loadTableWorkspace(database, scope, tableId);
    const beer = workspace!.products.find((product) => product.id === beerId)!;
    const sent = await sendOrderBatch({
      database,
      scope,
      deviceId,
      actorUserId: userId,
      tableId,
      checkName: 'Masa 4',
      lines: [{ id: 'draft-1', product: beer, quantity: 2, selectedOptionIds: [] }],
      now: new Date(timestamp),
      createUuid: sequentialIds('order'),
    });

    expect(() =>
      buildCheckSplitPlan({
        sourceCheck: sent.check,
        targetCheckName: 'Ali',
        items: sent.items,
        modifiers: [],
        payments: [],
        allocations: [],
        moves: [],
      }),
    ).toThrow(expect.objectContaining({ code: 'EMPTY_SELECTION' }));

    const settledTarget: Check = {
      ...sent.check,
      id: toDomainId('check-paid'),
      name: 'Kapanmis',
      status: 'paid',
    };
    expect(() =>
      buildCheckSplitPlan({
        sourceCheck: sent.check,
        targetCheck: settledTarget,
        items: sent.items,
        modifiers: [],
        payments: [],
        allocations: [],
        moves: [{ orderItemId: sent.items[0].id, quantity: 1 }],
      }),
    ).toThrow(expect.objectContaining({ code: 'TARGET_CHECK_LOCKED' }));
  });

  it('groups items by the guest label a waiter typed into the note', async () => {
    const database = new InMemoryLocalDatabase();
    await seedWorkspace(database);
    const workspace = await loadTableWorkspace(database, scope, tableId);
    const beer = workspace!.products.find((product) => product.id === beerId)!;
    const cola = workspace!.products.find((product) => product.id === colaId)!;
    const sent = await sendOrderBatch({
      database,
      scope,
      deviceId,
      actorUserId: userId,
      tableId,
      checkName: 'Masa 4',
      lines: [
        { id: 'draft-1', product: beer, quantity: 1, note: 'Ali', selectedOptionIds: [] },
        { id: 'draft-2', product: cola, quantity: 1, note: 'Ayse', selectedOptionIds: [] },
        { id: 'draft-3', product: cola, quantity: 1, selectedOptionIds: [] },
      ],
      now: new Date(timestamp),
      createUuid: sequentialIds('order'),
    });

    const groups = groupSplittableItemsByNote(
      buildSplittableOrderItems(sent.check, sent.items, [], [], []),
    );
    expect([...groups.keys()].sort()).toEqual(['Ali', 'Ayse']);
    expect(groups.get('Ali')).toHaveLength(1);
  });
});

describe('the beer nobody drank', () => {
  it('voids one of three beers and leaves an audited cancellation line', async () => {
    const database = new InMemoryLocalDatabase();
    await seedWorkspace(database);
    const workspace = await loadTableWorkspace(database, scope, tableId);
    const beer = workspace!.products.find((product) => product.id === beerId)!;
    const sent = await sendOrderBatch({
      database,
      scope,
      deviceId,
      actorUserId: userId,
      tableId,
      checkName: 'Masa 4',
      lines: [{ id: 'draft-1', product: beer, quantity: 3, selectedOptionIds: [] }],
      now: new Date(timestamp),
      createUuid: sequentialIds('order'),
    });
    const served: OrderItem = { ...sent.items[0], status: 'served' };
    await database.transaction(async (transaction) => {
      await transaction
        .repository('orderItems')
        .put(scope, served, { expectedVersion: sent.items[0].version });
    });

    const result = await voidOrderItemQuantity({
      database,
      scope,
      deviceId,
      actorUserId: userId,
      item: served,
      modifiers: [],
      quantity: 1,
      reasonId,
      now: new Date('2026-07-31T19:30:00.000Z'),
      createUuid: sequentialIds('void'),
    });

    expect(result.remainingItem).toMatchObject({ quantity: 2, status: 'served' });
    expect(result.voidedItem).toMatchObject({
      cancellationReasonId: reasonId,
      cancelledBy: userId,
      quantity: 1,
      status: 'cancelled',
    });

    // Iptal edilen satir tutari sifirlar, adisyon 2 biraya duser.
    const reloaded = await loadTableWorkspace(database, scope, tableId);
    expect(calculateCheckTotal(sent.check.id, reloaded!.orderItems, [])).toBe(1000);

    const outbox = await database.outbox.list(scope, ['pending']);
    expect(outbox[outbox.length - 1].payload).toMatchObject({
      reasonId,
      voidQuantity: 1,
    });
  });

  it('cancels the whole line when every unit is voided', async () => {
    const database = new InMemoryLocalDatabase();
    await seedWorkspace(database);
    const workspace = await loadTableWorkspace(database, scope, tableId);
    const beer = workspace!.products.find((product) => product.id === beerId)!;
    const sent = await sendOrderBatch({
      database,
      scope,
      deviceId,
      actorUserId: userId,
      tableId,
      checkName: 'Masa 4',
      lines: [{ id: 'draft-1', product: beer, quantity: 2, selectedOptionIds: [] }],
      now: new Date(timestamp),
      createUuid: sequentialIds('order'),
    });

    const result = await voidOrderItemQuantity({
      database,
      scope,
      deviceId,
      actorUserId: userId,
      item: sent.items[0],
      modifiers: [],
      quantity: 2,
      reasonId,
      now: new Date('2026-07-31T19:30:00.000Z'),
      createUuid: sequentialIds('void'),
    });

    expect(result.voidedItem).toBeUndefined();
    expect(result.remainingItem).toMatchObject({ quantity: 2, status: 'cancelled' });
  });

  it('never voids more units than the guest actually has left', async () => {
    const database = new InMemoryLocalDatabase();
    await seedWorkspace(database);
    const workspace = await loadTableWorkspace(database, scope, tableId);
    const beer = workspace!.products.find((product) => product.id === beerId)!;
    const sent = await sendOrderBatch({
      database,
      scope,
      deviceId,
      actorUserId: userId,
      tableId,
      checkName: 'Masa 4',
      lines: [{ id: 'draft-1', product: beer, quantity: 2, selectedOptionIds: [] }],
      now: new Date(timestamp),
      createUuid: sequentialIds('order'),
    });

    await expect(
      voidOrderItemQuantity({
        database,
        scope,
        deviceId,
        actorUserId: userId,
        item: sent.items[0],
        modifiers: [],
        quantity: 2,
        paidQuantity: 1,
        reasonId,
        createUuid: sequentialIds('void'),
      }),
    ).rejects.toMatchObject({ code: 'INVALID_QUANTITY' });
  });
});

function confirmedPaymentFor(
  check: Check,
  item: OrderItem,
  amountMinor: number,
): { readonly payments: readonly Payment[]; readonly allocations: readonly PaymentAllocation[] } {
  const paymentId = toDomainId<PaymentId>('payment-1');
  return {
    payments: [
      {
        id: paymentId,
        ...scope,
        tableSessionId: check.tableSessionId,
        method: 'card',
        status: 'confirmed',
        amountMinor,
        currencyCode: toCurrencyCode('EUR'),
        createdBy: userId,
        createdAt: timestamp,
        confirmedAt: timestamp,
        idempotencyKey: 'payment-1',
        deviceId,
        syncStatus: 'synced',
      },
    ],
    allocations: [
      {
        id: toDomainId<PaymentAllocationId>('allocation-1'),
        paymentId,
        checkId: check.id,
        orderItemId: item.id,
        quantity: 2,
        amountMinor,
      },
    ],
  };
}

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
    name: 'Icecek',
    sortOrder: 1,
    isActive: true,
    createdBy: userId,
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: 'synced',
  };
  const reason: CancellationReason = {
    id: reasonId,
    ...scope,
    name: 'Musteri istemedi',
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
    await transaction.repository('menuItems').put(scope, menuItem(beerId, 'Bira', 500));
    await transaction.repository('menuItems').put(scope, menuItem(colaId, 'Kola', 300));
    await transaction.repository('cancellationReasons').put(scope, reason);
  });
}

function menuItem(id: MenuItemId, name: string, priceMinor: number): MenuItem {
  return {
    id,
    ...scope,
    categoryId,
    name,
    priceMinor,
    currencyCode: toCurrencyCode('EUR'),
    taxRateBasisPoints: 2000,
    isActive: true,
    isAvailable: true,
    createdBy: userId,
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: 'synced',
  };
}

function sequentialIds(prefix: string): () => string {
  let index = 0;
  return () => `${prefix}-${++index}`;
}
