import {
  BranchId,
  CheckId,
  DeviceId,
  HallId,
  MenuItemId,
  MutationId,
  OrderBatchId,
  OrderItemId,
  OrganizationId,
  PaymentAllocationId,
  PaymentId,
  RestaurantTableId,
  TableSessionId,
  UserId,
  toCurrencyCode,
  toDomainId,
} from '../../../domain';
import { InMemoryLocalDatabase } from '../../../data/testing';
import {
  DomainShiftBoardSource,
  buildDomainShiftBoard,
  filterShiftBoardTables,
  loadDomainShiftBoard,
} from '../shiftBoardModel';

const organizationId = toDomainId<OrganizationId>('organization-1');
const branchId = toDomainId<BranchId>('branch-1');
const hallId = toDomainId<HallId>('hall-1');
const tableId = toDomainId<RestaurantTableId>('table-1');
const availableTableId = toDomainId<RestaurantTableId>('table-2');
const sessionId = toDomainId<TableSessionId>('session-1');
const checkId = toDomainId<CheckId>('check-1');
const itemId = toDomainId<OrderItemId>('item-1');
const cancelledItemId = toDomainId<OrderItemId>('item-cancelled');
const paymentId = toDomainId<PaymentId>('payment-1');
const waiterId = toDomainId<UserId>('waiter-deniz');
const secondWaiterId = toDomainId<UserId>('waiter-ayse');
const timestamp = '2026-07-26T12:30:00.000Z';
const now = new Date('2026-07-26T13:00:00.000Z');
const currencyCode = toCurrencyCode('EUR');

describe('buildDomainShiftBoard', () => {
  it('summarizes table, checks, waiters, duration and partial payment safely', () => {
    const snapshot = buildDomainShiftBoard(fixture(), now);
    const active = snapshot.tables.find((table) => table.id === tableId);
    const available = snapshot.tables.find((table) => table.id === availableTableId);

    expect(active).toMatchObject({
      state: 'payment_pending',
      syncStatus: 'pending',
      pendingMutationCount: 1,
      durationMinutes: 30,
      totalMinor: 1000,
      paidMinor: 300,
      remainingMinor: 700,
      checkCount: 1,
      waiterNames: ['Deniz Kaya', 'Ayşe Yılmaz'],
      waiterInitials: ['DK', 'AY'],
      isMine: true,
      needsAttention: true,
    });
    expect(available).toMatchObject({
      state: 'available',
      totalMinor: 0,
      checkCount: 0,
      isMine: false,
    });
    expect(snapshot).toMatchObject({
      openCount: 1,
      attentionCount: 1,
      totalOpenMinor: 700,
    });
  });

  it('prioritizes a conflict over ordinary service and payment states', () => {
    const source = fixture();
    const snapshot = buildDomainShiftBoard(
      {
        ...source,
        items: source.items.map((item) =>
          item.id === itemId ? { ...item, syncStatus: 'conflict' } : item,
        ),
      },
      now,
    );

    expect(snapshot.tables[0]).toMatchObject({
      state: 'conflict',
      syncStatus: 'conflict',
      needsAttention: true,
    });
  });

  it('marks a financially inconsistent card for review instead of crashing the board', () => {
    const source = fixture();
    const snapshot = buildDomainShiftBoard(
      {
        ...source,
        allocations: source.allocations.map((allocation) => ({
          ...allocation,
          amountMinor: 1200,
        })),
      },
      now,
    );

    expect(snapshot.tables[0]).toMatchObject({
      state: 'sync_issue',
      totalMinor: 0,
      remainingMinor: 0,
      needsAttention: true,
    });
  });
});

describe('loadDomainShiftBoard', () => {
  it('resolves authorized colleague names in one batch without making profiles local entities', async () => {
    const database = new InMemoryLocalDatabase();
    const source = fixture();
    const scope = { organizationId, branchId };
    const resolveWaiterNames = jest.fn(async () => ({
      [waiterId]: 'Deniz Kaya',
      [secondWaiterId]: 'Ayşe Yılmaz',
    }));

    try {
      await database.transaction(async (transaction) => {
        for (const entity of source.halls) {
          await transaction.repository('halls').put(scope, entity);
        }
        for (const entity of source.tables) {
          await transaction.repository('restaurantTables').put(scope, entity);
        }
        for (const entity of source.sessions) {
          await transaction.repository('tableSessions').put(scope, entity);
        }
        for (const entity of source.checks) {
          await transaction.repository('checks').put(scope, entity);
        }
        for (const entity of source.items) {
          await transaction.repository('orderItems').put(scope, entity);
        }
        for (const entity of source.modifiers) {
          await transaction.repository('orderItemModifiers').put(scope, entity);
        }
        for (const entity of source.payments) {
          await transaction.repository('payments').put(scope, entity);
        }
        for (const entity of source.allocations) {
          await transaction.repository('paymentAllocations').put(scope, entity);
        }
      });

      const snapshot = await loadDomainShiftBoard(
        database,
        scope,
        {
          currentUserId: waiterId,
          fallbackCurrencyCode: 'EUR',
          fallbackHallName: 'Unassigned',
          unknownWaiterName: 'Waiter',
          resolveWaiterNames,
        },
        now,
      );

      expect(resolveWaiterNames).toHaveBeenCalledTimes(1);
      expect(resolveWaiterNames).toHaveBeenCalledWith(
        expect.arrayContaining([waiterId, secondWaiterId]),
      );
      expect(snapshot.tables[0].waiterNames).toEqual(['Deniz Kaya', 'Ayşe Yılmaz']);
    } finally {
      await database.close();
    }
  });
});

