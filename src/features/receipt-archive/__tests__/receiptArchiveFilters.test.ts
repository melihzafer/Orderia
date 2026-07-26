import {
  activeReceiptFilterCount,
  buildReceiptArchiveFilters,
  defaultReceiptArchiveFilters,
  withDateRange,
} from '../receiptArchiveFilters';

describe('receipt archive filters', () => {
  it('builds precise server filters and converts display currency to minor units', () => {
    const filters = buildReceiptArchiveFilters(
      {
        ...defaultReceiptArchiveFilters('Europe/Sofia', 7, new Date('2026-07-26T18:00:00.000Z')),
        query: ' Masa 4 ',
        timeFrom: '13:00',
        timeTo: '14:00',
        waiterQuery: ' Şule ',
        paymentMethod: 'card',
        amountMin: '4,50',
        amountMax: '20',
        adjustment: 'with',
      },
      'EUR',
    );

    expect(filters).toEqual({
      query: 'Masa 4',
      dateFrom: '2026-07-20',
      dateTo: '2026-07-26',
      timeFrom: '13:00',
      timeTo: '14:00',
      waiterQuery: 'Şule',
      paymentMethod: 'card',
      amountMinMinor: 450,
      amountMaxMinor: 2_000,
      hasAdjustment: true,
    });
    expect(
      activeReceiptFilterCount({
        ...defaultReceiptArchiveFilters('UTC'),
        waiterQuery: 'Şule',
        paymentMethod: 'card',
        amountMin: '4',
      }),
    ).toBe(4);
  });

  it('supports branch-local quick date ranges', () => {
    const initial = defaultReceiptArchiveFilters(
      'Europe/Sofia',
      7,
      new Date('2026-07-26T22:30:00.000Z'),
    );
    const today = withDateRange(initial, 'Europe/Sofia', 1, new Date('2026-07-26T22:30:00.000Z'));

    expect(today.dateFrom).toBe('2026-07-27');
    expect(today.dateTo).toBe('2026-07-27');
  });

  it('rejects invalid ranges before making a server call', () => {
    expect(() =>
      buildReceiptArchiveFilters(
        {
          ...defaultReceiptArchiveFilters('UTC'),
          dateFrom: '2026-08-01',
          dateTo: '2026-07-01',
        },
        'EUR',
      ),
    ).toThrow(/Start date/);
    expect(() =>
      buildReceiptArchiveFilters(
        {
          ...defaultReceiptArchiveFilters('UTC'),
          timeFrom: '25:90',
        },
        'EUR',
      ),
    ).toThrow(/start time/);
  });
});
