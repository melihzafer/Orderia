import { ShiftBoardSnapshot, ShiftBoardTable } from './shiftBoardModel';
import { Hall, Table, Ticket } from '../../types';
import { calculateLinesTotal } from '../../utils/financeUtils';

export interface LegacyShiftBoardSource {
  readonly halls: readonly Hall[];
  readonly tables: readonly Table[];
  readonly tickets: Readonly<Record<string, Ticket>>;
  readonly currentWaiterName: string;
  readonly currencyCode: string;
  readonly fallbackHallName: string;
}

export function buildLegacyShiftBoard(
  source: LegacyShiftBoardSource,
  now = new Date(),
): ShiftBoardSnapshot {
  const hallById = new Map(source.halls.map((hall) => [hall.id, hall]));
  const halls = source.halls.map((hall, index) => ({
    id: hall.id,
    name: hall.name,
    sortOrder: index,
  }));
  const tables = source.tables
    .map((table) => {
      const tickets = table.activeTicketIds
        .map((ticketId) => source.tickets[ticketId])
        .filter((ticket): ticket is Ticket => Boolean(ticket));
      return buildLegacyTable(table, tickets, source, hallById, now);
    })
    .sort((left, right) => {
      const hallOrder =
        (halls.find((hall) => hall.id === left.hallId)?.sortOrder ?? 0) -
        (halls.find((hall) => hall.id === right.hallId)?.sortOrder ?? 0);
      return hallOrder || left.sequenceNumber - right.sequenceNumber;
    });

  return {
    halls,
    tables,
    openCount: tables.filter((table) => table.state !== 'available').length,
    attentionCount: 0,
    totalOpenMinor: tables.reduce((total, table) => total + table.remainingMinor, 0),
  };
}

function buildLegacyTable(
  table: Table,
  tickets: readonly Ticket[],
  source: LegacyShiftBoardSource,
  hallById: ReadonlyMap<string, Hall>,
  now: Date,
): ShiftBoardTable {
  const totalMinor = tickets.reduce(
    (total, ticket) => total + calculateLinesTotal(ticket.lines),
    0,
  );
  const openedAtMs =
    tickets.length > 0 ? Math.min(...tickets.map((ticket) => ticket.createdAt)) : undefined;
  const isOpen = table.isOpen || tickets.length > 0;

  return {
    id: table.id,
    hallId: table.hallId,
    hallName: hallById.get(table.hallId)?.name ?? source.fallbackHallName,
    label: table.label || `Table ${table.seq}`,
    sequenceNumber: table.seq,
    state: isOpen ? 'open' : 'available',
    syncStatus: 'local',
    pendingMutationCount: 0,
    ...(openedAtMs === undefined
      ? {}
      : {
          openedAt: new Date(openedAtMs).toISOString(),
          durationMinutes: Math.max(0, Math.floor((now.getTime() - openedAtMs) / 60_000)),
        }),
    totalMinor,
    paidMinor: 0,
    remainingMinor: totalMinor,
    currencyCode: source.currencyCode,
    checkCount: tickets.length,
    waiterNames: isOpen ? [source.currentWaiterName] : [],
    waiterInitials: isOpen ? [initials(source.currentWaiterName)] : [],
    isMine: isOpen,
    needsAttention: false,
  };
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase() ?? '')
    .join('');
}
