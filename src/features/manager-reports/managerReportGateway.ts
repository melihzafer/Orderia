import { SupabaseClient } from '@supabase/supabase-js';
import { BranchId, OrganizationId, UserId } from '../../domain';
import { Database, Json } from '../../services/supabase';

export interface ManagerReportSummary {
  readonly confirmedRevenueMinor: number;
  readonly receiptCount: number;
  readonly confirmedPaymentCount: number;
  readonly servedTableCount: number;
  readonly averageReceiptMinor: number;
  readonly cancelledItemCount: number;
  readonly cancelledValueMinor: number;
  readonly selectedWaiterContributionMinor?: number;
  readonly selectedWaiterPaymentHandledMinor?: number;
  readonly currentOpenTableCount: number;
  readonly currentPaymentPendingCount: number;
  readonly currentOpenBalanceMinor: number;
  readonly activeWaiterCount: number;
}

export interface WaiterPerformanceRow {
  readonly userId: UserId;
  readonly displayName: string;
  readonly itemRows: number;
  readonly itemQuantity: number;
  readonly contributedRevenueMinor: number;
  readonly paymentHandledMinor: number;
  readonly paymentCount: number;
  readonly tablesServed: number;
  readonly cancellationCount: number;
  readonly cancellationValueMinor: number;
  readonly helpedTableCount: number;
  readonly firstActionAt?: string;
  readonly lastActionAt?: string;
  readonly observedActiveMinutes: number;
}

export interface ManagerReportDay {
  readonly businessDate: string;
  readonly confirmedRevenueMinor: number;
  readonly receiptCount: number;
  readonly cancellationCount: number;
  readonly selectedWaiterContributionMinor?: number;
}

export interface ManagerCancellationContext {
  readonly orderItemId: string;
  readonly tableLabel: string;
  readonly itemName: string;
  readonly reasonName: string;
  readonly createdBy: UserId;
  readonly createdByDisplayName: string;
  readonly cancelledBy: UserId;
  readonly cancelledByDisplayName: string;
  readonly cancelledAt: string;
  readonly excludedAmountMinor: number;
}

export interface ManagerReport {
  readonly generatedAt: string;
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly branchName: string;
  readonly currencyCode: string;
  readonly dateFrom: string;
  readonly dateTo: string;
  readonly selectedWaiterId?: UserId;
  readonly summary: ManagerReportSummary;
  readonly waiters: readonly WaiterPerformanceRow[];
  readonly daily: readonly ManagerReportDay[];
  readonly cancellations: readonly ManagerCancellationContext[];
  readonly definitions: Readonly<Record<string, string>>;
}

export class ManagerReportGateway {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async load(input: {
    readonly organizationId: OrganizationId;
    readonly branchId: BranchId;
    readonly dateFrom: string;
    readonly dateTo: string;
    readonly waiterId?: UserId;
  }): Promise<ManagerReport> {
    assertDateRange(input.dateFrom, input.dateTo);
    const { data, error } = await this.client.rpc('get_manager_report', {
      requested_organization_id: input.organizationId,
      requested_branch_id: input.branchId,
      requested_date_from: input.dateFrom,
      requested_date_to: input.dateTo,
      requested_waiter_id: input.waiterId ?? null,
    });
    if (error) throw error;
    if (!isManagerReport(data)) throw new Error('Manager report response is invalid');
    return data as unknown as ManagerReport;
  }
}

function assertDateRange(dateFrom: string, dateTo: string): void {
  if (!isDate(dateFrom) || !isDate(dateTo)) throw new Error('Manager report dates are invalid');
  if (dateFrom > dateTo) throw new Error('Manager report start date must not be after end date');
  const rangeDays =
    (Date.parse(`${dateTo}T00:00:00Z`) - Date.parse(`${dateFrom}T00:00:00Z`)) / 86_400_000;
  if (rangeDays > 366) throw new Error('Manager report range cannot exceed 366 days');
}

function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isManagerReport(value: Json): boolean {
  if (!isRecord(value) || !isRecord(value.summary)) return false;
  return (
    typeof value.generatedAt === 'string' &&
    typeof value.branchName === 'string' &&
    typeof value.currencyCode === 'string' &&
    typeof value.summary.confirmedRevenueMinor === 'number' &&
    typeof value.summary.receiptCount === 'number' &&
    Array.isArray(value.waiters) &&
    value.waiters.every(
      (waiter) =>
        isRecord(waiter) &&
        typeof waiter.userId === 'string' &&
        typeof waiter.displayName === 'string' &&
        typeof waiter.contributedRevenueMinor === 'number',
    ) &&
    Array.isArray(value.daily) &&
    Array.isArray(value.cancellations) &&
    isRecord(value.definitions)
  );
}

function isRecord(value: Json | undefined): value is { [key: string]: Json | undefined } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
