import {
  addMoney,
  getBusinessDate,
  money,
  multiplyMoney,
  toBusinessDayCutoff,
  toCurrencyCode,
} from '..';

describe('money', () => {
  const euro = toCurrencyCode('eur');

  it('uses integer minor units and preserves currency', () => {
    expect(addMoney(money(400, euro), multiplyMoney(money(50, euro), 2))).toEqual({
      amountMinor: 500,
      currencyCode: 'EUR',
    });
  });

  it('rejects floating-point amounts and mixed currencies', () => {
    expect(() => money(4.2, euro)).toThrow(/safe integer/);
    expect(() => addMoney(money(400, euro), money(400, toCurrencyCode('BGN')))).toThrow(
      /Currency mismatch/,
    );
  });
});

describe('branch-aware business dates', () => {
  const cutoff = toBusinessDayCutoff('05:00');

  it('assigns pre-cutoff activity to the previous Sofia business day', () => {
    expect(getBusinessDate('2026-07-26T01:30:00.000Z', 'Europe/Sofia', cutoff)).toBe('2026-07-25');
    expect(getBusinessDate('2026-07-26T02:30:00.000Z', 'Europe/Sofia', cutoff)).toBe('2026-07-26');
  });

  it('uses the branch timezone instead of the device timezone', () => {
    const instant = '2026-07-26T07:30:00.000Z';

    expect(getBusinessDate(instant, 'Europe/Sofia', cutoff)).toBe('2026-07-26');
    expect(getBusinessDate(instant, 'America/New_York', cutoff)).toBe('2026-07-25');
  });

  it('rejects invalid cutoffs and timezones', () => {
    expect(() => toBusinessDayCutoff('25:00')).toThrow(/Invalid business-day cutoff/);
    expect(() => getBusinessDate(Date.now(), 'Sofia/Invalid', cutoff)).toThrow(
      /Invalid IANA time zone/,
    );
  });
});
