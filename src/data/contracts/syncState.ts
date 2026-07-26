import { BranchId, MutationId, OrganizationId, SyncConflictId } from '../../domain/ids';
import { IsoTimestamp, JsonValue } from '../../domain/entities';
import { RepositoryName, RepositoryScope } from './repository';

export interface SyncCursor {
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly value: string;
  readonly updatedAt: IsoTimestamp;
}

export type SyncConflictStatus =
  'unresolved' | 'resolved_local' | 'resolved_server' | 'resolved_manual';

export interface SyncConflict {
  readonly id: SyncConflictId;
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly mutationId: MutationId;
  readonly repository: RepositoryName;
  readonly entityId: string;
  readonly baseVersion?: number;
  readonly serverVersion: number;
  readonly localPayload: JsonValue;
  readonly serverPayload: JsonValue;
  readonly status: SyncConflictStatus;
  readonly detectedAt: IsoTimestamp;
  readonly resolvedAt?: IsoTimestamp;
  readonly resolutionPayload?: JsonValue;
}

export interface SyncStateRepository {
  getCursor(scope: RepositoryScope): Promise<SyncCursor | null>;
  setCursor(cursor: SyncCursor): Promise<SyncCursor>;
  addConflict(conflict: SyncConflict): Promise<SyncConflict>;
  getConflict(id: SyncConflictId): Promise<SyncConflict | null>;
  listConflicts(
    scope: RepositoryScope,
    statuses?: readonly SyncConflictStatus[],
  ): Promise<readonly SyncConflict[]>;
  resolveConflict(
    id: SyncConflictId,
    status: Exclude<SyncConflictStatus, 'unresolved'>,
    resolvedAt: IsoTimestamp,
    resolutionPayload?: JsonValue,
  ): Promise<SyncConflict>;
}
