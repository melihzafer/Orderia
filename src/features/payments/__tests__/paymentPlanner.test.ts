import { CheckId, CurrencyCode, OrderItemId, toDomainId } from '../../../domain';
import {
  buildPayableOrderItems,
  buildConfirmCheckPaymentsCommand,
  splitMinorEqually,
} from '../paymentPlanner';

const checkId = toDomainId<CheckId>('check-1');
const currencyCode = 'EUR' as CurrencyCode;

describe('payment planner', () => {
  it('distributes remainder pennies without losing the total', () => {
    expect(splitMinorEqually(1_001, 3)).toEqual([334, 334, 333]);
    expect(splitMinorEqually(1_001, 3).reduce((total, part) => total + part, 0)).toBe(1_001);
  });

  it('keeps full item quantities when a tender consumes the whole item selection', () => {
    const command = buildConfirmCheckPaymentsCommand({
      checkId,
      expectedCheckVersion: 3,
      currencyCode,
      selections: [
        {
          checkId,
          orderItemId: toDomainId<OrderItemId>('item-1'),
          quantity: 2,
          amountMinor: 800,
        },
      ],
      tenders: [{ method: 'card', amountMinor: 800 }],
      createUuid: uuidSequence(),
    });

    expect(command.payments).toHaveLength(1);
    expect(command.payments[0]).toMatchObject({
      method: 'card',
      amountMinor: 800,
      allocations: [{ orderItemId: 'item-1', quantity: 2, amountMinor: 800 }],
    });
  });

  it('atomically divides a selection across cash and card without inventing quantity', () => {
    const command = buildConfirmCheckPaymentsCommand({
      checkId,
      expectedCheckVersion: 1,
      currencyCode,
      selections: [
        {
          checkId,
          orderItemId: toDomainId<OrderItemId>('item-1'),
          quantity: 2,
          amountMinor: 1_000,
        },
      ],
      tenders: [
        { method: 'cash', amountMinor: 400, tenderedMinor: 500 },
        { method: 'card', amountMinor: 600 },
      ],
      createUuid: uuidSequence(),
    });

    expect(command.payments.map((payment) => payment.amountMinor)).toEqual([400, 600]);
    expect(command.payments[0].allocations[0]).toMatchObject({
      orderItemId: 'item-1',
      amountMinor: 400,
    });
    expect(command.payments[0].allocations[0].quantity).toBeUndefined();
    expect(command.payments[1].allocations[0]).toMatchObject({
      orderItemId: 'item-1',
      amountMinor: 600,
    });
    expect(command.payments[1].allocations[0].quantity).toBeUndefined();
  });

  it('rejects tender totals that do not reconcile with the selection', () => {
    expect(() =>
      buildConfirmCheckPaymentsCommand({
        checkId,
        expectedCheckVersion: 1,
        currencyCode,
        selections: [{ checkId, amountMinor: 500 }],
        tenders: [{ method: 'card', amountMinor: 499 }],
      }),
    ).toThrow(/must equal/);
  });

  it('keeps quantity mode inside the amount left by previous item payments', () => {
    const base = {
      organizationId: 'organization-1',
      branchId: 'branch-1',
      tableSessionId: 'session-1',
    } as const;
    const itemId = toDomainId<OrderItemId>('item-1');
    const paymentId = 'payment-1' as never;
    const item = {
      ...base,
      id: itemId,
      checkId,
      orderBatchId: 'batch-1',
      nameSnapshot: 'Fries',
      unitPriceMinor: 400,
      currencyCode,
      taxRateBasisPoints: 0,
      quantity: 2,
      status: 'ordered',
      createdBy: 'waiter-1',
      updatedBy: 'waiter-1',
      originalTableId: 'table-1',
      originalTableSessionId: 'session-1',
      version: 1,
      createdAt: '2026-07-26T10:00:00.000Z',
      updatedAt: '2026-07-26T10:00:00.000Z',
      syncStatus: 'synced',
    } as never;
    const payment = {
      ...base,
      id: paymentId,
      method: 'card',
      status: 'confirmed',
      amountMinor: 500,
      currencyCode,
      createdBy: 'waiter-1',
      createdAt: '2026-07-26T10:01:00.000Z',
      confirmedAt: '2026-07-26T10:01:00.000Z',
      idempotencyKey: 'payment-1',
      deviceId: 'device-1',
      syncStatus: 'synced',
    } as never;
    const result = buildPayableOrderItems(
      {
        ...base,
        id: checkId,
        name: 'General',
        status: 'partially_paid',
        openedBy: 'waiter-1',
        openedAt: '2026-07-26T10:00:00.000Z',
        version: 2,
        createdAt: '2026-07-26T10:00:00.000Z',
        updatedAt: '2026-07-26T10:01:00.000Z',
        syncStatus: 'synced',
      } as never,
      [item],
      [],
      [payment],
      [
        {
          id: 'allocation-1',
          paymentId,
          checkId,
          orderItemId: itemId,
          amountMinor: 500,
        } as never,
      ],
    );

    expect(result.balance).toEqual({ totalMinor: 800, paidMinor: 500, remainingMinor: 300 });
    expect(result.items[0]).toMatchObject({
      unitTotalMinor: 400,
      remainingQuantity: 0,
      remainingMinor: 300,
    });
  });
});

function uuidSequence(): () => string {
  let index = 0;
  return () => `00000000-0000-4000-8000-${String(++index).padStart(12, '0')}`;
}
