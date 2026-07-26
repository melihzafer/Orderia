import { OptimisticConcurrencyError, RepositoryName, RepositoryScope } from '../contracts';
import { JsonValue } from '../../domain/entities';

export function branchKey(scope: RepositoryScope): string {
  return scope.branchId ?? '';
}

export function parseJson<Value>(value: string): Value {
  return JSON.parse(value) as Value;
}

export function serializeJson(value: JsonValue | object): string {
  return JSON.stringify(value);
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
  const entityBranchId =
    'branchId' in entity && typeof entity.branchId === 'string' ? entity.branchId : undefined;

  if (organizationId !== undefined && organizationId !== scope.organizationId) {
    throw new Error('Entity organization does not match repository scope');
  }

  if (entityBranchId !== undefined && entityBranchId !== scope.branchId) {
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
