import { ReceiptArchiveRow } from '../../../services/supabase';
import { ReceiptArchiveGateway } from '../receiptArchiveGateway';

describe('ReceiptArchiveGateway', () => {
  it('maps immutable snapshots and returns a stable keyset cursor', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [
        row('receipt-2', '2026-07-26T14:00:00.000Z'),
        row('receipt-1', '2026-07-26T13:00:00.000Z'),
      ],
      error: null,
    });
    const gateway = new ReceiptArchiveGateway({ rpc } as never);

    const page = await gateway.search({
      organizationId: 'organization-1' as never,
      branchId: 'branch-1' as never,
      filters: {
        query: 'Masa 4',
        dateFrom: '2026-07-20',
        waiterQuery: 'Şule',
        paymentMethod: 'card',
        amountMinMinor: 400,
      },
      pageSize: 1,
    });

    expect(page.items).toHaveLength(1);
    expect(page.items[0].receipt.receiptNumber).toBe('WB1-receipt-2');
    expect(page.nextCursor).toEqual({
      id: 'receipt-2',
      issuedAt: '2026-07-26T14:00:00.000Z',
    });
    expect(rpc).toHaveBeenCalledWith(
      'search_receipts',
      expect.objectContaining({
        requested_query: 'Masa 4',
        requested_waiter_query: 'Şule',
        requested_payment_method: 'card',
        requested_amount_min_minor: 400,
        requested_page_size: 1,
      }),
    );
  });

  it('forwards both cursor values and surfaces server errors', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'branch_access_denied' },
    });
    const gateway = new ReceiptArchiveGateway({ rpc } as never);

    await expect(
      gateway.search({
        organizationId: 'organization-1' as never,
        branchId: 'branch-2' as never,
        filters: {},
        cursor: { id: 'receipt-1', issuedAt: '2026-07-26T13:00:00.000Z' },
      }),
    ).rejects.toMatchObject({ message: 'branch_access_denied' });
    expect(rpc).toHaveBeenCalledWith(
      'search_receipts',
      expect.objectContaining({
        requested_after_id: 'receipt-1',
        requested_after_issued_at: '2026-07-26T13:00:00.000Z',
      }),
    );
  });
});

function row(id: string, issuedAt: string): ReceiptArchiveRow {
  return {
    id,
    organization_id: 'organization-1',
    branch_id: 'branch-1',
    branch_name: 'Sofia',
    branch_timezone: 'Europe/Sofia',
    table_session_id: 'session-1',
    check_id: 'check-1',
    receipt_number: `WB1-${id}`,
    business_date: '2026-07-26',
    issued_at: issuedAt,
    issued_by: 'waiter-1',
    total_minor: 500,
    currency_code: 'EUR',
    snapshot_json: {
      schemaVersion: 1,
      organizationName: 'Orderia',
      branchName: 'Sofia',
      branchTimezone: 'Europe/Sofia',
      tableLabel: 'Masa 4',
      openedAt: '2026-07-26T12:00:00.000Z',
      issuedAt,
      waiterDisplayNames: ['Şule'],
      checks: [],
      payments: [],
      totalMinor: 500,
      currencyCode: 'EUR',
    },
    pdf_storage_path: `organization-1/branch-1/2026-07-26/${id}.pdf`,
    pdf_hash: null,
    status: 'issued',
    adjusts_receipt_id: null,
    has_adjustment: false,
  };
}
