import {
  assertCheckCanBeMarkedPaid,
  assertPaymentAllocations,
  assertPaymentTender,
  assertSettlementInvariants,
  assertSessionCanClose,
  calculateCheckBalance,
  calculateCheckTotal,
  calculateOrderItemTotal,
  deriveCheckStatus,
  Check,
  CheckId,
  DeviceId,
  MenuItemId,
  MutationId,
  OrderBatchId,
  OrderItem,
  OrderItemId,
  OrderItemModifier,
  OrderItemModifierId,
  OrganizationId,
  Payment,
  PaymentAllocation,
  PaymentAllocationId,
  PaymentId,
  RestaurantTableId,
  TableSessionId,
  UserId,
  BranchId,
  toCurrencyCode,
  toDomainId,
} from '..';

const organizationId = toDomainId<OrganizationId>('organization-1');
const branchId = toDomainId<BranchId>('branch-1');
const sessionId = toDomainId<TableSessionId>('session-1');
const checkId = toDomainId<CheckId>('check-1');
const userId = toDomainId<UserId>('user-1');
const deviceId = toDomainId<DeviceId>('device-1');
const tableId = toDomainId<RestaurantTableId>('table-1');
const batchId = toDomainId<OrderBatchId>('batch-1');
const mutationId = toDomainId<MutationId>('mutation-1');
const euro = toCurrencyCode('EUR');
const timestamp = '2026-07-26T13:00:00.000Z';

function createCheck(overrides: Partial<Check> = {}): Check {
  return {
    id: checkId,
    organizationId,
    branchId,
    tableSessionId: sessionId,
    name: 'Kişi 1',
    status: 'open',
    openedBy: userId,
    openedAt: timestamp,
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: 'synced',
    ...overrides,
  };
}

function createItem(id: string, overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    id: toDomainId<OrderItemId>(id),
    organizationId,
    branchId,
    tableSessionId: sessionId,
    checkId,
    orderBatchId: batchId,
    menuItemId: toDomainId<MenuItemId>('menu-item-1'),
    nameSnapshot: 'Patates Kızartması',
    categoryNameSnapshot: 'Atıştırmalık',
    unitPriceMinor: 400,
    currencyCode: euro,
    taxRateBasisPoints: 2_000,
    quantity: 2,
    status: 'ordered',
    createdBy: userId,
    updatedBy: userId,
    originalTableId: tableId,
    originalTableSessionId: sessionId,
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: 'synced',
    ...overrides,
  };
}

function createModifier(
  orderItemId: OrderItemId,
  overrides: Partial<OrderItemModifier> = {},
): OrderItemModifier {
  return {
    id: toDomainId<OrderItemModifierId>(`modifier-${orderItemId}`),
    orderItemId,
    modifierGroupNameSnapshot: 'Peynir',
    modifierOptionNameSnapshot: 'Peynirli',
    priceDeltaMinor: 50,
    quantity: 1,
    ...overrides,
  };
}

function createPayment(id: string, amountMinor: number, overrides: Partial<Payment> = {}): Payment {
  return {
    id: toDomainId<PaymentId>(id),
    organizationId,
    branchId,
    tableSessionId: sessionId,
    method: 'card',
    status: 'confirmed',
    amountMinor,
    currencyCode: euro,
    createdBy: userId,
    createdAt: timestamp,
    confirmedAt: timestamp,
    idempotencyKey: `key-${id}`,
    deviceId,
    syncStatus: 'synced',
    clientMutationId: mutationId,
    ...overrides,
  };
}

function createAllocation(
  paymentId: PaymentId,
  amountMinor: number,
  overrides: Partial<PaymentAllocation> = {},
): PaymentAllocation {
  return {
    id: toDomainId<PaymentAllocationId>(`allocation-${paymentId}-${amountMinor}`),
    paymentId,
    checkId,
    amountMinor,
    ...overrides,
  };
}

