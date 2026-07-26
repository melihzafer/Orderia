import { SupabaseClient } from '@supabase/supabase-js';
import { BranchId, OrganizationId, Receipt } from '../../domain';
import { Database, Json, ReceiptArchiveRow } from '../../services/supabase';

export type ReceiptArchivePaymentMethod = 'cash' | 'card' | 'mixed_adjustment';

export interface ReceiptArchiveFilters {
  readonly query?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly timeFrom?: string;
  readonly timeTo?: string;
  readonly waiterQuery?: string;
  readonly paymentMethod?: ReceiptArchivePaymentMethod;
  readonly amountMinMinor?: number;
  readonly amountMaxMinor?: number;
  readonly hasAdjustment?: boolean;
}

export interface ReceiptArchiveCursor {
  readonly issuedAt: string;
  readonly id: string;
}

export interface ReceiptArchiveEntry {
  readonly receipt: Receipt;
  readonly branchName: string;
  readonly branchTimezone: string;
  readonly hasAdjustment: boolean;
}

export interface ReceiptArchivePage {
  readonly items: readonly ReceiptArchiveEntry[];
  readonly nextCursor?: ReceiptArchiveCursor;
}

export class ReceiptArchiveGateway {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async search(input: {
    readonly organizationId: OrganizationId;
    readonly branchId: BranchId;
    readonly filters: ReceiptArchiveFilters;
    readonly cursor?: ReceiptArchiveCursor;
    readonly pageSize?: number;
  }): Promise<ReceiptArchivePage> {
    const pageSize = input.pageSize ?? 30;
    assertFilters(input.filters, pageSize);
    const { data, error } = await this.client.rpc('search_receipts', {
      requested_organization_id: input.organizationId,
      requested_branch_id: input.branchId,
      requested_query: clean(input.filters.query),
      requested_date_from: input.filters.dateFrom ?? null,
      requested_date_to: input.filters.dateTo ?? null,
      requested_time_from: input.filters.timeFrom ?? null,
      requested_time_to: input.filters.timeTo ?? null,
      requested_waiter_query: clean(input.filters.waiterQuery),
      requested_payment_method: input.filters.paymentMethod ?? null,
      requested_amount_min_minor: input.filters.amountMinMinor ?? null,
      requested_amount_max_minor: input.filters.amountMaxMinor ?? null,
      requested_has_adjustment: input.filters.hasAdjustment ?? null,
      requested_after_issued_at: input.cursor?.issuedAt ?? null,
      requested_after_id: input.cursor?.id ?? null,
      requested_page_size: pageSize,
    });
    if (error) throw error;

    const rows = data as ReceiptArchiveRow[];
    const pageRows = rows.slice(0, pageSize);
    const last = pageRows.at(-1);
    return {
      items: pageRows.map(toArchiveEntry),
      ...(rows.length > pageSize && last
        ? { nextCursor: { id: last.id, issuedAt: last.issued_at } }
        : {}),
    };
  }
}

function toArchiveEntry(row: ReceiptArchiveRow): ReceiptArchiveEntry {
  if (!isReceiptSnapshot(row.snapshot_json)) {
    throw new Error(`Receipt ${row.id} has an invalid immutable snapshot`);
  }
  return {
    branchName: row.branch_name,
    branchTimezone: row.branch_timezone,
    hasAdjustment: row.has_adjustment,
    receipt: {
      id: row.id as never,
      organizationId: row.organization_id as never,
      branchId: row.branch_id as never,
      tableSessionId: row.table_session_id as never,
      checkId: row.check_id as never,
      receiptNumber: row.receipt_number,
      businessDate: row.business_date as never,
      issuedAt: row.issued_at,
      issuedBy: row.issued_by as never,
      totalMinor: row.total_minor,
      currencyCode: row.currency_code as never,
      snapshot: row.snapshot_json as never,
      ...(row.pdf_storage_path ? { pdfStoragePath: row.pdf_storage_path } : {}),
      ...(row.pdf_hash ? { pdfHash: row.pdf_hash } : {}),
      status: row.status as Receipt['status'],
      ...(row.adjusts_receipt_id ? { adjustsReceiptId: row.adjusts_receipt_id as never } : {}),
    },
  };
}

function assertFilters(filters: ReceiptArchiveFilters, pageSize: number): void {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new Error('Receipt archive page size must be between 1 and 100');
  }
  for (const value of [filters.query, filters.waiterQuery]) {
    if (value && value.trim().length > 120) {
      throw new Error('Receipt archive search text is too long');
    }
  }
  if (filters.dateFrom && !isDate(filters.dateFrom)) throw new Error('Invalid start date');
  if (filters.dateTo && !isDate(filters.dateTo)) throw new Error('Invalid end date');
  if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
    throw new Error('Receipt archive start date must not be after end date');
  }
  if (filters.timeFrom && !isTime(filters.timeFrom)) throw new Error('Invalid start time');
  if (filters.timeTo && !isTime(filters.timeTo)) throw new Error('Invalid end time');
  if (
    filters.amountMinMinor !== undefined &&
    (!Number.isSafeInteger(filters.amountMinMinor) || filters.amountMinMinor < 0)
  ) {
    throw new Error('Invalid minimum amount');
  }
  if (
    filters.amountMaxMinor !== undefined &&
    (!Number.isSafeInteger(filters.amountMaxMinor) || filters.amountMaxMinor < 0)
  ) {
    throw new Error('Invalid maximum amount');
  }
  if (
    filters.amountMinMinor !== undefined &&
    filters.amountMaxMinor !== undefined &&
    filters.amountMinMinor > filters.amountMaxMinor
  ) {
    throw new Error('Receipt archive minimum amount must not exceed maximum amount');
  }
}

function clean(value: string | undefined): string | null {
  return value?.trim() || null;
}

function isDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function isTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
}

function isReceiptSnapshot(value: Json): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    value.schemaVersion === 1 &&
    Array.isArray(value.checks) &&
    Array.isArray(value.payments) &&
    typeof value.tableLabel === 'string' &&
    typeof value.totalMinor === 'number'
  );
}
