import {
  DomainEntityMap,
  LocalDatabase,
  LocalTransaction,
  OptimisticConcurrencyError,
  OutboxMutation,
  OutboxRepository,
  OutboxStatus,
  OutboxTransitionPatch,
  PutOptions,
  ReadRepository,
  RepositoryName,
  RepositoryPage,
  RepositoryQuery,
  RepositoryScope,
  SyncConflict,
  SyncConflictStatus,
  SyncCursor,
  SyncStateRepository,
  TombstoneOptions,
  TransactionRepository,
  assertOutboxTransition,
} from '../contracts';
import { MutationId, SyncConflictId } from '../../domain/ids';
import { JsonValue } from '../../domain/entities';

interface StoredRecord<Entity> {
  readonly scope: RepositoryScope;
  readonly entity: Entity;
  readonly version: number;
  readonly deletedAt?: string;
}

type AnyDomainEntity = DomainEntityMap[RepositoryName];
type RepositoryState = Record<RepositoryName, Map<string, StoredRecord<AnyDomainEntity>>>;

interface MemoryState {
  readonly repositories: RepositoryState;
  readonly outbox: Map<string, OutboxMutation>;
  readonly idempotencyIndex: Map<string, string>;
  readonly cursors: Map<string, SyncCursor>;
  readonly conflicts: Map<string, SyncConflict>;
}

const repositoryNames: readonly RepositoryName[] = [
  'organizations',
  'branches',
  'memberships',
  'devices',
  'halls',
  'restaurantTables',
  'menuCategories',
  'menuItems',
  'modifierGroups',
  'modifierOptions',
  'cancellationReasons',
  'tableSessions',
  'checks',
  'orderBatches',
  'orderItems',
  'orderItemModifiers',
  'payments',
  'paymentAllocations',
  'receipts',
  'auditEvents',
];

export class InMemoryLocalDatabase implements LocalDatabase {
  readonly engine = 'memory' as const;

  private state = createEmptyState();
  private transactionTail: Promise<void> = Promise.resolve();
  private closed = false;

  get outbox(): Pick<OutboxRepository, 'getById' | 'list'> {
    this.assertOpen();
    return new InMemoryOutboxRepository(() => {
      this.assertOpen();
      return this.state;
    });
  }

  get syncState(): Pick<SyncStateRepository, 'getCursor' | 'getConflict' | 'listConflicts'> {
    this.assertOpen();
    return new InMemorySyncStateRepository(() => {
      this.assertOpen();
      return this.state;
    });
  }

  repository<Name extends RepositoryName>(name: Name): ReadRepository<DomainEntityMap[Name]> {
    this.assertOpen();
    return new InMemoryRepository(name, () => {
      this.assertOpen();
      return this.state;
    });
  }

  async transaction<Result>(
    work: (transaction: LocalTransaction) => Promise<Result>,
  ): Promise<Result> {
    this.assertOpen();

    const previousTransaction = this.transactionTail;
    let releaseTransaction!: () => void;
    this.transactionTail = new Promise<void>((resolve) => {
      releaseTransaction = resolve;
    });

    await previousTransaction;
    let transactionActive = true;

    try {
      this.assertOpen();
      const workingState = cloneState(this.state);
      const getWorkingState = () => {
        if (!transactionActive) {
          throw new Error('Local transaction is no longer active');
        }

        return workingState;
      };
      const transaction = createTransaction(getWorkingState);
      const result = await work(transaction);
      transactionActive = false;
      this.state = workingState;
      return result;
    } finally {
      transactionActive = false;
      releaseTransaction();
    }
  }

  async close(): Promise<void> {
    await this.transactionTail;
    this.closed = true;
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new Error('Local database is closed');
    }
  }
}

class InMemoryRepository<Name extends RepositoryName> implements TransactionRepository<
  DomainEntityMap[Name]
