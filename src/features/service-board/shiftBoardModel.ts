import {
  Check,
  Hall,
  OrderItem,
  OrderItemModifier,
  Payment,
  PaymentAllocation,
  RestaurantTable,
  TableSession,
  calculateCheckBalance,
} from '../../domain';
import {
  DomainEntityMap,
  LocalDatabase,
  RepositoryName,
  RepositoryScope,
} from '../../data/contracts';
import { createTextMatcher } from '../../utils/searchUtils';

export type ShiftBoardTableState =
  'available' | 'open' | 'payment_pending' | 'sync_issue' | 'conflict';

export type ShiftBoardEntitySync = 'local' | 'synced' | 'pending' | 'rejected' | 'conflict';

export interface ShiftBoardHall {
  readonly id: string;
  readonly name: string;
  readonly sortOrder: number;
}

export interface ShiftBoardTable {
  readonly id: string;
  readonly hallId: string;
  readonly hallName: string;
  readonly label: string;
  readonly sequenceNumber: number;
  readonly capacity?: number;
  readonly state: ShiftBoardTableState;
  readonly syncStatus: ShiftBoardEntitySync;
  readonly pendingMutationCount: number;
  readonly openedAt?: string;
  readonly durationMinutes?: number;
  readonly totalMinor: number;
  readonly paidMinor: number;
  readonly remainingMinor: number;
  readonly currencyCode: string;
  readonly checkCount: number;
  /** Customer/order names are searchable from the open-order board. */
  readonly checkNames?: readonly string[];
  readonly waiterNames: readonly string[];
  readonly waiterInitials: readonly string[];
  readonly isMine: boolean;
  readonly needsAttention: boolean;
}

export interface ShiftBoardSnapshot {
  readonly halls: readonly ShiftBoardHall[];
  readonly tables: readonly ShiftBoardTable[];
  readonly openCount: number;
  readonly attentionCount: number;
  readonly totalOpenMinor: number;
}

export interface DomainShiftBoardSource {
  readonly halls: readonly Hall[];
  readonly tables: readonly RestaurantTable[];
  readonly sessions: readonly TableSession[];
  readonly checks: readonly Check[];
  readonly items: readonly OrderItem[];
  readonly modifiers: readonly OrderItemModifier[];
  readonly payments: readonly Payment[];
  readonly allocations: readonly PaymentAllocation[];
  readonly currentUserId?: string;
  readonly waiterNames?: Readonly<Record<string, string>>;
  readonly fallbackCurrencyCode: string;
  readonly fallbackHallName: string;
  readonly unknownWaiterName: string;
}

/**
 * Ana ekranın hızlı işlemleri de aynı filtreyi kullanır: "Açık hesaplar" ve
 * "Ödeme al" ayrı bir ekran açmak yerine listeyi daraltır, böylece garson
 * bulunduğu yerde kalır.
 */
export type ShiftBoardScopeFilter = 'all' | 'mine' | 'alerts' | 'open' | 'payment' | 'available';

export interface ShiftBoardFilters {
  readonly scope: ShiftBoardScopeFilter;
  readonly hallId?: string;
  readonly query?: string;
}

export interface LoadDomainShiftBoardOptions extends Pick<
  DomainShiftBoardSource,
  | 'currentUserId'
  | 'waiterNames'
  | 'fallbackCurrencyCode'
  | 'fallbackHallName'
  | 'unknownWaiterName'
> {
  readonly resolveWaiterNames?: (
    userIds: readonly string[],
  ) => Promise<Readonly<Record<string, string>>>;
}

export async function loadDomainShiftBoard(
  database: LocalDatabase,
  scope: Required<RepositoryScope>,
  options: LoadDomainShiftBoardOptions,
  now = new Date(),
): Promise<ShiftBoardSnapshot> {
  const [halls, tables, sessions, checks, items, modifiers, payments, allocations] =
    await Promise.all([
      loadAll(database, 'halls', scope),
      loadAll(database, 'restaurantTables', scope),
      loadAll(database, 'tableSessions', scope),
      loadAll(database, 'checks', scope),
      loadAll(database, 'orderItems', scope),
      loadAll(database, 'orderItemModifiers', scope),
      loadAll(database, 'payments', scope),
      loadAll(database, 'paymentAllocations', scope),
    ]);
  const resolvedWaiterNames = options.resolveWaiterNames
    ? await options
        .resolveWaiterNames(
          unique([
            ...sessions.map((session) => session.openedBy),
            ...checks.map((check) => check.openedBy),
            ...items.flatMap((item) => [item.createdBy, item.updatedBy]),
            ...payments.map((payment) => payment.createdBy),
          ]),
        )
        .catch(() => ({}))
    : {};

  return buildDomainShiftBoard(
    {
      halls,
      tables,
      sessions,
      checks,
      items,
      modifiers,
      payments,
      allocations,
      ...options,
      waiterNames: {
        ...options.waiterNames,
        ...resolvedWaiterNames,
      },
    },
    now,
  );
}

