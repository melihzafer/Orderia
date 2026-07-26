import {
  DomainEntityMap,
  PutOptions,
  RepositoryName,
  RepositoryPage,
  RepositoryQuery,
  RepositoryScope,
  TombstoneOptions,
  TransactionRepository,
} from '../contracts';
import { indexedDbIndexes } from './indexedDbSchema';
import {
  assertEntityMatchesScope,
  assertExpectedVersion,
  cloneValue,
  readDeletedAt,
  readEntityVersion,
  requestResult,
  scopeRange,
} from './indexedDbUtils';

interface IndexedDbDomainRecord<Name extends RepositoryName = RepositoryName> {
  readonly key: string;
  readonly collection: Name;
  readonly organizationId: string;
  readonly branchId: string;
  readonly entityId: string;
  readonly version: number;
  readonly deletedAt?: string;
  readonly entity: DomainEntityMap[Name];
}

export class IndexedDbRepository<Name extends RepositoryName> implements TransactionRepository<
  DomainEntityMap[Name]
> {
  constructor(
    private readonly name: Name,
    private readonly getStore: () => IDBObjectStore,
  ) {}

  async getById(
    scope: RepositoryScope,
    id: DomainEntityMap[Name]['id'],
  ): Promise<DomainEntityMap[Name] | null> {
    const record = await this.findRecord(scope, id, false);
    return record && record.deletedAt === undefined ? cloneValue(record.entity) : null;
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

    const store = this.getStore();
    const indexName =
      scope.branchId === undefined
        ? indexedDbIndexes.domainOrganizationCollectionEntity
        : indexedDbIndexes.domainScopeCollectionEntity;
    const records = await requestResult<IndexedDbDomainRecord<Name>[]>(
      store.index(indexName).getAll(scopeRange(scope, [this.name])),
    );
    const matching = records
      .filter((record) => query.includeDeleted === true || record.deletedAt === undefined)
      .sort((left, right) => left.entityId.localeCompare(right.entityId));
    const page = matching.slice(offset, offset + limit);
    const nextOffset = offset + page.length;

    return {
      items: page.map((record) => cloneValue(record.entity)),
      nextCursor: nextOffset < matching.length ? String(nextOffset) : undefined,
    };
  }

  async put(
    scope: RepositoryScope,
    entity: DomainEntityMap[Name],
    options: PutOptions = {},
  ): Promise<DomainEntityMap[Name]> {
    assertEntityMatchesScope(this.name, entity, scope);
    const existing = await this.findRecord(scope, entity.id, true);
    const actualVersion = existing?.version ?? null;
    assertExpectedVersion(this.name, entity.id, options.expectedVersion, actualVersion);

    const record: IndexedDbDomainRecord<Name> = {
      key: recordKey(this.name, scope, entity.id),
      collection: this.name,
      organizationId: scope.organizationId,
      branchId: scope.branchId ?? '',
      entityId: entity.id,
      version: readEntityVersion(entity) ?? (actualVersion ?? 0) + 1,
      ...(readDeletedAt(entity) === undefined ? {} : { deletedAt: readDeletedAt(entity) }),
      entity: cloneValue(entity),
    };
    await requestResult(this.getStore().put(record));
    return cloneValue(entity);
  }

  async tombstone(
    scope: RepositoryScope,
    id: DomainEntityMap[Name]['id'],
    options: TombstoneOptions,
  ): Promise<DomainEntityMap[Name]> {
    const existing = await this.findRecord(scope, id, true);
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
    const next: IndexedDbDomainRecord<Name> = {
      ...existing,
      version: nextVersion,
      deletedAt: options.deletedAt,
      entity,
    };

    await requestResult(this.getStore().put(next));
    return cloneValue(entity);
  }

  private async findRecord(
    scope: RepositoryScope,
    id: string,
    exactBranch: boolean,
  ): Promise<IndexedDbDomainRecord<Name> | undefined> {
    const store = this.getStore();
    const record =
      exactBranch || scope.branchId !== undefined
        ? await requestResult<IndexedDbDomainRecord<Name> | undefined>(
            store.get(recordKey(this.name, scope, id)),
          )
        : await requestResult<IndexedDbDomainRecord<Name> | undefined>(
            store
              .index(indexedDbIndexes.domainOrganizationCollectionEntity)
              .get([scope.organizationId, this.name, id]),
          );
    return record;
  }
}

function recordKey(repository: RepositoryName, scope: RepositoryScope, entityId: string): string {
  return [repository, scope.organizationId, scope.branchId ?? '', entityId].join('::');
}
