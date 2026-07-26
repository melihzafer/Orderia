import { OptimisticConcurrencyError, RepositoryName, RepositoryScope } from '../contracts';

export function requestResult<Result>(request: IDBRequest<Result>): Promise<Result> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB request failed'));
    };
  });
}

export function transactionResult(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onabort = () => {
      reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
    };
    transaction.onerror = () => {
      reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    };
  });
}

export function keepTransactionAlive(
  transaction: IDBTransaction,
  metadataStoreName: string,
): () => void {
  let active = true;

  const pump = () => {
    if (!active) return;

    const request = transaction.objectStore(metadataStoreName).get('__transaction_keep_alive__');
    request.onsuccess = () => {
      pump();
    };
    request.onerror = () => {
      active = false;
    };
  };

  pump();
  return () => {
    active = false;
  };
}

export function createStrictReadWriteTransaction(
  database: IDBDatabase,
  storeNames: readonly string[],
): IDBTransaction {
  try {
    return database.transaction([...storeNames], 'readwrite', {
      durability: 'strict',
    });
  } catch {
    return database.transaction([...storeNames], 'readwrite');
  }
}

export function scopeRange(
  scope: RepositoryScope,
  suffix: readonly IDBValidKey[] = [],
): IDBKeyRange {
  const prefix: IDBValidKey[] = [scope.organizationId];
  if (scope.branchId !== undefined) {
    prefix.push(scope.branchId);
  }
  prefix.push(...suffix);
  return IDBKeyRange.bound(prefix, [...prefix, []]);
}

export function cloneValue<Value>(value: Value): Value {
  return JSON.parse(JSON.stringify(value)) as Value;
}

export function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value) ?? 'undefined';
}

export function assertEntityMatchesScope(
  repository: RepositoryName,
  entity: object & { readonly id: string },
  scope: RepositoryScope,
): void {
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

  if (repository === 'organizations' && entity.id !== scope.organizationId) {
    throw new Error('Organization entity ID does not match repository scope');
  }
}

export function assertExpectedVersion(
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

export function readEntityVersion(entity: object): number | undefined {
  if ('version' in entity && typeof entity.version === 'number') {
    return entity.version;
  }

  return undefined;
}

export function readDeletedAt(entity: object): string | undefined {
  if ('deletedAt' in entity && typeof entity.deletedAt === 'string') {
    return entity.deletedAt;
  }

  return undefined;
}
