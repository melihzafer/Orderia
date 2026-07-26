import { BranchId, DeviceId, MutationId, OrganizationId } from '../../domain/ids';
import { IsoTimestamp, JsonValue } from '../../domain/entities';
import { RepositoryName, RepositoryScope } from './repository';

export type MutationOperation = 'create' | 'update' | 'delete' | 'command';
export type OutboxStatus =
  'pending' | 'processing' | 'retry_wait' | 'applied' | 'conflict' | 'rejected';

export interface OutboxMutation {
  readonly id: MutationId;
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly deviceId: DeviceId;
  readonly clientMutationId: MutationId;
  readonly idempotencyKey: string;
  readonly repository: RepositoryName;
  readonly entityId: string;
  readonly operation: MutationOperation;
  readonly payload: JsonValue;
  readonly baseVersion?: number;
  readonly status: OutboxStatus;
  readonly attemptCount: number;
  readonly createdAt: IsoTimestamp;
  readonly lastAttemptAt?: IsoTimestamp;
  readonly nextAttemptAt?: IsoTimestamp;
  readonly appliedAt?: IsoTimestamp;
  readonly errorCode?: string;
  readonly errorMessage?: string;
}

export interface OutboxTransitionPatch {
  readonly lastAttemptAt?: IsoTimestamp;
  readonly nextAttemptAt?: IsoTimestamp;
  readonly appliedAt?: IsoTimestamp;
  readonly errorCode?: string;
  readonly errorMessage?: string;
}

export interface OutboxRepository {
  enqueue(mutation: OutboxMutation): Promise<OutboxMutation>;
  getById(id: MutationId): Promise<OutboxMutation | null>;
  list(
    scope: RepositoryScope,
    statuses?: readonly OutboxStatus[],
  ): Promise<readonly OutboxMutation[]>;
  claimNext(
    scope: RepositoryScope,
    limit: number,
    now: IsoTimestamp,
  ): Promise<readonly OutboxMutation[]>;
  transition(
    id: MutationId,
    expectedStatus: OutboxStatus,
    nextStatus: OutboxStatus,
    patch?: OutboxTransitionPatch,
  ): Promise<OutboxMutation>;
}

const allowedOutboxTransitions: Readonly<Record<OutboxStatus, readonly OutboxStatus[]>> = {
  pending: ['processing'],
  processing: ['applied', 'retry_wait', 'conflict', 'rejected'],
  retry_wait: ['processing'],
  applied: [],
  conflict: [],
  rejected: [],
};

export function assertOutboxTransition(current: OutboxStatus, next: OutboxStatus): void {
  if (current === next) return;

  if (!allowedOutboxTransitions[current].includes(next)) {
    throw new Error(`Invalid outbox transition: ${current} -> ${next}`);
  }
}

export function outboxScope(mutation: OutboxMutation): RepositoryScope {
  return {
    organizationId: mutation.organizationId,
    branchId: mutation.branchId,
  };
}
