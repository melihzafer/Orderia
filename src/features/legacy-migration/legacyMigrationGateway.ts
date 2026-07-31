import { SupabaseClient } from '@supabase/supabase-js';
import { BranchId, DeviceId, OrganizationId } from '../../domain';
import { Database, Json } from '../../services/supabase';
import {
  LegacyMigrationIssue,
  LegacyMigrationReport,
  LegacyMigrationSnapshot,
} from './legacyMigration';

export interface LegacyMigrationScope {
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
}

export interface LegacyMigrationServerResult {
  readonly runId: string;
  readonly status: 'dry_run' | 'applying' | 'completed' | 'failed';
  readonly snapshotHash: string;
  readonly report: LegacyMigrationReport;
  readonly idempotentReplay?: boolean;
}

export class LegacyMigrationGateway {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async inspect(
    scope: LegacyMigrationScope,
    snapshot: LegacyMigrationSnapshot,
  ): Promise<LegacyMigrationServerResult> {
    const { data, error } = await this.client.rpc('inspect_legacy_migration', {
      requested_organization_id: scope.organizationId,
      requested_branch_id: scope.branchId,
      requested_snapshot: toJson(snapshot),
    });
    if (error) throw new Error(error.message);
    return parseServerResult(data);
  }

  async apply(
    scope: LegacyMigrationScope,
    deviceId: DeviceId,
    snapshot: LegacyMigrationSnapshot,
  ): Promise<LegacyMigrationServerResult> {
    const { data, error } = await this.client.rpc('apply_legacy_migration', {
      requested_organization_id: scope.organizationId,
      requested_branch_id: scope.branchId,
      requested_device_id: deviceId,
      requested_snapshot: toJson(snapshot),
    });
    if (error) throw new Error(error.message);
    return parseServerResult(data);
  }
}

function parseServerResult(value: Json): LegacyMigrationServerResult {
  const root = asRecord(value, 'Migration response is invalid');
  const report = asRecord(root.report, 'Migration report is invalid');
  const counts = asRecord(report.counts, 'Migration counts are invalid');
  const status = root.status;
  if (
    status !== 'dry_run' &&
    status !== 'applying' &&
    status !== 'completed' &&
    status !== 'failed'
  ) {
    throw new Error('Migration status is invalid');
  }
  const issues = Array.isArray(report.issues)
    ? report.issues.map((issue) => {
        const row = asRecord(issue, 'Migration issue is invalid');
        return {
          code: requiredString(row.code),
          severity: row.severity === 'warning' ? 'warning' : 'error',
          path: requiredString(row.path),
          message: requiredString(row.message),
        } satisfies LegacyMigrationIssue;
      })
    : [];

  return {
    runId: requiredString(root.runId),
    status,
    snapshotHash: requiredString(root.snapshotHash),
    report: {
      snapshotHash: requiredString(root.snapshotHash),
      counts: {
        halls: requiredNumber(counts.halls),
        tables: requiredNumber(counts.tables),
        categories: requiredNumber(counts.categories),
        menuItems: requiredNumber(counts.menuItems),
        openTickets: requiredNumber(counts.openTickets),
        closedTickets: requiredNumber(counts.closedTickets),
        orderItems: requiredNumber(counts.orderItems),
      },
      sourceClosedGrossMinor: requiredNumber(report.sourceClosedGrossMinor),
      computedClosedGrossMinor: requiredNumber(report.computedClosedGrossMinor),
      openOrderGrossMinor: requiredNumber(report.openOrderGrossMinor),
      issues,
      blockingIssueCount: requiredNumber(report.blockingIssueCount),
      warningCount: requiredNumber(report.warningCount),
      reconciled: report.reconciled === true,
    },
    idempotentReplay: root.idempotentReplay === true,
  };
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function asRecord(value: Json | undefined, message: string): Record<string, Json | undefined> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(message);
  return value;
}

function requiredString(value: Json | undefined): string {
  if (typeof value !== 'string' || !value) throw new Error('Migration response string is missing');
  return value;
}

function requiredNumber(value: Json | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('Migration response number is missing');
  }
  return value;
}