describe('filterShiftBoardTables', () => {
  const tables = buildDomainShiftBoard(fixture(), now).tables;

  it('combines mine, hall and Turkish-normalized table/waiter search', () => {
    expect(
      filterShiftBoardTables(tables, {
        scope: 'mine',
        hallId,
        query: 'IC SALON deniz',
      }).map((table) => table.id),
    ).toEqual([tableId]);
  });

  it('shows only operational exceptions in alerts', () => {
    expect(filterShiftBoardTables(tables, { scope: 'alerts' }).map((table) => table.id)).toEqual([
      tableId,
    ]);
  });
});

function fixture(): DomainShiftBoardSource {
  return {
    fallbackCurrencyCode: 'EUR',
    fallbackHallName: 'Unassigned',
    unknownWaiterName: 'Waiter',
    currentUserId: waiterId,
    waiterNames: {
      [waiterId]: 'Deniz Kaya',
      [secondWaiterId]: 'Ayşe Yılmaz',
    },
    halls: [
      {
        id: hallId,
        organizationId,
        branchId,
        name: 'İç Salon',
        sortOrder: 1,
        syncStatus: 'synced',
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    tables: [
      {
        id: tableId,
        organizationId,
        branchId,
        hallId,
        label: 'İçeri Masa 4',
        sequenceNumber: 4,
        capacity: 4,
        sortOrder: 4,
        syncStatus: 'synced',
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: availableTableId,
        organizationId,
        branchId,
        hallId,
        label: 'Masa 5',
        sequenceNumber: 5,
        capacity: 2,
        sortOrder: 5,
        syncStatus: 'synced',
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    sessions: [
      {
        id: sessionId,
        organizationId,
        branchId,
        tableId,
        status: 'payment_pending',
        openedBy: waiterId,
        openedAt: timestamp,
        syncStatus: 'synced',
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    checks: [
      {
        id: checkId,
        organizationId,
        branchId,
        tableSessionId: sessionId,
        name: 'Main',
        status: 'partially_paid',
        openedBy: waiterId,
        openedAt: timestamp,
        syncStatus: 'synced',
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    items: [
      {
        id: itemId,
        organizationId,
        branchId,
        tableSessionId: sessionId,
        checkId,
        orderBatchId: toDomainId<OrderBatchId>('batch-1'),
        menuItemId: toDomainId<MenuItemId>('menu-fries'),
        nameSnapshot: 'Fries',
        unitPriceMinor: 400,
        currencyCode,
        taxRateBasisPoints: 0,
        quantity: 2,
        status: 'ordered',
        createdBy: secondWaiterId,
        updatedBy: secondWaiterId,
        originalTableId: tableId,
        originalTableSessionId: sessionId,
        syncStatus: 'pending',
        clientMutationId: toDomainId<MutationId>('mutation-item-1'),
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: cancelledItemId,
        organizationId,
        branchId,
        tableSessionId: sessionId,
        checkId,
        orderBatchId: toDomainId<OrderBatchId>('batch-2'),
        nameSnapshot: 'Cancelled steak',
        unitPriceMinor: 9999,
        currencyCode,
        taxRateBasisPoints: 0,
        quantity: 1,
        status: 'cancelled',
        createdBy: waiterId,
        updatedBy: waiterId,
        cancelledBy: waiterId,
        cancelledAt: timestamp,
        originalTableId: tableId,
        originalTableSessionId: sessionId,
        syncStatus: 'synced',
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    modifiers: [
      {
        id: toDomainId('modifier-cheese'),
        orderItemId: itemId,
        modifierGroupNameSnapshot: 'Cheese',
        modifierOptionNameSnapshot: 'Cheddar',
        priceDeltaMinor: 100,
        quantity: 1,
      },
    ],
    payments: [
      {
        id: paymentId,
        organizationId,
        branchId,
        tableSessionId: sessionId,
        method: 'card',
        status: 'confirmed',
        amountMinor: 300,
        tenderedMinor: 300,
        changeMinor: 0,
        currencyCode,
        createdBy: waiterId,
        createdAt: timestamp,
        confirmedAt: timestamp,
        idempotencyKey: 'payment-1',
        deviceId: toDomainId<DeviceId>('device-1'),
        syncStatus: 'synced',
      },
    ],
    allocations: [
      {
        id: toDomainId<PaymentAllocationId>('allocation-1'),
        paymentId,
        checkId,
        amountMinor: 300,
      },
    ],
  };
}
