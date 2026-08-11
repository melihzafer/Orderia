import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

export interface LegacyHall {
  readonly id: string;
  readonly name: string;
  readonly createdAt: number;
  readonly nextTableSequence: number;
}

export interface LegacyTable {
  readonly id: string;
  readonly hallId: string;
  readonly seq: number;
  readonly label?: string;
  readonly isOpen: boolean;
  readonly activeTicketIds: readonly string[];
}

export interface LegacyCategory {
  readonly id: string;
  readonly name: string;
  readonly order: number;
}

export interface LegacyMenuItem {
  readonly id: string;
  readonly categoryId: string;
  readonly name: string;
  readonly price: number;
  readonly description?: string;
  readonly isActive: boolean;
  readonly prepTime?: number;
}

export interface LegacyTicketLine {
  readonly id: string;
  readonly menuItemId: string;
  readonly nameSnapshot: string;
  readonly priceSnapshot: number;
  readonly quantity: number;
  readonly note?: string;
  readonly createdByName?: string;
  readonly cancellationReason?: string;
  readonly status: 'pending' | 'delivered' | 'paid' | 'cancelled';
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface LegacyTicket {
  readonly id: string;
  readonly tableId: string;
  readonly name?: string;
  readonly status: 'open' | 'paid';
  readonly createdAt: number;
  readonly closedAt?: number;
  readonly lines: readonly LegacyTicketLine[];
  readonly paymentInfo?: {
    readonly total: number;
    readonly amountReceived?: number;
    readonly change?: number;
    readonly paymentMethod?: 'cash' | 'card';
  };
}

export interface LegacyHistoryDay {
  readonly businessDate: string;
  readonly reportedGrossMinor: number;
  readonly tickets: readonly LegacyTicket[];
}

export interface LegacyMigrationSnapshot {
  readonly schemaVersion: 1;
  readonly sourceVersion: string;
  readonly halls: readonly LegacyHall[];
  readonly tables: readonly LegacyTable[];
  readonly categories: readonly LegacyCategory[];
  readonly menuItems: readonly LegacyMenuItem[];
  readonly openTickets: readonly LegacyTicket[];
  readonly historyDays: readonly LegacyHistoryDay[];
}

export type LegacyMigrationIssueSeverity = 'error' | 'warning';

export interface LegacyMigrationIssue {
  readonly code: string;
  readonly severity: LegacyMigrationIssueSeverity;
  readonly path: string;
  readonly message: string;
}

export interface LegacyMigrationCounts {
  readonly halls: number;
  readonly tables: number;
  readonly categories: number;
  readonly menuItems: number;
  readonly openTickets: number;
  readonly closedTickets: number;
  readonly orderItems: number;
}

export interface LegacyMigrationReport {
  readonly snapshotHash: string;
  readonly counts: LegacyMigrationCounts;
  readonly sourceClosedGrossMinor: number;
  readonly computedClosedGrossMinor: number;
  readonly openOrderGrossMinor: number;
  readonly issues: readonly LegacyMigrationIssue[];
  readonly blockingIssueCount: number;
  readonly warningCount: number;
  readonly reconciled: boolean;
}

export interface PreparedLegacyMigration {
  readonly snapshot: LegacyMigrationSnapshot;
  readonly report: LegacyMigrationReport;
}

export class LegacySnapshotFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LegacySnapshotFormatError';
  }
}

export function prepareLegacyMigration(raw: unknown): PreparedLegacyMigration {
  const root = requiredRecord(raw, 'Backup must be a JSON object');
  const sourceVersion = requiredString(
    typeof root.version === 'number' ? String(root.version) : root.version,
    'Backup version is missing',
  );
  const data = requiredRecord(root.data, 'Backup data section is missing');

  const snapshot: LegacyMigrationSnapshot = {
    schemaVersion: 1,
    sourceVersion,
    halls: requiredArray(data.halls, 'data.halls').map(parseHall),
    tables: requiredArray(data.tables, 'data.tables').map(parseTable),
    categories: requiredArray(data.categories, 'data.categories').map(parseCategory),
    menuItems: requiredArray(data.menuItems, 'data.menuItems').map(parseMenuItem),
    openTickets: objectValues(data.openTickets, 'data.openTickets').map(parseTicket),
    historyDays: parseHistoryDays(data.dailyHistory),
  };

  return {
    snapshot,
    report: inspectLegacyMigration(snapshot),
  };
}

