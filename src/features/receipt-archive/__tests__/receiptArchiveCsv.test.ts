import { receiptArchiveCsv } from '../receiptArchiveCsv';

describe('receiptArchiveCsv', () => {
  it('exports immutable receipt snapshots with escaped cells', () => {
    const csv = receiptArchiveCsv([
      {
        branchName: 'Branch',
        branchTimezone: 'UTC',
        hasAdjustment: false,
        receipt: {
          id: 'receipt-1' as never,
          organizationId: 'organization-1' as never,
          branchId: 'branch-1' as never,
          tableSessionId: 'session-1' as never,
          checkId: 'check-1' as never,
          receiptNumber: 'WB-1',
          businessDate: '2026-07-31' as never,
          issuedAt: '2026-07-31T20:11:00.000Z',
          issuedBy: 'user-1' as never,
          totalMinor: 1200,
          currencyCode: 'EUR' as never,
          snapshot: {
            schemaVersion: 1,
            organizationName: 'Orderia',
            branchName: 'Branch',
            branchTimezone: 'UTC',
            tableLabel: 'Table 4',
            openedAt: '2026-07-31T20:00:00.000Z',
            issuedAt: '2026-07-31T20:11:00.000Z',
            waiterDisplayNames: ['Melih'],
            checks: [
              {
                checkId: 'check-1' as never,
                name: 'Mehmet, window',
                items: [
                  {
                    orderItemId: 'item-1' as never,
                    name: 'Kola, büyük',
                    modifiers: [],
                    unitPriceMinor: 1200,
                    quantity: 1,
                    lineTotalMinor: 1200,
                  },
                ],
                totalMinor: 1200,
              },
            ],
            payments: [],
            totalMinor: 1200,
            currencyCode: 'EUR' as never,
          },
          status: 'issued',
        },
      },
    ]);

    expect(csv).toContain('receipt_number,issued_at,table');
    expect(csv).toContain('"Mehmet, window"');
    expect(csv).toContain('"1x Kola, büyük"');
  });
});
