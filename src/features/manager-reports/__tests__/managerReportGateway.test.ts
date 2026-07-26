import { ManagerReport, ManagerReportGateway } from '../managerReportGateway';

describe('ManagerReportGateway', () => {
  it('requests the branch ledger with an optional waiter attribution filter', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: report, error: null });
    const gateway = new ManagerReportGateway({ rpc } as never);

    await expect(
      gateway.load({
        organizationId: 'organization-1' as never,
        branchId: 'branch-1' as never,
        dateFrom: '2026-07-20',
        dateTo: '2026-07-26',
        waiterId: 'waiter-1' as never,
      }),
    ).resolves.toEqual(report);
    expect(rpc).toHaveBeenCalledWith('get_manager_report', {
      requested_organization_id: 'organization-1',
      requested_branch_id: 'branch-1',
      requested_date_from: '2026-07-20',
      requested_date_to: '2026-07-26',
      requested_waiter_id: 'waiter-1',
    });
  });

  it('surfaces manager authorization errors and rejects malformed responses', async () => {
    const denied = new ManagerReportGateway({
      rpc: jest.fn().mockResolvedValue({
        data: null,
        error: { code: '42501', message: 'manager_role_required' },
      }),
    } as never);
    await expect(
      denied.load({
        organizationId: 'organization-1' as never,
        branchId: 'branch-1' as never,
        dateFrom: '2026-07-20',
        dateTo: '2026-07-26',
      }),
    ).rejects.toMatchObject({ message: 'manager_role_required' });

    const malformed = new ManagerReportGateway({
      rpc: jest.fn().mockResolvedValue({ data: { summary: {} }, error: null }),
    } as never);
    await expect(
      malformed.load({
        organizationId: 'organization-1' as never,
        branchId: 'branch-1' as never,
        dateFrom: '2026-07-20',
        dateTo: '2026-07-26',
      }),
    ).rejects.toThrow('response is invalid');
  });
});

const report: ManagerReport = {
  generatedAt: '2026-07-26T18:00:00.000Z',
  organizationId: 'organization-1' as never,
  branchId: 'branch-1' as never,
  branchName: 'Sofia',
  currencyCode: 'EUR',
  dateFrom: '2026-07-20',
  dateTo: '2026-07-26',
  selectedWaiterId: 'waiter-1' as never,
  summary: {
    confirmedRevenueMinor: 1_500,
    receiptCount: 2,
    confirmedPaymentCount: 2,
    servedTableCount: 2,
    averageReceiptMinor: 750,
    cancelledItemCount: 1,
    cancelledValueMinor: 500,
    selectedWaiterContributionMinor: 1_000,
    selectedWaiterPaymentHandledMinor: 1_500,
    currentOpenTableCount: 1,
    currentPaymentPendingCount: 0,
    currentOpenBalanceMinor: 400,
    activeWaiterCount: 1,
  },
  waiters: [
    {
      userId: 'waiter-1' as never,
      displayName: 'Şule',
      itemRows: 2,
      itemQuantity: 3,
      contributedRevenueMinor: 1_000,
      paymentHandledMinor: 1_500,
      paymentCount: 2,
      tablesServed: 2,
      cancellationCount: 1,
      cancellationValueMinor: 500,
      helpedTableCount: 1,
      observedActiveMinutes: 42,
    },
  ],
  daily: [
    {
      businessDate: '2026-07-26',
      confirmedRevenueMinor: 1_500,
      receiptCount: 2,
      cancellationCount: 1,
      selectedWaiterContributionMinor: 1_000,
    },
  ],
  cancellations: [],
  definitions: { confirmedRevenue: 'confirmed allocations' },
};
