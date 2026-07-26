import {
  Check,
  CheckStatus,
  OrderItem,
  OrderItemModifier,
  Payment,
  PaymentAllocation,
} from './entities';
import { CheckId, OrderItemId, PaymentId } from './ids';
import { assertMinorUnits, assertSameCurrency } from './money';

export interface CheckBalance {
  readonly totalMinor: number;
  readonly paidMinor: number;
  readonly remainingMinor: number;
}

export function calculateOrderItemTotal(
  item: OrderItem,
  modifiers: readonly OrderItemModifier[],
): number {
  assertPositiveInteger(item.quantity, 'order item quantity');
  assertNonNegativeMinor(item.unitPriceMinor, 'unitPriceMinor');

  if (
    !Number.isSafeInteger(item.taxRateBasisPoints) ||
    item.taxRateBasisPoints < 0 ||
    item.taxRateBasisPoints > 10_000
  ) {
    throw new Error('taxRateBasisPoints must be an integer from 0 to 10000');
  }

  if (item.status === 'cancelled') {
    return 0;
  }

  const modifierTotalMinor = modifiers
    .filter((modifier) => modifier.orderItemId === item.id)
    .reduce((total, modifier) => {
      assertPositiveInteger(modifier.quantity, 'modifier quantity');
      assertMinorUnits(modifier.priceDeltaMinor, 'priceDeltaMinor');
      return assertMinorUnits(total + modifier.priceDeltaMinor * modifier.quantity);
    }, 0);

  const unitTotalMinor = item.unitPriceMinor + modifierTotalMinor;
  assertNonNegativeMinor(unitTotalMinor, 'order item unit total');

  return assertMinorUnits(unitTotalMinor * item.quantity);
}

export function calculateCheckTotal(
  checkId: CheckId,
  items: readonly OrderItem[],
  modifiers: readonly OrderItemModifier[],
): number {
  const checkItems = items.filter((item) => item.checkId === checkId);

  if (checkItems.length > 1) {
    const currency = checkItems[0].currencyCode;
    checkItems.slice(1).forEach((item) => assertSameCurrency(currency, item.currencyCode));
  }

  return checkItems.reduce(
    (total, item) => assertMinorUnits(total + calculateOrderItemTotal(item, modifiers)),
    0,
  );
}

export function calculateCheckBalance(
  check: Check,
  items: readonly OrderItem[],
  modifiers: readonly OrderItemModifier[],
  payments: readonly Payment[],
  allocations: readonly PaymentAllocation[],
): CheckBalance {
  const totalMinor = calculateCheckTotal(check.id, items, modifiers);
  const confirmedPaymentIds = new Set(
    payments.filter((payment) => payment.status === 'confirmed').map((payment) => payment.id),
  );
  const paidMinor = allocations
    .filter(
      (allocation) =>
        allocation.checkId === check.id && confirmedPaymentIds.has(allocation.paymentId),
    )
    .reduce(
      (total, allocation) =>
        assertMinorUnits(total + assertNonNegativeMinor(allocation.amountMinor, 'allocation')),
      0,
    );

  if (paidMinor > totalMinor) {
    throw new Error(`Check ${check.id} is over-allocated by ${paidMinor - totalMinor} minor units`);
  }

  return {
    totalMinor,
    paidMinor,
    remainingMinor: totalMinor - paidMinor,
  };
}

export function deriveCheckStatus(balance: CheckBalance): CheckStatus {
  if (balance.paidMinor === 0) {
    return 'open';
  }

  if (balance.remainingMinor === 0) {
    return 'paid';
  }

  return 'partially_paid';
}

export function assertCheckCanBeMarkedPaid(balance: CheckBalance): void {
  if (balance.totalMinor <= 0) {
    throw new Error('A zero-value check must be voided instead of paid');
  }

  if (balance.remainingMinor !== 0) {
    throw new Error(`Check cannot be paid while ${balance.remainingMinor} minor units remain`);
  }
}