export function buildDomainShiftBoard(
  source: DomainShiftBoardSource,
  now = new Date(),
): ShiftBoardSnapshot {
  const halls = source.halls
    .map((hall) => ({
      id: hall.id,
      name: hall.name,
      sortOrder: hall.sortOrder,
    }))
    .sort(compareHall);
  const hallById = new Map<string, ShiftBoardHall>(halls.map((hall) => [hall.id, hall]));
  const activeSessions = source.sessions.filter(
    (session) => session.status === 'open' || session.status === 'payment_pending',
  );
  const tables = source.tables
    .map((table) => buildTable(table, hallById.get(table.hallId), activeSessions, source, now))
    .sort((left, right) => {
      const hallOrder =
        (hallById.get(left.hallId)?.sortOrder ?? 0) - (hallById.get(right.hallId)?.sortOrder ?? 0);
      return (
        hallOrder ||
        left.sequenceNumber - right.sequenceNumber ||
        left.label.localeCompare(right.label)
      );
    });

  return {
    halls,
    tables,
    openCount: tables.filter((table) => table.state !== 'available').length,
    attentionCount: tables.filter((table) => table.needsAttention).length,
    totalOpenMinor: tables.reduce((total, table) => total + table.remainingMinor, 0),
  };
}

export function filterShiftBoardTables(
  tables: readonly ShiftBoardTable[],
  filters: ShiftBoardFilters,
): readonly ShiftBoardTable[] {
  const matches = createTextMatcher(filters.query ?? '');

  return tables.filter((table) => {
    if (filters.hallId && table.hallId !== filters.hallId) return false;
    if (filters.scope === 'mine' && !table.isMine) return false;
    if (filters.scope === 'alerts' && !table.needsAttention) return false;
    if (filters.scope === 'open' && table.state === 'available') return false;
    if (filters.scope === 'payment' && table.state !== 'payment_pending') return false;
    if (filters.scope === 'available' && table.state !== 'available') return false;

    return matches(
      [
        table.label,
        table.hallName,
        ...(table.checkNames ?? []),
        ...table.waiterNames,
        ...table.waiterInitials,
      ].join(' '),
    );
  });
}