export function inspectLegacyMigration(snapshot: LegacyMigrationSnapshot): LegacyMigrationReport {
  const issues: LegacyMigrationIssue[] = [];
  const hallIds = uniqueIds(snapshot.halls, 'halls', issues);
  const tableIds = uniqueIds(snapshot.tables, 'tables', issues);
  const categoryIds = uniqueIds(snapshot.categories, 'categories', issues);
  const menuItemIds = uniqueIds(snapshot.menuItems, 'menuItems', issues);
  const ticketIds = uniqueIds(
    [...snapshot.openTickets, ...snapshot.historyDays.flatMap((day) => day.tickets)],
    'tickets',
    issues,
  );

  snapshot.tables.forEach((table, index) => {
    if (!hallIds.has(table.hallId)) {
      addIssue(
        issues,
        'orphan_table',
        'error',
        `tables[${index}].hallId`,
        'Table hall is missing.',
      );
    }
  });
  snapshot.menuItems.forEach((item, index) => {
    if (!categoryIds.has(item.categoryId)) {
      addIssue(
        issues,
        'orphan_menu_item',
        'error',
        `menuItems[${index}].categoryId`,
        'Menu item category is missing.',
      );
    }
    if (!Number.isSafeInteger(item.price) || item.price < 0) {
      addIssue(
        issues,
        'invalid_money',
        'error',
        `menuItems[${index}].price`,
        'Menu price must be non-negative integer minor units.',
      );
    }
  });

  const openTicketIds = new Set(snapshot.openTickets.map((ticket) => ticket.id));
  snapshot.tables.forEach((table, index) => {
    for (const ticketId of table.activeTicketIds) {
      if (!openTicketIds.has(ticketId)) {
        addIssue(
          issues,
          'missing_active_ticket',
          'warning',
          `tables[${index}].activeTicketIds`,
          `Active ticket ${ticketId} no longer exists; table state will be rebuilt.`,
        );
      }
    }
  });

  const allTickets = [
    ...snapshot.openTickets.map((ticket, index) => ({
      ticket,
      path: `openTickets[${index}]`,
      closed: false,
    })),
    ...snapshot.historyDays.flatMap((day, dayIndex) =>
      day.tickets.map((ticket, ticketIndex) => ({
        ticket,
        path: `historyDays[${dayIndex}].tickets[${ticketIndex}]`,
        closed: true,
      })),
    ),
  ];
  uniqueIds(
    allTickets.flatMap(({ ticket }) => ticket.lines),
    'ticketLines',
    issues,
  );
  let openOrderGrossMinor = 0;
  let computedClosedGrossMinor = 0;

  for (const { ticket, path, closed } of allTickets) {
    if (!tableIds.has(ticket.tableId)) {
      addIssue(
        issues,
        'orphan_ticket',
        'error',
        `${path}.tableId`,
        'Ticket table is missing. The ticket will not be silently discarded.',
      );
    }
    if (!validTimestamp(ticket.createdAt)) {
      addIssue(issues, 'invalid_timestamp', 'error', `${path}.createdAt`, 'Invalid ticket time.');
    }
    ticket.lines.forEach((line, lineIndex) => {
      const linePath = `${path}.lines[${lineIndex}]`;
      if (!menuItemIds.has(line.menuItemId)) {
        addIssue(
          issues,
          'missing_menu_snapshot',
          'warning',
          `${linePath}.menuItemId`,
          'Catalog item is missing; the saved line name and price will be preserved.',
        );
      }
      if (!Number.isSafeInteger(line.priceSnapshot) || line.priceSnapshot < 0) {
        addIssue(
          issues,
          'invalid_money',
          'error',
          `${linePath}.priceSnapshot`,
          'Line price must be non-negative integer minor units.',
        );
      }
      if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
        addIssue(
          issues,
          'invalid_quantity',
          'error',
          `${linePath}.quantity`,
          'Line quantity must be positive.',
        );
      }
      if (!line.createdByName) {
        addIssue(
          issues,
          'missing_waiter_attribution',
          'warning',
          `${linePath}.createdByName`,
          'Original waiter is unknown; the importing manager will be recorded.',
        );
      }
    });

    const total = calculateLegacyTicketTotal(ticket);
    if (closed) computedClosedGrossMinor += total;
    else openOrderGrossMinor += total;
  }

  const sourceClosedGrossMinor = snapshot.historyDays.reduce(
    (total, day) => total + day.reportedGrossMinor,
    0,
  );
  if (sourceClosedGrossMinor !== computedClosedGrossMinor) {
    addIssue(
      issues,
      'financial_reconciliation_mismatch',
      'error',
      'historyDays',
      `Reported closed gross ${sourceClosedGrossMinor} differs from line total ${computedClosedGrossMinor}.`,
    );
  }

  if (ticketIds.size === 0 && snapshot.tables.some((table) => table.isOpen)) {
    addIssue(
      issues,
      'open_table_without_ticket',
      'warning',
      'tables',
      'A legacy table is open without a ticket; its state will be rebuilt as closed.',
    );
  }

  const stableSnapshot = stableSerialize(snapshot);
  const snapshotHash = bytesToHex(sha256(utf8ToBytes(stableSnapshot)));
  const blockingIssueCount = issues.filter((issue) => issue.severity === 'error').length;

  return {
    snapshotHash,
    counts: {
      halls: snapshot.halls.length,
      tables: snapshot.tables.length,
      categories: snapshot.categories.length,
      menuItems: snapshot.menuItems.length,
      openTickets: snapshot.openTickets.length,
      closedTickets: snapshot.historyDays.reduce((sum, day) => sum + day.tickets.length, 0),
      orderItems: allTickets.reduce((sum, entry) => sum + entry.ticket.lines.length, 0),
    },
    sourceClosedGrossMinor,
    computedClosedGrossMinor,
    openOrderGrossMinor,
    issues,
    blockingIssueCount,
    warningCount: issues.length - blockingIssueCount,
    reconciled: blockingIssueCount === 0 && sourceClosedGrossMinor === computedClosedGrossMinor,
  };
}

