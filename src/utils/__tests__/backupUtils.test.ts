import { createOrderiaBackup, parseOrderiaBackup } from '../backupUtils';

describe('Orderia backup format', () => {
  it('round-trips the local data shape', () => {
    const backup = createOrderiaBackup(
      {
        halls: [],
        tables: [],
        categories: [],
        menuItems: [],
        openTickets: {},
        dailyHistory: {},
      },
      '2026-07-31T12:00:00.000Z',
    );

    expect(parseOrderiaBackup(JSON.stringify(backup))).toEqual(backup);
  });

  it('rejects malformed or unrelated JSON before changing stores', () => {
    expect(() => parseOrderiaBackup('{"hello":"world"}')).toThrow(
      'desteklenen bir Orderia yedeği değil',
    );
    expect(() => parseOrderiaBackup('{')).toThrow('geçerli bir JSON değil');
  });
});
