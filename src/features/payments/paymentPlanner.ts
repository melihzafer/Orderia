import uuid from 'react-native-uuid';
import {
  Check,
  CheckId,
  CurrencyCode,
  OrderItem,
  OrderItemId,
  OrderItemModifier,
  Payment,
  PaymentAllocation,
  PaymentAllocationId,
  PaymentId,
  calculateCheckBalance,
  calculateOrderItemTotal,
  toDomainId,
} from '../../domain';

export type PaymentSelectionMode = 'amount' | 'items' | 'equal';
export type PaymentTenderMethod = 'cash' | 'card';

export interface PaymentSelection {
  readonly checkId: CheckId;
  readonly orderItemId?: OrderItemId;
  readonly quantity?: number;
  readonly amountMinor: number;
}

export interface PaymentTenderDraft {
  readonly method: PaymentTenderMethod;
  readonly amountMinor: number;
  readonly tenderedMinor?: number;
}

export interface ConfirmPaymentAllocationPayload {
  readonly id: PaymentAllocationId;
  readonly orderItemId?: OrderItemId;
  readonly quantity?: number;
  readonly amountMinor: number;
}

export interface ConfirmPaymentPayload {
  readonly id: PaymentId;
  readonly method: PaymentTenderMethod;
  readonly amountMinor: number;
  readonly tenderedMinor?: number;
  readonly allocations: readonly ConfirmPaymentAllocationPayload[];
}

export interface ConfirmCheckPaymentsCommand {
  readonly checkId: CheckId;
  readonly expectedCheckVersion: number;
  readonly currencyCode: CurrencyCode;
  readonly payments: readonly ConfirmPaymentPayload[];
}

export interface BuildPaymentCommandInput {
  readonly checkId: CheckId;
  readonly expectedCheckVersion: number;
  readonly currencyCode: CurrencyCode;
  readonly selections: readonly PaymentSelection[];
  readonly tenders: readonly PaymentTenderDraft[];
  readonly createUuid?: () => string;
}

export interface PayableOrderItem {
  readonly item: OrderItem;
  readonly unitTotalMinor: number;
  readonly remainingQuantity: number;
  readonly remainingMinor: number;
}

export function buildPayableOrderItems(
  check: Check,
  items: readonly OrderItem[],
  modifiers: readonly OrderItemModifier[],
  payments: readonly Payment[],
  allocations: readonly PaymentAllocation[],
): {
  readonly balance: ReturnType<typeof calculateCheckBalance>;
  readonly items: readonly PayableOrderItem[];
} {
  const balance = calculateCheckBalance(check, items, modifiers, payments, allocations);
  const confirmedIds = new Set(
    payments.filter((payment) => payment.status === 'confirmed').map((payment) => payment.id),
  );

  return {
    balance,
    items: items
      .filter((item) => item.checkId === check.id && item.status !== 'cancelled')
      .map((item) => {
        const totalMinor = calculateOrderItemTotal(item, modifiers);
        const itemAllocations = allocations.filter(
          (allocation) =>
            allocation.orderItemId === item.id && confirmedIds.has(allocation.paymentId),
        );
        const paidMinor = itemAllocations.reduce(
          (total, allocation) => safeAdd(total, allocation.amountMinor),
          0,
        );
        const paidQuantity = itemAllocations.reduce(
          (total, allocation) => total + (allocation.quantity ?? 0),
          0,
        );
        const unitTotalMinor = totalMinor / item.quantity;
        if (!Number.isSafeInteger(unitTotalMinor)) {
          throw new Error(`order item ${item.id} does not have an integral unit total`);
        }
        const quantityByAmount = Math.floor((totalMinor - paidMinor) / unitTotalMinor);
        return {
          item,
          unitTotalMinor,
          remainingQuantity: Math.max(0, Math.min(item.quantity - paidQuantity, quantityByAmount)),
          remainingMinor: totalMinor - paidMinor,
        };
      })
      .filter((item) => item.remainingMinor > 0),
  };
}