export function calculateLegacyTicketTotal(ticket: LegacyTicket): number {
  return ticket.lines.reduce(
    (total, line) => total + (line.status === 'cancelled' ? 0 : line.priceSnapshot * line.quantity),
    0,
  );
}

function parseHall(raw: unknown, index: number): LegacyHall {
  const value = requiredRecord(raw, `data.halls[${index}]`);
  return {
    id: requiredString(value.id, `data.halls[${index}].id`),
    name: requiredString(value.name, `data.halls[${index}].name`),
    createdAt: requiredNumber(value.createdAt, `data.halls[${index}].createdAt`),
    nextTableSequence: requiredNumber(
      value.nextTableSequence,
      `data.halls[${index}].nextTableSequence`,
    ),
  };
}

function parseTable(raw: unknown, index: number): LegacyTable {
  const value = requiredRecord(raw, `data.tables[${index}]`);
  return {
    id: requiredString(value.id, `data.tables[${index}].id`),
    hallId: requiredString(value.hallId, `data.tables[${index}].hallId`),
    seq: requiredNumber(value.seq, `data.tables[${index}].seq`),
    label: optionalString(value.label),
    isOpen: Boolean(value.isOpen),
    activeTicketIds: requiredArray(
      value.activeTicketIds ?? [],
      `data.tables[${index}].activeTicketIds`,
    ).map((entry, ticketIndex) =>
      requiredString(entry, `data.tables[${index}].activeTicketIds[${ticketIndex}]`),
    ),
  };
}

function parseCategory(raw: unknown, index: number): LegacyCategory {
  const value = requiredRecord(raw, `data.categories[${index}]`);
  return {
    id: requiredString(value.id, `data.categories[${index}].id`),
    name: requiredString(value.name, `data.categories[${index}].name`),
    order: requiredNumber(value.order, `data.categories[${index}].order`),
  };
}

function parseMenuItem(raw: unknown, index: number): LegacyMenuItem {
  const value = requiredRecord(raw, `data.menuItems[${index}]`);
  return {
    id: requiredString(value.id, `data.menuItems[${index}].id`),
    categoryId: requiredString(value.categoryId, `data.menuItems[${index}].categoryId`),
    name: requiredString(value.name, `data.menuItems[${index}].name`),
    price: requiredNumber(value.price, `data.menuItems[${index}].price`),
    description: optionalString(value.description),
    isActive: value.isActive !== false,
    prepTime:
      value.prepTime === undefined
        ? undefined
        : requiredNumber(value.prepTime, `data.menuItems[${index}].prepTime`),
  };
}

function parseTicket(raw: unknown, index: number): LegacyTicket {
  const value = requiredRecord(raw, `ticket[${index}]`);
  const status = value.status === 'paid' ? 'paid' : value.status === 'open' ? 'open' : undefined;
  if (!status) throw new LegacySnapshotFormatError(`ticket[${index}].status is invalid`);
  return {
    id: requiredString(value.id, `ticket[${index}].id`),
    tableId: requiredString(value.tableId, `ticket[${index}].tableId`),
    name: optionalString(value.name),
    status,
    createdAt: requiredNumber(value.createdAt, `ticket[${index}].createdAt`),
    closedAt:
      value.closedAt === undefined
        ? undefined
        : requiredNumber(value.closedAt, `ticket[${index}].closedAt`),
    lines: requiredArray(value.lines, `ticket[${index}].lines`).map(parseTicketLine),
    paymentInfo: parsePaymentInfo(value.paymentInfo),
  };
}

