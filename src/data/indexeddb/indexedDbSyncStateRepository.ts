import {
  RepositoryScope,
  SyncConflict,
  SyncConflictStatus,
  SyncCursor,
  SyncStateRepository,
} from '../contracts';
import { JsonValue } from '../../domain/entities';
import { SyncConflictId } from '../../domain/ids';
import { indexedDbIndexes, indexedDbStores } from './indexedDbSchema';
import { cloneValue, requestResult, scopeRange } from './indexedDbUtils';

interface StoredSyncCursor extends SyncCursor {
  readonly key: string;
}

export class IndexedDbSyncStateRepository implements SyncStateRepository {
  constructor(
    private readonly getStore: (
      name: typeof indexedDbStores.syncCursors | typeof indexedDbStores.syncConflicts,
    ) => IDBObjectStore,
  ) {}

  async getCursor(scope: RepositoryScope): Promise<SyncCursor | null> {
    if (scope.branchId === undefined) return null;

    const cursor = await requestResult<StoredSyncCursor | undefined>(
      this.getStore(indexedDbStores.syncCursors).get(
        cursorKey({
          organizationId: scope.organizationId,
          branchId: scope.branchId,
        }),
      ),
    );
    return cursor ? withoutCursorKey(cursor) : null;
  }

  async setCursor(cursor: SyncCursor): Promise<SyncCursor> {
    const stored: StoredSyncCursor = {
      ...cloneValue(cursor),
      key: cursorKey(cursor),
    };
    await requestResult(this.getStore(indexedDbStores.syncCursors).put(stored));
    return cloneValue(cursor);
  }

  async addConflict(conflict: SyncConflict): Promise<SyncConflict> {
    if (conflict.status !== 'unresolved') {
      throw new Error('New sync conflicts must start unresolved');
    }

    if (await this.getConflict(conflict.id)) {
      throw new Error(`Sync conflict already exists: ${conflict.id}`);
    }

    await requestResult(this.getStore(indexedDbStores.syncConflicts).add(cloneValue(conflict)));
    return cloneValue(conflict);
  }

  async getConflict(id: SyncConflictId): Promise<SyncConflict | null> {
    const conflict = await requestResult<SyncConflict | undefined>(
      this.getStore(indexedDbStores.syncConflicts).get(id),
    );
    return conflict ? cloneValue(conflict) : null;
  }

  async listConflicts(
    scope: RepositoryScope,
    statuses?: readonly SyncConflictStatus[],
  ): Promise<readonly SyncConflict[]> {
    if (statuses?.length === 0) return [];

    const store = this.getStore(indexedDbStores.syncConflicts);
    const indexName =
      scope.branchId === undefined
        ? indexedDbIndexes.conflictOrganizationDetected
        : indexedDbIndexes.conflictScopeDetected;
    const conflicts = await requestResult<SyncConflict[]>(
      store.index(indexName).getAll(scopeRange(scope)),
    );
    return conflicts
      .filter((conflict) => statuses === undefined || statuses.includes(conflict.status))
      .sort(
        (left, right) =>
          left.detectedAt.localeCompare(right.detectedAt) || left.id.localeCompare(right.id),
      )
      .map(cloneValue);
  }

  async resolveConflict(
    id: SyncConflictId,
    status: Exclude<SyncConflictStatus, 'unresolved'>,
    resolvedAt: string,
    resolutionPayload?: JsonValue,
  ): Promise<SyncConflict> {
    const current = await this.getConflict(id);
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
    await requestResult(this.getStore(indexedDbStores.syncConflicts).put(cloneValue(next)));
    return cloneValue(next);
  }
}

function cursorKey(scope: Pick<SyncCursor, 'organizationId' | 'branchId'>): string {
  return `${scope.organizationId}::${scope.branchId}`;
}

function withoutCursorKey(cursor: StoredSyncCursor): SyncCursor {
  const { key: _key, ...value } = cursor;
  return cloneValue(value);
}