> {
  constructor(
    private readonly name: Name,
    private readonly getState: () => MemoryState,
  ) {}

  async getById(
    scope: RepositoryScope,
    id: DomainEntityMap[Name]['id'],
  ): Promise<DomainEntityMap[Name] | null> {
    const record = this.findRecord(scope, id);
    return record && !record.deletedAt ? cloneValue(record.entity) : null;
  }

  async list(
    scope: RepositoryScope,
    query: RepositoryQuery = {},
  ): Promise<RepositoryPage<DomainEntityMap[Name]>> {
    const limit = query.limit ?? 100;
    if (!Number.isSafeInteger(limit) || limit <= 0) {
      throw new Error('Repository query limit must be a positive safe integer');
    }

    const offset = query.after ? Number(query.after) : 0;
    if (!Number.isSafeInteger(offset) || offset < 0) {
      throw new Error('Repository cursor is invalid');
    }

    const matchingRecords = Array.from(this.getRepository().values())
      .filter(
        (record) =>
          matchesScope(record.scope, scope) &&
          (query.includeDeleted === true || record.deletedAt === undefined),
      )
      .sort((left, right) => left.entity.id.localeCompare(right.entity.id));
    const page = matchingRecords.slice(offset, offset + limit);
    const nextOffset = offset + page.length;

    return {
      items: page.map((record) => cloneValue(record.entity)) as readonly DomainEntityMap[Name][],
      nextCursor: nextOffset < matchingRecords.length ? String(nextOffset) : undefined,
    };
  }

  async put(
    scope: RepositoryScope,
    entity: DomainEntityMap[Name],
    options: PutOptions = {},
  ): Promise<DomainEntityMap[Name]> {
    assertEntityMatchesScope(entity, scope);
    if (this.name === 'organizations' && entity.id !== scope.organizationId) {
      throw new Error('Organization entity ID does not match repository scope');
    }

    const existing = this.findRecord(scope, entity.id);
    const actualVersion = existing?.version ?? null;
    assertExpectedVersion(this.name, entity.id, options.expectedVersion, actualVersion);

    const version = readEntityVersion(entity) ?? (actualVersion ?? 0) + 1;
    const record: StoredRecord<DomainEntityMap[Name]> = {
      scope: cloneValue(scope),
      entity: cloneValue(entity),
      version,
      deletedAt: readDeletedAt(entity),
    };
    this.getRepository().set(recordKey(scope, entity.id), record);
    return cloneValue(entity);
  }

  async tombstone(
    scope: RepositoryScope,
    id: DomainEntityMap[Name]['id'],
    options: TombstoneOptions,
  ): Promise<DomainEntityMap[Name]> {
    const existing = this.findRecord(scope, id);
    if (!existing) {
      throw new Error(`Cannot tombstone missing ${this.name}/${id}`);
    }

    assertExpectedVersion(this.name, id, options.expectedVersion, existing.version);

    const nextVersion = existing.version + 1;
    const entity = {
      ...cloneValue(existing.entity),
      deletedAt: options.deletedAt,
      ...('version' in existing.entity ? { version: nextVersion } : {}),
    } as DomainEntityMap[Name];
    this.getRepository().set(recordKey(scope, id), {
      scope: cloneValue(scope),
      entity,
      version: nextVersion,
      deletedAt: options.deletedAt,
    });
    return cloneValue(entity);
  }

  private getRepository(): Map<string, StoredRecord<DomainEntityMap[Name]>> {
    return this.getState().repositories[this.name] as unknown as Map<
      string,
      StoredRecord<DomainEntityMap[Name]>
    >;
  }

  private findRecord(
    scope: RepositoryScope,
    id: string,
  ): StoredRecord<DomainEntityMap[Name]> | undefined {
    return Array.from(this.getRepository().values()).find(
      (record) => record.entity.id === id && matchesScope(record.scope, scope),
    );
  }
}

class InMemoryOutboxRepository implements OutboxRepository {
  constructor(private readonly getState: () => MemoryState) {}