function parseTicketLine(raw: unknown, index: number): LegacyTicketLine {
  const value = requiredRecord(raw, `line[${index}]`);
  const statuses: readonly LegacyTicketLine['status'][] = [
    'pending',
    'delivered',
    'paid',
    'cancelled',
  ];
  if (!statuses.includes(value.status as LegacyTicketLine['status'])) {
    throw new LegacySnapshotFormatError(`line[${index}].status is invalid`);
  }
  return {
    id: requiredString(value.id, `line[${index}].id`),
    menuItemId: requiredString(value.menuItemId, `line[${index}].menuItemId`),
    nameSnapshot: requiredString(value.nameSnapshot, `line[${index}].nameSnapshot`),
    priceSnapshot: requiredNumber(value.priceSnapshot, `line[${index}].priceSnapshot`),
    quantity: requiredNumber(value.quantity, `line[${index}].quantity`),
    note: optionalString(value.note),
    createdByName: optionalString(value.createdByName),
    cancellationReason: optionalString(value.cancellationReason),
    status: value.status as LegacyTicketLine['status'],
    createdAt: requiredNumber(value.createdAt, `line[${index}].createdAt`),
    updatedAt: requiredNumber(value.updatedAt, `line[${index}].updatedAt`),
  };
}

function parsePaymentInfo(raw: unknown): LegacyTicket['paymentInfo'] {
  if (raw === undefined || raw === null) return undefined;
  const value = requiredRecord(raw, 'paymentInfo');
  return {
    total: requiredNumber(value.total, 'paymentInfo.total'),
    amountReceived:
      value.amountReceived === undefined
        ? undefined
        : requiredNumber(value.amountReceived, 'paymentInfo.amountReceived'),
    change:
      value.change === undefined ? undefined : requiredNumber(value.change, 'paymentInfo.change'),
    paymentMethod:
      value.paymentMethod === 'cash' || value.paymentMethod === 'card'
        ? value.paymentMethod
        : undefined,
  };
}

function parseHistoryDays(raw: unknown): readonly LegacyHistoryDay[] {
  const history = requiredRecord(raw, 'data.dailyHistory');
  return Object.entries(history)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([businessDate, entry], dayIndex) => {
      const day = requiredRecord(entry, `data.dailyHistory.${businessDate}`);
      const totals = requiredRecord(day.totals, `data.dailyHistory.${businessDate}.totals`);
      return {
        businessDate,
        reportedGrossMinor: requiredNumber(
          totals.gross,
          `data.dailyHistory.${businessDate}.totals.gross`,
        ),
        tickets: requiredArray(day.tickets, `data.dailyHistory.${businessDate}.tickets`).map(
          (ticket, ticketIndex) => parseTicket(ticket, dayIndex * 10_000 + ticketIndex),
        ),
      };
    });
}

function uniqueIds(
  values: readonly { readonly id: string }[],
  collection: string,
  issues: LegacyMigrationIssue[],
): ReadonlySet<string> {
  const ids = new Set<string>();
  values.forEach((value, index) => {
    if (ids.has(value.id)) {
      addIssue(
        issues,
        'duplicate_legacy_id',
        'error',
        `${collection}[${index}].id`,
        `Duplicate legacy ID ${value.id}.`,
      );
    }
    ids.add(value.id);
  });
  return ids;
}

function addIssue(
  issues: LegacyMigrationIssue[],
  code: string,
  severity: LegacyMigrationIssueSeverity,
  path: string,
  message: string,
): void {
  issues.push({ code, severity, path, message });
}

function requiredRecord(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new LegacySnapshotFormatError(message);
  }
  return value as Record<string, unknown>;
}

function requiredArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new LegacySnapshotFormatError(`${path} must be an array`);
  return value;
}

function objectValues(value: unknown, path: string): unknown[] {
  if (Array.isArray(value)) return value;
  return Object.values(requiredRecord(value, `${path} must be an object`));
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new LegacySnapshotFormatError(`${path} must be a non-empty string`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function requiredNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new LegacySnapshotFormatError(`${path} must be a finite number`);
  }
  return value;
}

function validTimestamp(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0 && value <= 8_640_000_000_000_000;
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
