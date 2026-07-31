import { inspectLegacyMigration, prepareLegacyMigration } from '../legacyMigration';

function backup() {
  return {
    version: '1.0.0',
    data: {
      halls: [{ id: 'hall-1', name: 'Salon', createdAt: 1_700_000_000_000, nextTableSequence: 2 }],
      tables: [
        {
          id: 'table-1',
          hallId: 'hall-1',
          seq: 1,
          label: 'Masa 1',
          isOpen: false,
          activeTicketIds: [],
        },
      ],
      categories: [{ id: 'cat-1', name: 'Yemek', order: 0 }],
      menuItems: [
        {
          id: 'item-1',
          categoryId: 'cat-1',
          name: 'Patates',
          price: 400,
          isActive: true,
        },
      ],
      openTickets: {},
      dailyHistory: {
        '2026-07-20': {
          totals: { gross: 800, byCategory: { Yemek: 800 } },
          tickets: [
            {
              id: 'ticket-1',
              tableId: 'table-1',
              status: 'paid',
              createdAt: 1_700_000_000_000,
              closedAt: 1_700_000_100_000,
              lines: [
                {
                  id: 'line-1',
                  menuItemId: 'item-1',
                  nameSnapshot: 'Patates',
                  priceSnapshot: 400,
                  quantity: 2,
                  createdByName: 'Ayşe',
                  status: 'paid',
                  createdAt: 1_700_000_000_000,
                  updatedAt: 1_700_000_100_000,
                },
              ],
            },
          ],
        },
      },
    },
  };
}

describe('legacy migration inspection', () => {
  it('produces a deterministic, financially reconciled dry-run', () => {
    const first = prepareLegacyMigration(backup());
    const second = prepareLegacyMigration(backup());

    expect(first.report).toEqual(
      expect.objectContaining({
        blockingIssueCount: 0,
        computedClosedGrossMinor: 800,
        reconciled: true,
        sourceClosedGrossMinor: 800,
        warningCount: 0,
      }),
    );
    expect(first.report.snapshotHash).toBe(second.report.snapshotHash);
  });

  it('excludes cancelled rows and blocks a mismatched legacy gross total', () => {
    const raw = backup();
    raw.data.dailyHistory['2026-07-20'].tickets[0].lines[0].status = 'cancelled';
    const prepared = prepareLegacyMigration(raw);

    expect(prepared.report.computedClosedGrossMinor).toBe(0);
    expect(prepared.report.reconciled).toBe(false);
    expect(prepared.report.issues).toContainEqual(
      expect.objectContaining({ code: 'financial_reconciliation_mismatch', severity: 'error' }),
    );
  });

  it('keeps missing catalog references as warnings but never drops orphan tickets', () => {
    const prepared = prepareLegacyMigration(backup());
    const snapshot = {
      ...prepared.snapshot,
      menuItems: [],
      tables: [],
    };
    const report = inspectLegacyMigration(snapshot);

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'missing_menu_snapshot', severity: 'warning' }),
        expect.objectContaining({ code: 'orphan_ticket', severity: 'error' }),
      ]),
    );
    expect(report.counts.closedTickets).toBe(1);
    expect(report.counts.orderItems).toBe(1);
  });

  it('blocks duplicate order-line IDs before deterministic IDs can collide', () => {
    const raw = backup();
    const line = raw.data.dailyHistory['2026-07-20'].tickets[0].lines[0];
    raw.data.dailyHistory['2026-07-20'].tickets[0].lines.push({ ...line });

    const prepared = prepareLegacyMigration(raw);

    expect(prepared.report.reconciled).toBe(false);
    expect(prepared.report.issues).toContainEqual(
      expect.objectContaining({
        code: 'duplicate_legacy_id',
        path: 'ticketLines[1].id',
        severity: 'error',
      }),
    );
  });

  it('rejects structurally invalid backups before any write can occur', () => {
    expect(() => prepareLegacyMigration({ version: '1.0.0', data: {} })).toThrow(
      'data.halls must be an array',
    );
  });
});