  async enqueue(mutation: OutboxMutation): Promise<OutboxMutation> {
    if (mutation.status !== 'pending' || mutation.attemptCount !== 0) {
      throw new Error('New outbox mutations must start pending with zero attempts');
    }

    if (!mutation.idempotencyKey.trim()) {
      throw new Error('Outbox mutation requires an idempotency key');
    }

    const key = mutationIdempotencyKey(mutation);
    const existingId = this.getState().idempotencyIndex.get(key);

    if (existingId) {
      const existing = this.getState().outbox.get(existingId)!;
      if (stableSerialize(existing) !== stableSerialize(mutation)) {
        throw new Error('Client mutation ID was reused with different content');
      }

      return cloneValue(existing);
    }

    if (this.getState().outbox.has(mutation.id)) {
      throw new Error(`Outbox mutation ID already exists: ${mutation.id}`);
    }

    this.getState().outbox.set(mutation.id, cloneValue(mutation));
    this.getState().idempotencyIndex.set(key, mutation.id);
    return cloneValue(mutation);
  }

  async getById(id: MutationId): Promise<OutboxMutation | null> {
    const mutation = this.getState().outbox.get(id);
    return mutation ? cloneValue(mutation) : null;
  }

  async list(
    scope: RepositoryScope,
    statuses?: readonly OutboxStatus[],
  ): Promise<readonly OutboxMutation[]> {
    return Array.from(this.getState().outbox.values())
      .filter(
        (mutation) =>
          matchesScope(
            {
              organizationId: mutation.organizationId,
              branchId: mutation.branchId,
            },
            scope,
          ) &&
          (statuses === undefined || statuses.includes(mutation.status)),
      )
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

    return Promise.all(
      candidates.map((mutation) =>
        this.transition(mutation.id, mutation.status, 'processing', {
          lastAttemptAt: now,
        }),
      ),
    );
  }

  async transition(
    id: MutationId,
    expectedStatus: OutboxStatus,
    nextStatus: OutboxStatus,
    patch: OutboxTransitionPatch = {},
  ): Promise<OutboxMutation> {
    const current = this.getState().outbox.get(id);
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
    this.getState().outbox.set(id, cloneValue(next));
    return cloneValue(next);
  }
}

class InMemorySyncStateRepository implements SyncStateRepository {
  constructor(private readonly getState: () => MemoryState) {}

  async getCursor(scope: RepositoryScope): Promise<SyncCursor | null> {
    const cursor = this.getState().cursors.get(scopeKey(scope));
    return cursor ? cloneValue(cursor) : null;
  }

  async setCursor(cursor: SyncCursor): Promise<SyncCursor> {
    const scope = {
      organizationId: cursor.organizationId,
      branchId: cursor.branchId,
    };
    this.getState().cursors.set(scopeKey(scope), cloneValue(cursor));
    return cloneValue(cursor);
  }

  async addConflict(conflict: SyncConflict): Promise<SyncConflict> {
    if (conflict.status !== 'unresolved') {
      throw new Error('New sync conflicts must start unresolved');
    }

    if (this.getState().conflicts.has(conflict.id)) {
      throw new Error(`Sync conflict already exists: ${conflict.id}`);
    }

    this.getState().conflicts.set(conflict.id, cloneValue(conflict));
    return cloneValue(conflict);
  }

  async getConflict(id: SyncConflictId): Promise<SyncConflict | null> {
    const conflict = this.getState().conflicts.get(id);
    return conflict ? cloneValue(conflict) : null;
  }

  async listConflicts(
    scope: RepositoryScope,
    statuses?: readonly SyncConflictStatus[],
  ): Promise<readonly SyncConflict[]> {
    return Array.from(this.getState().conflicts.values())
      .filter(
        (conflict) =>
          matchesScope(
            {
              organizationId: conflict.organizationId,
              branchId: conflict.branchId,
            },
            scope,
          ) &&
          (statuses === undefined || statuses.includes(conflict.status)),
      )
      .sort((left, right) => left.detectedAt.localeCompare(right.detectedAt))
      .map(cloneValue);
  }

