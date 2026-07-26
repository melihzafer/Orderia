import {
  LocalDatabase,
  OutboxMutation,
  OutboxTransitionPatch,
  RepositoryScope,
  SyncConflict,
} from '../contracts';
import { SyncConflictId, toDomainId } from '../../domain';
import { MutationPushGateway } from './mutationPushGateway';
import {
  RetryPolicy,
  classifyMutationError,
  defaultRetryPolicy,
  mutationErrorDetails,
  retryDelayMs,
} from './retryPolicy';

export interface OutboxPushWorkerOptions {
  readonly batchSize?: number;
  readonly retryPolicy?: RetryPolicy;
  readonly processingTimeoutMs?: number;
  readonly now?: () => Date;
  readonly random?: () => number;
}

export interface OutboxPushCycleResult {
  readonly claimed: number;
  readonly applied: number;
  readonly retrying: number;
  readonly conflicted: number;
  readonly rejected: number;
  readonly skippedBecauseRunning: boolean;
}

export class OutboxPushWorker {
  private running = false;

  private readonly batchSize: number;
  private readonly retryPolicy: RetryPolicy;
  private readonly processingTimeoutMs: number;
  private readonly now: () => Date;
  private readonly random: () => number;

  constructor(
    private readonly database: LocalDatabase,
    private readonly gateway: MutationPushGateway,
    options: OutboxPushWorkerOptions = {},
  ) {
    this.batchSize = options.batchSize ?? 20;
    this.retryPolicy = options.retryPolicy ?? defaultRetryPolicy;
    this.processingTimeoutMs = options.processingTimeoutMs ?? 120_000;
    this.now = options.now ?? (() => new Date());
    this.random = options.random ?? Math.random;

    if (!Number.isSafeInteger(this.batchSize) || this.batchSize <= 0) {
      throw new Error('Outbox push batch size must be a positive safe integer');
    }
    if (!Number.isSafeInteger(this.processingTimeoutMs) || this.processingTimeoutMs <= 0) {
      throw new Error('Outbox processing timeout must be a positive safe integer');
    }
  }

  async runOnce(scope: RepositoryScope): Promise<OutboxPushCycleResult> {
    if (this.running) {
      return emptyCycle(true);
    }

    this.running = true;
    try {
      const claimedAt = this.now().toISOString();
      const staleBefore = new Date(
        new Date(claimedAt).getTime() - this.processingTimeoutMs,
      ).toISOString();
      const claimed = await this.database.transaction(async (transaction) => {
        const processing = await transaction.outbox.list(scope, ['processing']);
        for (const mutation of processing) {
          if (mutation.lastAttemptAt === undefined || mutation.lastAttemptAt <= staleBefore) {
            await transaction.outbox.transition(mutation.id, 'processing', 'retry_wait', {
              nextAttemptAt: claimedAt,
              errorCode: 'INTERRUPTED_PUSH_RECOVERED',
              errorMessage: 'Recovered an interrupted mutation push',
            });
          }
        }

        return transaction.outbox.claimNext(scope, this.batchSize, claimedAt);
      });
      const result = emptyCycle(false);

      for (const mutation of claimed) {
        const outcome = await this.pushOne(mutation);
        result[outcome] += 1;
      }

      result.claimed = claimed.length;
      return result;
    } finally {
      this.running = false;
    }
  }

  private async pushOne(
    mutation: OutboxMutation,
  ): Promise<'applied' | 'retrying' | 'conflicted' | 'rejected'> {
    try {
      await this.gateway.push(mutation);
      await this.transition(mutation, 'applied', {
        appliedAt: this.now().toISOString(),
        nextAttemptAt: undefined,
        errorCode: undefined,
        errorMessage: undefined,
      });
      return 'applied';
    } catch (error) {
      const details = mutationErrorDetails(error);
      const disposition = classifyMutationError(error);
      const patch = {
        errorCode: details.code,
        errorMessage: details.message,
      };

      if (disposition === 'retryable' && mutation.attemptCount < this.retryPolicy.maximumAttempts) {
        const delay = retryDelayMs(
          mutation.attemptCount,
          this.retryPolicy,
          this.random,
          details.retryAfterMs,
        );
        const nextAttemptAt = new Date(this.now().getTime() + delay).toISOString();
        await this.transition(mutation, 'retry_wait', {
          ...patch,
          nextAttemptAt,
        });
        return 'retrying';
      }

      if (disposition === 'conflict') {
        await this.recordConflict(mutation, details, patch);
        return 'conflicted';
      }

      await this.transition(mutation, 'rejected', {
        ...patch,
        errorCode: disposition === 'retryable' ? 'RETRY_ATTEMPTS_EXHAUSTED' : details.code,
      });
      return 'rejected';
    }
  }

  private async recordConflict(
    mutation: OutboxMutation,
    details: ReturnType<typeof mutationErrorDetails>,
    patch: OutboxTransitionPatch,
  ): Promise<void> {
    const conflict: SyncConflict = {
      id: toDomainId<SyncConflictId>(`conflict-${mutation.id}`),
      organizationId: mutation.organizationId,
      branchId: mutation.branchId,
      mutationId: mutation.id,
      repository: mutation.repository,
      entityId: mutation.entityId,
      ...(mutation.baseVersion === undefined ? {} : { baseVersion: mutation.baseVersion }),
      serverVersion: Math.max(1, details.serverVersion ?? mutation.baseVersion ?? 1),
      localPayload: mutation.payload,
      serverPayload: details.serverPayload ?? {},
      status: 'unresolved',
      detectedAt: this.now().toISOString(),
    };

    await this.database.transaction(async (transaction) => {
      await transaction.outbox.transition(mutation.id, 'processing', 'conflict', patch);
      await transaction.syncState.addConflict(conflict);
    });
  }

  private async transition(
    mutation: OutboxMutation,
    nextStatus: 'applied' | 'retry_wait' | 'conflict' | 'rejected',
    patch: OutboxTransitionPatch,
  ): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await transaction.outbox.transition(mutation.id, 'processing', nextStatus, patch);
    });
  }
}

function emptyCycle(skippedBecauseRunning: boolean): {
  claimed: number;
  applied: number;
  retrying: number;
  conflicted: number;
  rejected: number;
  skippedBecauseRunning: boolean;
} {
  return {
    claimed: 0,
    applied: 0,
    retrying: 0,
    conflicted: 0,
    rejected: 0,
    skippedBecauseRunning,
  };
}