export function assertSessionCanClose(checks: readonly Check[]): void {
  const unsettled = checks.filter((check) => check.status !== 'paid' && check.status !== 'voided');

  if (unsettled.length > 0) {
    throw new Error(`Session cannot close with ${unsettled.length} unsettled check(s)`);
  }
}

export function assertPaymentAllocations(
  payment: Payment,
  allocations: readonly PaymentAllocation[],
  checks: readonly Check[],
  items: readonly OrderItem[],
  modifiers: readonly OrderItemModifier[],
): void {
  assertPaymentTender(payment);

  const paymentAllocations = allocations.filter(
    (allocation) => allocation.paymentId === payment.id,
  );

  if (paymentAllocations.length !== allocations.length) {
    throw new Error(`Allocations contain a payment ID other than ${payment.id}`);
  }

  const allocationTotal = paymentAllocations.reduce(
    (total, allocation) =>
      assertMinorUnits(total + assertPositiveMinor(allocation.amountMinor, 'allocation amount')),
    0,
  );

  if (allocationTotal !== payment.amountMinor) {
    throw new Error(
      `Payment allocation total ${allocationTotal} does not equal payment amount ${payment.amountMinor}`,
    );
  }

  const itemAmounts = new Map<OrderItemId, number>();
  const itemQuantities = new Map<OrderItemId, number>();

  paymentAllocations.forEach((allocation) => {
    const check = checks.find((candidate) => candidate.id === allocation.checkId);
    if (!check) {
      throw new Error(`Allocation references unknown check ${allocation.checkId}`);
    }

    if (
      check.tableSessionId !== payment.tableSessionId ||
      check.organizationId !== payment.organizationId ||
      check.branchId !== payment.branchId
    ) {
      throw new Error('Allocation check is outside the payment tenant or table session');
    }

    if (allocation.quantity !== undefined && allocation.orderItemId === undefined) {
      throw new Error('Allocation quantity requires an orderItemId');
    }

    if (!allocation.orderItemId) return;

    const item = items.find((candidate) => candidate.id === allocation.orderItemId);
    if (!item) {
      throw new Error(`Allocation references unknown order item ${allocation.orderItemId}`);
    }

    if (item.checkId !== allocation.checkId) {
      throw new Error('Allocation check does not own the referenced order item');
    }

    if (
      item.tableSessionId !== payment.tableSessionId ||
      item.organizationId !== payment.organizationId ||
      item.branchId !== payment.branchId
    ) {
      throw new Error('Allocated order item is outside the payment tenant or table session');
    }

    assertSameCurrency(payment.currencyCode, item.currencyCode);
    itemAmounts.set(item.id, (itemAmounts.get(item.id) ?? 0) + allocation.amountMinor);

    if (allocation.quantity !== undefined) {
      assertPositiveInteger(allocation.quantity, 'allocation quantity');
      itemQuantities.set(item.id, (itemQuantities.get(item.id) ?? 0) + allocation.quantity);
    }
  });

  itemAmounts.forEach((amountMinor, itemId) => {
    const item = findOrderItem(items, itemId);
    const billableMinor = calculateOrderItemTotal(item, modifiers);

    if (amountMinor > billableMinor) {
      throw new Error(`Order item ${itemId} is over-allocated by ${amountMinor - billableMinor}`);
    }
  });

  itemQuantities.forEach((quantity, itemId) => {
    const item = findOrderItem(items, itemId);

    if (quantity > item.quantity) {
      throw new Error(`Order item ${itemId} quantity is over-allocated`);
    }
  });
}