  async resolveConflict(
    id: SyncConflictId,
    status: Exclude<SyncConflictStatus, 'unresolved'>,
    resolvedAt: string,
    resolutionPayload?: JsonValue,
  ): Promise<SyncConflict> {
    const current = this.getState().conflicts.get(id);
    if (!current) {
      throw new Error(`Unknown sync conflict ${id}`);
    }

    if (current.status !== 'unresolved') {
      throw new Error(`Sync conflict ${id} is already resolved`);
    }

    const next: SyncConflict = {
      ...current,
      status,
      resolvedAt,
      resolutionPayload,
    };
    this.getState().conflicts.set(id, cloneValue(next));
    return cloneValue(next);
  }
}

function createTransaction(getState: () => MemoryState): LocalTransaction {
  return {
    repository: <Name extends RepositoryName>(name: Name) => new InMemoryRepository(name, getState),
    outbox: new InMemoryOutboxRepository(getState),
    syncState: new InMemorySyncStateRepository(getState),
  };
}

function createEmptyState(): MemoryState {
  const repositories = Object.fromEntries(
    repositoryNames.map((name) => [name, new Map()]),
  ) as unknown as RepositoryState;

  return {
    repositories,
    outbox: new Map(),
    idempotencyIndex: new Map(),
    cursors: new Map(),
    conflicts: new Map(),
  };
}

function cloneState(state: MemoryState): MemoryState {
  const repositories = Object.fromEntries(
    repositoryNames.map((name) => [
      name,
      new Map(
        Array.from(state.repositories[name].entries()).map(([key, record]) => [
          key,
          cloneValue(record),
        ]),
      ),
    ]),
  ) as unknown as RepositoryState;

  return {
    repositories,
    outbox: cloneMap(state.outbox),
    idempotencyIndex: new Map(state.idempotencyIndex),
    cursors: cloneMap(state.cursors),
    conflicts: cloneMap(state.conflicts),
  };
}

function cloneMap<Value>(source: Map<string, Value>): Map<string, Value> {
  return new Map(Array.from(source.entries()).map(([key, value]) => [key, cloneValue(value)]));
}

function cloneValue<Value>(value: Value): Value {
  return JSON.parse(JSON.stringify(value)) as Value;
}

function recordKey(scope: RepositoryScope, id: string): string {
  return `${scopeKey(scope)}::${id}`;
}

function scopeKey(scope: RepositoryScope): string {
  return `${scope.organizationId}::${scope.branchId ?? '*'}`;
}

function matchesScope(stored: RepositoryScope, requested: RepositoryScope): boolean {
  return (
    stored.organizationId === requested.organizationId &&
    (requested.branchId === undefined || stored.branchId === requested.branchId)
  );
}

function assertEntityMatchesScope(entity: object, scope: RepositoryScope): void {
  const organizationId =
    'organizationId' in entity && typeof entity.organizationId === 'string'
      ? entity.organizationId
      : undefined;
  const branchId =
    'branchId' in entity && typeof entity.branchId === 'string' ? entity.branchId : undefined;

  if (organizationId !== undefined && organizationId !== scope.organizationId) {
    throw new Error('Entity organization does not match repository scope');
  }

  if (branchId !== undefined && branchId !== scope.branchId) {
    throw new Error('Entity branch does not match repository scope');
  }
}

function assertExpectedVersion(
  repository: RepositoryName,
  entityId: string,
  expectedVersion: number | null | undefined,
  actualVersion: number | null,
): void {
  if (expectedVersion === undefined) return;

  if (expectedVersion !== actualVersion) {
    throw new OptimisticConcurrencyError(repository, entityId, expectedVersion, actualVersion);
  }
}

function readEntityVersion(entity: object): number | undefined {
  if ('version' in entity && typeof entity.version === 'number') {
    return entity.version;
  }

  return undefined;
}

function readDeletedAt(entity: object): string | undefined {
  if ('deletedAt' in entity && typeof entity.deletedAt === 'string') {
    return entity.deletedAt;
  }

  return undefined;
}

function mutationIdempotencyKey(mutation: OutboxMutation): string {
  return `${mutation.deviceId}::${mutation.clientMutationId}`;
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}
