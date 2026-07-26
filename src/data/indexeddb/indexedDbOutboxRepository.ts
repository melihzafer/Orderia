import {
  OutboxMutation,
  OutboxRepository,
  OutboxStatus,
  OutboxTransitionPatch,
  RepositoryScope,
  assertOutboxTransition,
} from '../contracts';
import { MutationId } from '../../domain/ids';
import { indexedDbIndexes, indexedDbStores } from './indexedDbSchema';
import { cloneValue, requestResult, scopeRange, stableSerialize } from './indexedDbUtils';

export class IndexedDbOutboxRepository implements OutboxRepository {
  constructor(private readonly getStore: () => IDBObjectStore) {}

  async enqueue(mutation: OutboxMutation): Promise<OutboxMutation> {
    if (mutation.status !== 'pending' || mutation.attemptCount !== 0) {
      throw new Error('New outbox mutations must start pending with zero attempts');
    }

    if (!mutation.idempotencyKey.trim()) {
      throw new Error('Outbox mutation requires an idempotency key');
    }

    const store = this.getStore();
    assertOutboxStore(store);
    const existingClientMutation = await requestResult<OutboxMutation | undefined>(
      store
        .index(indexedDbIndexes.outboxDeviceClientMutation)
        .get([mutation.deviceId, mutation.clientMutationId]),
    );

    if (existingClientMutation) {
      if (stableSerialize(existingClientMutation) !== stableSerialize(mutation)) {
        throw new Error('Client mutation ID was reused with different content');
      }

      return cloneValue(existingClientMutation);
    }

    if (await requestResult<OutboxMutation | undefined>(store.get(mutation.id))) {
      throw new Error(`Outbox mutation ID already exists: ${mutation.id}`);
    }

    await requestResult(store.add(cloneValue(mutation)));
    return cloneValue(mutation);
  }

  async getById(id: MutationId): Promise<OutboxMutation | null> {
    const store = this.getStore();
    assertOutboxStore(store);
    const mutation = await requestResult<OutboxMutation | undefined>(store.get(id));
    return mutation ? cloneValue(mutation) : null;
  }

  async list(
    scope: RepositoryScope,
    statuses?: readonly OutboxStatus[],
  ): Promise<readonly OutboxMutation[]> {
    if (statuses?.length === 0) return [];

    const store = this.getStore();
    assertOutboxStore(store);
    const indexName =
      scope.branchId === undefined
        ? indexedDbIndexes.outboxOrganizationCreated
        : indexedDbIndexes.outboxScopeCreated;
    const mutations = await requestResult<OutboxMutation[]>(
      store.index(indexName).getAll(scopeRange(scope)),
    );
    return mutations
      .filter((mutation) => statuses === undefined || statuses.includes(mutation.status))
      .sort(
        (left, right) =>
          left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
      )
      .map(cloneValue);
  }

  async claimNext(
    scope: RepositoryScope,
    limit: number,
    now: string,
  ): Promise<readonly OutboxMutation[]> {
    if (!Number.isSafeInteger(limit) || limit <= 0) {
      throw new Error('Outbox claim limit must be a positive safe integer');
    }

    const candidates = (await this.list(scope, ['pending', 'retry_wait']))
      .filter(
        (mutation) =>
          mutation.status === 'pending' ||
          mutation.nextAttemptAt === undefined ||
          mutation.nextAttemptAt <= now,
      )
      .slice(0, limit);

    const claimed: OutboxMutation[] = [];
    for (const mutation of candidates) {
      claimed.push(
        await this.transition(mutation.id, mutation.status, 'processing', {
          lastAttemptAt: now,
        }),
      );
    }
    return claimed;
  }

  async transition(
    id: MutationId,
    expectedStatus: OutboxStatus,
    nextStatus: OutboxStatus,
    patch: OutboxTransitionPatch = {},
  ): Promise<OutboxMutation> {
    const current = await this.getById(id);
    if (!current) {
      throw new Error(`Unknown outbox mutation ${id}`);
    }

    if (current.status !== expectedStatus) {
      throw new Error(`Outbox mutation ${id} expected ${expectedStatus}, got ${current.status}`);
    }

    assertOutboxTransition(current.status, nextStatus);

    if (nextStatus === 'applied' && patch.appliedAt === undefined) {
      throw new Error('Applied outbox mutation requires appliedAt');
    }

    if (nextStatus === 'retry_wait' && patch.nextAttemptAt === undefined) {
      throw new Error('Retrying outbox mutation requires nextAttemptAt');
    }

    const next: OutboxMutation = {
      ...current,
      ...patch,
      status: nextStatus,
      attemptCount: nextStatus === 'processing' ? current.attemptCount + 1 : current.attemptCount,
    };
    const store = this.getStore();
    assertOutboxStore(store);
    await requestResult(store.put(cloneValue(next)));
    return cloneValue(next);
  }
}

function assertOutboxStore(store: IDBObjectStore): void {
  if (store.name !== indexedDbStores.outboxMutations) {
    throw new Error(`Expected ${indexedDbStores.outboxMutations} object store`);
  }
}
