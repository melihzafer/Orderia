import { Receipt } from '../../../domain';
import { generateReceiptPdf } from '../receiptPdf';

describe('receipt PDF', () => {
  it('renders a real deterministic PDF with Unicode receipt content', async () => {
    const first = await generateReceiptPdf(receipt);
    const second = await generateReceiptPdf(receipt);

    expect(new TextDecoder().decode(first.slice(0, 5))).toBe('%PDF-');
    expect(first.length).toBeGreaterThan(3_000);
    expect(first).toEqual(second);
  });
});

const receipt: Receipt = {
  id: 'receipt-1' as never,
  organizationId: 'organization-1' as never,
  branchId: 'branch-1' as never,
  tableSessionId: 'session-1' as never,
  checkId: 'check-1' as never,
  receiptNumber: 'ORD-20260726-000001',
  businessDate: '2026-07-26' as never,
  issuedAt: '2026-07-26T18:00:00.000Z',
  issuedBy: 'waiter-1' as never,
  totalMinor: 500,
  currencyCode: 'EUR' as never,
  snapshot: {
    schemaVersion: 1,
    organizationName: 'Orderia Test',
    branchName: 'Sofia',
    branchTimezone: 'Europe/Sofia',
    tableLabel: 'Masa 4',
    openedAt: '2026-07-26T17:00:00.000Z',
    issuedAt: '2026-07-26T18:00:00.000Z',
    waiterDisplayNames: ['Şule Garson'],
    checks: [
      {
        checkId: 'check-1' as never,
        name: 'Pencere tarafı',
        items: [
          {
            orderItemId: 'item-1' as never,
            name: 'Peynirli patates',
            modifiers: [{ name: 'Peynirli', priceDeltaMinor: 100, quantity: 1 }],
            unitPriceMinor: 400,
            quantity: 1,
            lineTotalMinor: 500,
          },
        ],
        totalMinor: 500,
      },
    ],
    payments: [
      {
        paymentId: 'payment-1' as never,
        method: 'card',
        amountMinor: 500,
        confirmedAt: '2026-07-26T18:00:00.000Z',
        createdByDisplayName: 'Şule Garson',
      },
    ],
    totalMinor: 500,
    currencyCode: 'EUR' as never,
  },
  pdfStoragePath: 'organization-1/branch-1/2026-07-26/receipt-1.pdf',
  status: 'issued',
};