function buildTable(
  table: RestaurantTable,
  hall: ShiftBoardHall | undefined,
  activeSessions: readonly TableSession[],
  source: DomainShiftBoardSource,
  now: Date,
): ShiftBoardTable {
  const tableSessions = activeSessions
    .filter((session) => session.tableId === table.id)
    .sort((left, right) => right.openedAt.localeCompare(left.openedAt));
  const session = tableSessions[0];

  if (!session) {
    return {
      id: table.id,
      hallId: table.hallId,
      hallName: hall?.name ?? source.fallbackHallName,
      label: table.label,
      sequenceNumber: table.sequenceNumber,
      ...(table.capacity === undefined ? {} : { capacity: table.capacity }),
      state: table.syncStatus === 'conflict' ? 'conflict' : 'available',
      syncStatus: mapSyncStatus(table.syncStatus),
      pendingMutationCount: table.syncStatus === 'pending' ? 1 : 0,
      totalMinor: 0,
      paidMinor: 0,
      remainingMinor: 0,
      currencyCode: source.fallbackCurrencyCode,
      checkCount: 0,
      checkNames: [],
      waiterNames: [],
      waiterInitials: [],
      isMine: false,
      needsAttention: table.syncStatus === 'conflict',
    };
  }

  const checks = source.checks.filter(
    (check) =>
      check.tableSessionId === session.id && check.status !== 'voided' && check.status !== 'paid',
  );
  const items = source.items.filter((item) => item.tableSessionId === session.id);
  const modifiers = source.modifiers.filter((modifier) =>
    items.some((item) => item.id === modifier.orderItemId),
  );
  const payments = source.payments.filter((payment) => payment.tableSessionId === session.id);
  const paymentIds = new Set(payments.map((payment) => payment.id));
  const allocations = source.allocations.filter((allocation) =>
    paymentIds.has(allocation.paymentId),
  );
  const participantIds = unique([
    session.openedBy,
    ...checks.map((check) => check.openedBy),
    ...items.flatMap((item) => [item.createdBy, item.updatedBy]),
    ...payments.map((payment) => payment.createdBy),
  ]);
  const waiterNames = participantIds.map(
    (userId, index) => source.waiterNames?.[userId] ?? `${source.unknownWaiterName} ${index + 1}`,
  );
  const financial = calculateTableFinancials(checks, items, modifiers, payments, allocations);
  const relatedSyncStatuses = [
    table.syncStatus,
    session.syncStatus,
    ...checks.map((check) => check.syncStatus),
    ...items.map((item) => item.syncStatus),
    ...payments.map((payment) => payment.syncStatus),
  ];
  const syncStatus = highestSyncStatus(relatedSyncStatuses);
  const hasDuplicateActiveSession = tableSessions.length > 1;
  const financialIssue = financial === null;
  const state =
    syncStatus === 'conflict'
      ? 'conflict'
      : syncStatus === 'rejected' || hasDuplicateActiveSession || financialIssue
        ? 'sync_issue'
        : session.status === 'payment_pending' ||
            checks.some((check) => check.status === 'partially_paid')
          ? 'payment_pending'
          : 'open';
  const openedAtMs = Date.parse(session.openedAt);
  const durationMinutes = Number.isFinite(openedAtMs)
    ? Math.max(0, Math.floor((now.getTime() - openedAtMs) / 60_000))
    : undefined;
  const totals = financial ?? {
    totalMinor: 0,
    paidMinor: 0,
    remainingMinor: 0,
  };

  return {
    id: table.id,
    hallId: table.hallId,
    hallName: hall?.name ?? source.fallbackHallName,
    label: table.label,
    sequenceNumber: table.sequenceNumber,
    ...(table.capacity === undefined ? {} : { capacity: table.capacity }),
    state,
    syncStatus,
    pendingMutationCount: relatedSyncStatuses.filter((status) => status === 'pending').length,
    openedAt: session.openedAt,
    ...(durationMinutes === undefined ? {} : { durationMinutes }),
    ...totals,
    currencyCode: items[0]?.currencyCode ?? source.fallbackCurrencyCode,
    checkCount: checks.length,
    checkNames: checks.map((check) => check.name),
    waiterNames,
    waiterInitials: waiterNames.map(initials),
    isMine: source.currentUserId !== undefined && participantIds.includes(source.currentUserId),
    needsAttention: state === 'payment_pending' || state === 'sync_issue' || state === 'conflict',
  };
}

function calculateTableFinancials(
  checks: readonly Check[],
  items: readonly OrderItem[],
  modifiers: readonly OrderItemModifier[],
  payments: readonly Payment[],
  allocations: readonly PaymentAllocation[],
): {
  readonly totalMinor: number;
  readonly paidMinor: number;
  readonly remainingMinor: number;
} | null {
  try {
    return checks.reduce(
      (totals, check) => {
        const balance = calculateCheckBalance(check, items, modifiers, payments, allocations);
        return {
          totalMinor: totals.totalMinor + balance.totalMinor,
          paidMinor: totals.paidMinor + balance.paidMinor,
          remainingMinor: totals.remainingMinor + balance.remainingMinor,
        };
      },
      { totalMinor: 0, paidMinor: 0, remainingMinor: 0 },
    );
  } catch {
    return null;
  }
}

async function loadAll<Name extends RepositoryName>(
  database: LocalDatabase,
  repositoryName: Name,
  scope: Required<RepositoryScope>,
): Promise<readonly DomainEntityMap[Name][]> {
  const repository = database.repository(repositoryName);
  const items: DomainEntityMap[Name][] = [];
  let after: string | undefined;
  let pages = 0;

  do {
    const page = await repository.list(scope, { after, limit: 250 });
    items.push(...page.items);
    after = page.nextCursor;
    pages += 1;
    if (pages > 1_000) {
      throw new Error(`Local ${repositoryName} pagination limit reached`);
    }
  } while (after);

  return items;
}

function highestSyncStatus(
  statuses: readonly ('synced' | 'pending' | 'conflict' | 'rejected')[],
): Exclude<ShiftBoardEntitySync, 'local'> {
  if (statuses.includes('conflict')) return 'conflict';
  if (statuses.includes('rejected')) return 'rejected';
  if (statuses.includes('pending')) return 'pending';
  return 'synced';
}

function mapSyncStatus(
  status: 'synced' | 'pending' | 'conflict' | 'rejected',
): Exclude<ShiftBoardEntitySync, 'local'> {
  return status;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase() ?? '')
    .join('');
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function compareHall(left: ShiftBoardHall, right: ShiftBoardHall): number {
  return left.sortOrder - right.sortOrder || left.name.localeCompare(right.name);
}