export function assertPaymentTender(payment: Payment): void {
  assertPositiveMinor(payment.amountMinor, 'payment amount');

  if (payment.method === 'cash') {
    if (payment.tenderedMinor === undefined) {
      throw new Error('Cash payment requires tenderedMinor');
    }

    const tenderedMinor = assertNonNegativeMinor(payment.tenderedMinor, 'tenderedMinor');
    if (tenderedMinor < payment.amountMinor) {
      throw new Error('Cash tender cannot be lower than the payment amount');
    }

    const expectedChange = tenderedMinor - payment.amountMinor;
    if (payment.changeMinor !== expectedChange) {
      throw new Error(`Cash change must equal ${expectedChange} minor units`);
    }

    return;
  }

  if (payment.changeMinor !== undefined && payment.changeMinor !== 0) {
    throw new Error('Non-cash payments cannot return change');
  }

  if (payment.tenderedMinor !== undefined && payment.tenderedMinor !== payment.amountMinor) {
    throw new Error('Non-cash tender must equal the payment amount');
  }
}

export function assertSettlementInvariants(
  checks: readonly Check[],
  items: readonly OrderItem[],
  modifiers: readonly OrderItemModifier[],
  payments: readonly Payment[],
  allocations: readonly PaymentAllocation[],
): void {
  const paymentIds = new Set(payments.map((payment) => payment.id));
  const unknownPaymentAllocation = allocations.find(
    (allocation) => !paymentIds.has(allocation.paymentId),
  );

  if (unknownPaymentAllocation) {
    throw new Error(`Allocation references unknown payment ${unknownPaymentAllocation.paymentId}`);
  }

  payments.forEach((payment) => {
    assertPaymentAllocations(
      payment,
      allocations.filter((allocation) => allocation.paymentId === payment.id),
      checks,
      items,
      modifiers,
    );
  });

  const confirmedPaymentIds = getConfirmedPaymentIds(payments);
  const confirmedItemAmounts = new Map<OrderItemId, number>();
  const confirmedItemQuantities = new Map<OrderItemId, number>();

  allocations
    .filter(
      (allocation) =>
        confirmedPaymentIds.has(allocation.paymentId) && allocation.orderItemId !== undefined,
    )
    .forEach((allocation) => {
      const itemId = allocation.orderItemId!;
      confirmedItemAmounts.set(
        itemId,
        (confirmedItemAmounts.get(itemId) ?? 0) + allocation.amountMinor,
      );

      if (allocation.quantity !== undefined) {
        confirmedItemQuantities.set(
          itemId,
          (confirmedItemQuantities.get(itemId) ?? 0) + allocation.quantity,
        );
      }
    });

  confirmedItemAmounts.forEach((amountMinor, itemId) => {
    const item = findOrderItem(items, itemId);
    const billableMinor = calculateOrderItemTotal(item, modifiers);

    if (amountMinor > billableMinor) {
      throw new Error(
        `Confirmed payments over-allocate order item ${itemId} by ${amountMinor - billableMinor}`,
      );
    }
  });

  confirmedItemQuantities.forEach((quantity, itemId) => {
    const item = findOrderItem(items, itemId);

    if (quantity > item.quantity) {
      throw new Error(`Confirmed payments over-allocate order item ${itemId} quantity`);
    }
  });

  checks.forEach((check) => {
    calculateCheckBalance(check, items, modifiers, payments, allocations);
  });
}

export function getConfirmedPaymentIds(payments: readonly Payment[]): ReadonlySet<PaymentId> {
  return new Set(
    payments.filter((payment) => payment.status === 'confirmed').map((payment) => payment.id),
  );
}

function findOrderItem(items: readonly OrderItem[], itemId: OrderItemId): OrderItem {
  const item = items.find((candidate) => candidate.id === itemId);

  if (!item) {
    throw new Error(`Unknown order item ${itemId}`);
  }

  return item;
}

function assertPositiveInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${field} must be a positive safe integer`);
  }

  return value;
}

function assertPositiveMinor(value: number, field: string): number {
  assertMinorUnits(value, field);

  if (value <= 0) {
    throw new Error(`${field} must be greater than zero`);
  }

  return value;
}

function assertNonNegativeMinor(value: number, field: string): number {
  assertMinorUnits(value, field);

  if (value < 0) {
    throw new Error(`${field} cannot be negative`);
  }

  return value;
}
