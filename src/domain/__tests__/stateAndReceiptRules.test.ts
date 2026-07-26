import {
  assertCheckTransition,
  assertIssuedReceiptUnchanged,
  assertOrderItemTransition,
  assertPaymentTransition,
  assertReceiptStatusTransition,
  assertTableSessionTransition,
  assertValidReceipt,
  BranchId,
  CheckId,
  OrganizationId,
  OrderItemId,
  PaymentId,
  Receipt,
  ReceiptId,
  TableSessionId,
  UserId,
  getBusinessDate,
  toBusinessDayCutoff,
  toCurrencyCode,
  toDomainId,
} from '..';

const organizationId = toDomainId<OrganizationId>('organization-1');
const branchId = toDomainId<BranchId>('branch-1');
const sessionId = toDomainId<TableSessionId>('session-1');
const checkId = toDomainId<CheckId>('check-1');
const receiptId = toDomainId<ReceiptId>('receipt-1');
const userId = toDomainId<UserId>('user-1');
const issuedAt = '2026-07-26T13:00:00.000Z';
const euro = toCurrencyCode('EUR');

function createReceipt(overrides: Partial<Receipt> = {}): Receipt {
  const paymentId = toDomainId<PaymentId>('payment-1');
  const itemId = toDomainId<OrderItemId>('item-1');

  return {
    id: receiptId,
    organizationId,
    branchId,
    tableSessionId: sessionId,
    checkId,
    receiptNumber: 'SOF-20260726-0001',
    businessDate: getBusinessDate(issuedAt, 'Europe/Sofia', toBusinessDayCutoff('05:00')),
    issuedAt,
    issuedBy: userId,
    totalMinor: 800,
    currencyCode: euro,
    status: 'issued',
    snapshot: {
      schemaVersion: 1,
      organizationName: 'Orderia Demo',
      branchName: 'Sofia Center',
      branchTimezone: 'Europe/Sofia',
      tableLabel: 'Masa 4',
      openedAt: '2026-07-26T12:00:00.000Z',
      issuedAt,
      waiterDisplayNames: ['Ayşe'],
      checks: [
        {
          checkId,
          name: 'Kişi 1',
          items: [
            {
              orderItemId: itemId,
              name: 'Patates Kızartması',
              modifiers: [],
              unitPriceMinor: 400,
              quantity: 2,
              lineTotalMinor: 800,
            },
          ],
          totalMinor: 800,
        },
      ],
      payments: [
        {
          paymentId,
          method: 'card',
          amountMinor: 800,
          confirmedAt: issuedAt,
          createdByDisplayName: 'Ayşe',
        },
      ],
      totalMinor: 800,
      currencyCode: euro,
    },
    ...overrides,
  };
}

describe('domain state transitions', () => {
  it('allows operational forward transitions', () => {
    expect(() => assertOrderItemTransition('ordered', 'served')).not.toThrow();
    expect(() => assertCheckTransition('open', 'partially_paid')).not.toThrow();
    expect(() => assertTableSessionTransition('payment_pending', 'closed')).not.toThrow();
    expect(() => assertPaymentTransition('pending', 'confirmed')).not.toThrow();
  });

  it('rejects reopened terminal financial states', () => {
    expect(() => assertOrderItemTransition('cancelled', 'ordered')).toThrow(/Invalid/);
    expect(() => assertCheckTransition('paid', 'open')).toThrow(/Invalid/);
    expect(() => assertPaymentTransition('confirmed', 'voided')).toThrow(/Invalid/);
    expect(() => assertReceiptStatusTransition('issued', 'voided')).toThrow(/immutable/);
  });
});

describe('immutable receipt rules', () => {
  it('reconciles snapshot, check and receipt totals', () => {
    expect(() => assertValidReceipt(createReceipt())).not.toThrow();
    expect(() =>
      assertValidReceipt(
        createReceipt({
          totalMinor: 801,
        }),
      ),
    ).toThrow(/snapshot total/);
  });

  it('requires corrections to create a separate adjustment receipt', () => {
    const original = createReceipt();

    expect(() => assertIssuedReceiptUnchanged(original, { ...original })).not.toThrow();
    expect(() =>
      assertIssuedReceiptUnchanged(original, {
        ...original,
        pdfStoragePath: 'receipts/re-rendered.pdf',
      }),
    ).toThrow(/adjustment receipt/);
  });
});