describe('Orderia v2 financial invariants', () => {
  it('uses order-time modifier snapshots and excludes cancelled items', () => {
    const ordered = createItem('ordered-item');
    const cancelled = createItem('cancelled-item', {
      unitPriceMinor: 9_999,
      status: 'cancelled',
    });
    const modifiers = [createModifier(ordered.id)];

    expect(calculateOrderItemTotal(ordered, modifiers)).toBe(900);
    expect(calculateOrderItemTotal(cancelled, modifiers)).toBe(0);
    expect(calculateCheckTotal(checkId, [ordered, cancelled], modifiers)).toBe(900);
  });

  it('requires allocations to reconcile exactly with the payment amount', () => {
    const item = createItem('item-1');
    const payment = createPayment('payment-1', 900);

    expect(() =>
      assertPaymentAllocations(
        payment,
        [
          createAllocation(payment.id, 900, {
            orderItemId: item.id,
            quantity: 2,
          }),
        ],
        [createCheck()],
        [item],
        [createModifier(item.id)],
      ),
    ).not.toThrow();

    expect(() =>
      assertPaymentAllocations(
        payment,
        [createAllocation(payment.id, 899)],
        [createCheck()],
        [item],
        [createModifier(item.id)],
      ),
    ).toThrow(/does not equal payment amount/);
  });

  it('prevents an order item amount or quantity from being over-allocated', () => {
    const item = createItem('item-1');
    const payment = createPayment('payment-1', 901);

    expect(() =>
      assertPaymentAllocations(
        payment,
        [
          createAllocation(payment.id, 901, {
            orderItemId: item.id,
            quantity: 2,
          }),
        ],
        [createCheck()],
        [item],
        [createModifier(item.id)],
      ),
    ).toThrow(/over-allocated/);

    const quantityPayment = createPayment('payment-2', 900);
    expect(() =>
      assertPaymentAllocations(
        quantityPayment,
        [
          createAllocation(quantityPayment.id, 900, {
            orderItemId: item.id,
            quantity: 3,
          }),
        ],
        [createCheck()],
        [item],
        [createModifier(item.id)],
      ),
    ).toThrow(/quantity is over-allocated/);
  });

  it('derives partial and paid states only from confirmed allocations', () => {
    const item = createItem('item-1');
    const modifiers = [createModifier(item.id)];
    const pending = createPayment('pending-payment', 400, { status: 'pending' });
    const confirmed = createPayment('confirmed-payment', 400);
    const allocations = [createAllocation(pending.id, 400), createAllocation(confirmed.id, 400)];

    const partialBalance = calculateCheckBalance(
      createCheck(),
      [item],
      modifiers,
      [pending, confirmed],
      allocations,
    );

    expect(partialBalance).toEqual({
      totalMinor: 900,
      paidMinor: 400,
      remainingMinor: 500,
    });
    expect(deriveCheckStatus(partialBalance)).toBe('partially_paid');
    expect(() => assertCheckCanBeMarkedPaid(partialBalance)).toThrow(/remain/);

    const finalPayment = createPayment('final-payment', 500);
    const paidBalance = calculateCheckBalance(
      createCheck({ status: 'partially_paid' }),
      [item],
      modifiers,
      [confirmed, finalPayment],
      [createAllocation(confirmed.id, 400), createAllocation(finalPayment.id, 500)],
    );

    expect(deriveCheckStatus(paidBalance)).toBe('paid');
    expect(() => assertCheckCanBeMarkedPaid(paidBalance)).not.toThrow();
  });

  it('prevents separate confirmed payments from over-allocating the same item', () => {
    const firstItem = createItem('item-1', { quantity: 1 });
    const secondItem = createItem('item-2', { quantity: 1 });
    const firstPayment = createPayment('payment-1', 400);
    const secondPayment = createPayment('payment-2', 400);

    expect(() =>
      assertSettlementInvariants(
        [createCheck()],
        [firstItem, secondItem],
        [],
        [firstPayment, secondPayment],
        [
          createAllocation(firstPayment.id, 400, {
            orderItemId: firstItem.id,
            quantity: 1,
          }),
          createAllocation(secondPayment.id, 400, {
            orderItemId: firstItem.id,
            quantity: 1,
          }),
        ],
      ),
    ).toThrow(/over-allocate order item/);
  });

  it('does not close a table session with unsettled named checks', () => {
    expect(() =>
      assertSessionCanClose([
        createCheck({ id: toDomainId<CheckId>('check-paid'), status: 'paid' }),
        createCheck({ id: toDomainId<CheckId>('check-open'), status: 'open' }),
      ]),
    ).toThrow(/unsettled/);

    expect(() =>
      assertSessionCanClose([
        createCheck({ id: toDomainId<CheckId>('check-paid'), status: 'paid' }),
        createCheck({ id: toDomainId<CheckId>('check-voided'), status: 'voided' }),
      ]),
    ).not.toThrow();
  });

  it('reconciles cash tender and change in minor units', () => {
    expect(() =>
      assertPaymentTender(
        createPayment('cash-payment', 800, {
          method: 'cash',
          tenderedMinor: 1_000,
          changeMinor: 200,
        }),
      ),
    ).not.toThrow();

    expect(() =>
      assertPaymentTender(
        createPayment('bad-cash-payment', 800, {
          method: 'cash',
          tenderedMinor: 1_000,
          changeMinor: 199,
        }),
      ),
    ).toThrow(/Cash change/);
  });
});
