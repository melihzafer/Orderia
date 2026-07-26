import { buildLegacyShiftBoard } from '../legacyShiftBoardAdapter';

describe('buildLegacyShiftBoard', () => {
  it('keeps local-only tables usable and excludes cancelled lines from totals', () => {
    const snapshot = buildLegacyShiftBoard(
      {
        currencyCode: 'EUR',
        currentWaiterName: 'Deniz Kaya',
        fallbackHallName: 'Unassigned',
        halls: [
          {
            id: 'hall-1',
            name: 'Terrace',
            createdAt: 1,
            nextTableSequence: 2,
          },
        ],
        tables: [
          {
            id: 'hall-1-1',
            hallId: 'hall-1',
            seq: 1,
            isOpen: true,
            activeTicketIds: ['ticket-1'],
          },
        ],
        tickets: {
          'ticket-1': {
            id: 'ticket-1',
            tableId: 'hall-1-1',
            status: 'open',
            createdAt: Date.parse('2026-07-26T12:45:00.000Z'),
            lines: [
              {
                id: 'line-1',
                menuItemId: 'fries',
                nameSnapshot: 'Fries',
                priceSnapshot: 400,
                quantity: 2,
                status: 'pending',
                createdAt: 1,
                updatedAt: 1,
              },
              {
                id: 'line-2',
                menuItemId: 'steak',
                nameSnapshot: 'Steak',
                priceSnapshot: 5000,
                quantity: 1,
                status: 'cancelled',
                createdAt: 1,
                updatedAt: 1,
              },
            ],
          },
        },
      },
      new Date('2026-07-26T13:00:00.000Z'),
    );

    expect(snapshot.tables[0]).toMatchObject({
      syncStatus: 'local',
      state: 'open',
      durationMinutes: 15,
      totalMinor: 800,
      remainingMinor: 800,
      waiterNames: ['Deniz Kaya'],
      isMine: true,
    });
  });
});
