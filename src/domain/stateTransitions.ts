import {
  CheckStatus,
  OrderItemStatus,
  PaymentStatus,
  ReceiptStatus,
  TableSessionStatus,
} from './entities';

const tableSessionTransitions: Readonly<Record<TableSessionStatus, readonly TableSessionStatus[]>> =
  {
    open: ['payment_pending', 'voided'],
    payment_pending: ['open', 'closed'],
    closed: [],
    voided: [],
  };

const checkTransitions: Readonly<Record<CheckStatus, readonly CheckStatus[]>> = {
  open: ['partially_paid', 'paid', 'voided'],
  partially_paid: ['paid'],
  paid: [],
  voided: [],
};

const orderItemTransitions: Readonly<Record<OrderItemStatus, readonly OrderItemStatus[]>> = {
  draft: ['ordered', 'cancelled'],
  ordered: ['served', 'cancelled'],
  served: ['cancelled'],
  cancelled: [],
};

const paymentTransitions: Readonly<Record<PaymentStatus, readonly PaymentStatus[]>> = {
  pending: ['confirmed', 'failed', 'voided'],
  confirmed: [],
  failed: [],
  voided: [],
};

export function assertTableSessionTransition(
  current: TableSessionStatus,
  next: TableSessionStatus,
): void {
  assertTransition('table session', tableSessionTransitions, current, next);
}

export function assertCheckTransition(current: CheckStatus, next: CheckStatus): void {
  assertTransition('check', checkTransitions, current, next);
}

export function assertOrderItemTransition(current: OrderItemStatus, next: OrderItemStatus): void {
  assertTransition('order item', orderItemTransitions, current, next);
}

export function assertPaymentTransition(current: PaymentStatus, next: PaymentStatus): void {
  assertTransition('payment', paymentTransitions, current, next);
}

export function assertReceiptStatusTransition(current: ReceiptStatus, next: ReceiptStatus): void {
  if (current !== next) {
    throw new Error(
      `Issued receipt status is immutable; create an adjustment receipt instead of ${current} -> ${next}`,
    );
  }
}

function assertTransition<State extends string>(
  entityName: string,
  transitions: Readonly<Record<State, readonly State[]>>,
  current: State,
  next: State,
): void {
  if (current === next) {
    return;
  }

  if (!transitions[current].includes(next)) {
    throw new Error(`Invalid ${entityName} state transition: ${current} -> ${next}`);
  }
}
