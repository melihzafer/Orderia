import { assertManagerReportRange, managerReportRange } from '../managerReportRange';

describe('manager report range', () => {
  it('uses the branch-local business date across a UTC day boundary', () => {
    expect(managerReportRange('Europe/Sofia', 7, new Date('2026-07-26T21:30:00.000Z'))).toEqual({
      dateFrom: '2026-07-21',
      dateTo: '2026-07-27',
    });
  });

  it('rejects impossible, reversed, and overlong ranges', () => {
    expect(() =>
      assertManagerReportRange({ dateFrom: '2026-02-31', dateTo: '2026-03-01' }),
    ).toThrow('YYYY-MM-DD');
    expect(() =>
      assertManagerReportRange({ dateFrom: '2026-07-27', dateTo: '2026-07-26' }),
    ).toThrow('after end date');
    expect(() =>
      assertManagerReportRange({ dateFrom: '2025-01-01', dateTo: '2026-07-26' }),
    ).toThrow('366 days');
  });
});