export function splitMinorEqually(totalMinor: number, partCount: number): readonly number[] {
  assertPositiveMinor(totalMinor, 'split total');
  if (!Number.isSafeInteger(partCount) || partCount < 2 || partCount > 100) {
    throw new Error('part count must be an integer from 2 to 100');
  }

  const base = Math.floor(totalMinor / partCount);
  const remainder = totalMinor % partCount;
  return Array.from({ length: partCount }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function buildConfirmCheckPaymentsCommand(
  input: BuildPaymentCommandInput,
): ConfirmCheckPaymentsCommand {
  if (!Number.isSafeInteger(input.expectedCheckVersion) || input.expectedCheckVersion < 1) {
    throw new Error('expected check version must be a positive safe integer');
  }
  if (input.selections.length === 0) {
    throw new Error('at least one payment selection is required');
  }
  if (input.tenders.length === 0 || input.tenders.length > 2) {
    throw new Error('one or two payment tenders are required');
  }

  input.selections.forEach((selection) => validateSelection(input.checkId, selection));
  input.tenders.forEach(validateTender);

  const selectionTotal = input.selections.reduce(
    (total, selection) => safeAdd(total, selection.amountMinor),
    0,
  );
  const tenderTotal = input.tenders.reduce(
    (total, tender) => safeAdd(total, tender.amountMinor),
    0,
  );
  if (selectionTotal !== tenderTotal) {
    throw new Error('payment tenders must equal the selected amount');
  }

  const createUuid = input.createUuid ?? defaultUuid;
  const remainingSelections = input.selections.map((selection) => ({
    ...selection,
    remainingMinor: selection.amountMinor,
    wasSplit: false,
  }));
  let selectionIndex = 0;

  const payments = input.tenders.map<ConfirmPaymentPayload>((tender) => {
    let remainingTender = tender.amountMinor;
    const allocations: ConfirmPaymentAllocationPayload[] = [];

    while (remainingTender > 0) {
      const selection = remainingSelections[selectionIndex];
      if (!selection) {
        throw new Error('payment allocation distribution exhausted unexpectedly');
      }
      const amountMinor = Math.min(remainingTender, selection.remainingMinor);
      const consumesWholeSelection = amountMinor === selection.remainingMinor;
      const preservesQuantity =
        consumesWholeSelection && !selection.wasSplit && amountMinor === selection.amountMinor;
      allocations.push({
        id: toDomainId<PaymentAllocationId>(createUuid()),
        ...(selection.orderItemId ? { orderItemId: selection.orderItemId } : {}),
        ...(preservesQuantity && selection.quantity !== undefined
          ? { quantity: selection.quantity }
          : {}),
        amountMinor,
      });
      if (!consumesWholeSelection) selection.wasSplit = true;
      remainingTender -= amountMinor;
      selection.remainingMinor -= amountMinor;
      if (selection.remainingMinor === 0) selectionIndex += 1;
    }

    return {
      id: toDomainId<PaymentId>(createUuid()),
      method: tender.method,
      amountMinor: tender.amountMinor,
      ...(tender.tenderedMinor === undefined ? {} : { tenderedMinor: tender.tenderedMinor }),
      allocations,
    };
  });

  return {
    checkId: input.checkId,
    expectedCheckVersion: input.expectedCheckVersion,
    currencyCode: input.currencyCode,
    payments,
  };
}

function validateSelection(checkId: CheckId, selection: PaymentSelection): void {
  if (selection.checkId !== checkId) {
    throw new Error('payment selection belongs to another check');
  }
  assertPositiveMinor(selection.amountMinor, 'selection amount');
  if (selection.quantity !== undefined) {
    if (!selection.orderItemId) {
      throw new Error('selection quantity requires an order item');
    }
    if (!Number.isSafeInteger(selection.quantity) || selection.quantity <= 0) {
      throw new Error('selection quantity must be a positive safe integer');
    }
  }
}

function validateTender(tender: PaymentTenderDraft): void {
  assertPositiveMinor(tender.amountMinor, 'tender amount');
  if (tender.method === 'cash') {
    if (
      tender.tenderedMinor === undefined ||
      !Number.isSafeInteger(tender.tenderedMinor) ||
      tender.tenderedMinor < tender.amountMinor
    ) {
      throw new Error('cash tendered amount cannot be lower than the payment amount');
    }
    return;
  }
  if (tender.tenderedMinor !== undefined && tender.tenderedMinor !== tender.amountMinor) {
    throw new Error('card tendered amount must equal the payment amount');
  }
}

function assertPositiveMinor(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${field} must be a positive safe integer`);
  }
}

function safeAdd(left: number, right: number): number {
  const total = left + right;
  if (!Number.isSafeInteger(total)) {
    throw new Error('payment total exceeds safe integer range');
  }
  return total;
}

function defaultUuid(): string {
  return String(uuid.v4());
}
