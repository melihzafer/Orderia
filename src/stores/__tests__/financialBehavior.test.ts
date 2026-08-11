import { generateDateKey } from '../../constants/branding';
import { Ticket, TicketLine } from '../../types';
import { useHistoryStore } from '../historyStore';
import { useLayoutStore } from '../layoutStore';
import { useMenuStore } from '../menuStore';
import { useOrderStore } from '../orderStore';

jest.mock('../../services/notificationService', () => ({
  notificationService: {
    cancelDeliveryNotifications: jest.fn(),
    scheduleDeliveryNotifications: jest.fn().mockResolvedValue([]),
  },
}));

const now = new Date('2026-07-26T13:00:00.000Z');

function createLine(overrides: Partial<TicketLine> = {}): TicketLine {
  return {
    id: 'line-1',
    menuItemId: 'item-1',
    nameSnapshot: 'Patates Kızartması',
    priceSnapshot: 400,
    quantity: 1,
    status: 'pending',
    createdAt: now.getTime(),
    updatedAt: now.getTime(),
    ...overrides,
  };
}

function createTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 'ticket-1',
    tableId: 'table-1',
    status: 'open',
    createdAt: now.getTime(),
    lines: [],
    ...overrides,
  };
}

describe('legacy financial behavior', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);

    useHistoryStore.setState({ dailyHistory: {} });
    useLayoutStore.setState({ halls: [], tables: [] });
    useMenuStore.setState({ categories: [], menuItems: [] });
    useOrderStore.setState({ openTickets: {} });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('excludes cancelled lines from open and paid totals', () => {
    const ticket = createTicket({
      lines: [
        createLine({ id: 'billable', priceSnapshot: 400, quantity: 2 }),
        createLine({
          id: 'cancelled',
          priceSnapshot: 900,
          quantity: 3,
          status: 'cancelled',
        }),
      ],
    });

    useOrderStore.setState({ openTickets: { [ticket.id]: ticket } });

    expect(useOrderStore.getState().getTicketTotal(ticket.id)).toBe(800);

    useOrderStore.getState().closeTicket(ticket.id, {
      total: 800,
      amountReceived: 800,
      change: 0,
      paymentMethod: 'cash',
    });

    const history = useHistoryStore.getState().getDayHistory(generateDateKey(now));
    expect(history?.totals.gross).toBe(800);
  });

  it('keeps open-ticket exposure separate from paid revenue', () => {
    const ticket = createTicket({
      lines: [createLine({ priceSnapshot: 1250, quantity: 2 })],
    });

    useOrderStore.setState({ openTickets: { [ticket.id]: ticket } });

    expect(useOrderStore.getState().getTodayTotal()).toBe(2500);
    expect(useHistoryStore.getState().getTotalGrossForDate(generateDateKey(now))).toBe(0);

    useOrderStore.getState().closeTicket(ticket.id, {
      total: 2500,
      paymentMethod: 'card',
    });

    expect(useOrderStore.getState().getTodayTotal()).toBe(0);
    expect(useHistoryStore.getState().getTotalGrossForDate(generateDateKey(now))).toBe(2500);
  });

  it('moves a ticket to another table and keeps both tables activeTicketIds/isOpen in sync', () => {
    const ticket = createTicket({ tableId: 'table-1' });
    useLayoutStore.setState({
      tables: [
        { id: 'table-1', hallId: 'hall-1', seq: 1, isOpen: true, activeTicketIds: [ticket.id] },
        { id: 'table-2', hallId: 'hall-1', seq: 2, isOpen: false, activeTicketIds: [] },
      ],
    });
    useOrderStore.setState({ openTickets: { [ticket.id]: ticket } });

    useOrderStore.getState().moveTicketToTable(ticket.id, 'table-2');

    expect(useOrderStore.getState().openTickets[ticket.id].tableId).toBe('table-2');
    const [sourceTable, targetTable] = useLayoutStore.getState().tables;
    expect(sourceTable.isOpen).toBe(false);
    expect(sourceTable.activeTicketIds).toEqual([]);
    expect(targetTable.isOpen).toBe(true);
    expect(targetTable.activeTicketIds).toEqual([ticket.id]);
  });

  it('does nothing when moving a ticket to its current table', () => {
    const ticket = createTicket({ tableId: 'table-1' });
    useLayoutStore.setState({
      tables: [{ id: 'table-1', hallId: 'hall-1', seq: 1, isOpen: true, activeTicketIds: [ticket.id] }],
    });
    useOrderStore.setState({ openTickets: { [ticket.id]: ticket } });

    useOrderStore.getState().moveTicketToTable(ticket.id, 'table-1');

    expect(useOrderStore.getState().openTickets[ticket.id].tableId).toBe('table-1');
    expect(useLayoutStore.getState().tables[0].activeTicketIds).toEqual([ticket.id]);
  });

  it('preserves historical item name and price snapshots after menu mutations', () => {
    useMenuStore.setState({
      categories: [{ id: 'category-1', name: 'Atıştırmalık', order: 0 }],
      menuItems: [
        {
          id: 'item-1',
          categoryId: 'category-1',
          name: 'Patates Kızartması',
          price: 400,
          isActive: true,
        },
      ],
    });

    const ticket = createTicket();
    useOrderStore.setState({ openTickets: { [ticket.id]: ticket } });

    useOrderStore.getState().addTicketLine(ticket.id, {
      menuItemId: 'item-1',
      quantity: 2,
    });
    useMenuStore.getState().updateMenuItem('item-1', {
      name: 'Büyük Patates',
      price: 700,
    });
    useOrderStore.getState().closeTicket(ticket.id, {
      total: 800,
      paymentMethod: 'card',
    });

    const historicalTicket = useHistoryStore.getState().getDayHistory(generateDateKey(now))
      ?.tickets[0];

    expect(historicalTicket?.lines[0]).toMatchObject({
      nameSnapshot: 'Patates Kızartması',
      priceSnapshot: 400,
      quantity: 2,
    });
    expect(useHistoryStore.getState().getTotalGrossForDate(generateDateKey(now))).toBe(800);
  });

  it('uses the local calendar day for history keys near midnight', () => {
    const localDate = new Date(2026, 6, 26, 0, 30);

    expect(generateDateKey(localDate)).toBe('2026-07-26');
  });

  it('treats weekly start-date keys as local calendar dates', () => {
    useHistoryStore.setState({
      dailyHistory: {
        '2026-07-26': {
          id: '2026-07-26',
          tickets: [],
          totals: { gross: 100, byCategory: {} },
          generatedAt: 0,
        },
        '2026-08-01': {
          id: '2026-08-01',
          tickets: [],
          totals: { gross: 700, byCategory: {} },
          generatedAt: 0,
        },
      },
    });

    expect(useHistoryStore.getState().getWeeklyTotal('2026-07-26')).toBe(800);
  });
});
