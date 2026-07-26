import { ManagerReport } from '../managerReportGateway';
import { createManagerReportCsv } from '../managerReportExport';

describe('manager report CSV', () => {
  it('exports transparent item, payment, cancellation, help, and activity attribution', () => {
    const csv = createManagerReportCsv(report);

    expect(csv).toMatch(/contributed_revenue_minor,payments_handled_minor/);
    expect(csv).toMatch(/cancellation_count,cancellation_value_minor,helped_tables/);
    expect(csv).toContain('"Şule, Akın"');
    expect(csv).toContain(',1000,1500,2,2,1,500,1,42');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv.endsWith('\n')).toBe(true);
  });
});

const report = {
  branchId: 'branch-1',
  dateFrom: '2026-07-20',
  dateTo: '2026-07-26',
  waiters: [
    {
      displayName: 'Şule, Akın',
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
} as unknown as ManagerReport;
