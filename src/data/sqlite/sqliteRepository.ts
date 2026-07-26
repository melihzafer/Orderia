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
import { SqliteDriver, SqliteRow, SqliteValue } from './sqliteDriver';
import {
  assertEntityMatchesScope,
  assertExpectedVersion,
  branchKey,
  parseJson,
  readDeletedAt,
  readEntityVersion,
  serializeJson,
} from './sqliteSerialization';

interface DomainRecordRow extends SqliteRow {
  entity_json: string;
  version: number;
  deleted_at: string | null;
}

export class SqliteRepository<Name extends RepositoryName> implements TransactionRepository<
  DomainEntityMap[Name]
> {
  constructor(
    private readonly name: Name,
    private readonly getDriver: () => SqliteDriver,
  ) {}

  async getById(
    scope: RepositoryScope,
    id: DomainEntityMap[Name]['id'],
  ): Promise<DomainEntityMap[Name] | null> {
    const { sql, parameters } = this.recordSelector(scope, id);
    const row = await this.getDriver().getFirst<DomainRecordRow>(
      `SELECT entity_json, version, deleted_at
       FROM domain_records
       WHERE ${sql} AND deleted_at IS NULL
       ORDER BY branch_id
       LIMIT 1`,
      parameters,
    );
    return row ? parseJson<DomainEntityMap[Name]>(row.entity_json) : null;
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

    const parameters: SqliteValue[] = [this.name, scope.organizationId];
    const branchClause = scope.branchId === undefined ? '' : ' AND branch_id = ?';
    if (scope.branchId !== undefined) {
      parameters.push(scope.branchId);
    }

    parameters.push(limit + 1, offset);
    const rows = await this.getDriver().getAll<DomainRecordRow>(
      `SELECT entity_json, version, deleted_at
       FROM domain_records
       WHERE collection = ?
         AND organization_id = ?
         ${branchClause}
         ${query.includeDeleted === true ? '' : 'AND deleted_at IS NULL'}
       ORDER BY entity_id
       LIMIT ? OFFSET ?`,
      parameters,
    );
    const hasNextPage = rows.length > limit;
    const pageRows = rows.slice(0, limit);

    return {
      items: pageRows.map((row) => parseJson<DomainEntityMap[Name]>(row.entity_json)),
      nextCursor: hasNextPage ? String(offset + pageRows.length) : undefined,
    };
  }

  async put(
    scope: RepositoryScope,
    entity: DomainEntityMap[Name],
    options: PutOptions = {},
  ): Promise<DomainEntityMap[Name]> {
    assertEntityMatchesScope(this.name, entity, scope);
    const existing = await this.findStoredRecord(scope, entity.id);
    const actualVersion = existing ? Number(existing.version) : null;
    assertExpectedVersion(this.name, entity.id, options.expectedVersion, actualVersion);

    const version = readEntityVersion(entity) ?? (actualVersion ?? 0) + 1;
    await this.getDriver().run(
      `INSERT INTO domain_records (
         collection,
         organization_id,
         branch_id,
         entity_id,
         version,
         deleted_at,
         entity_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (collection, organization_id, branch_id, entity_id)
       DO UPDATE SET
         version = excluded.version,
         deleted_at = excluded.deleted_at,
         entity_json = excluded.entity_json`,
      [
        this.name,
        scope.organizationId,
        branchKey(scope),
        entity.id,
        version,
        readDeletedAt(entity) ?? null,
        serializeJson(entity),
      ],
    );
    return parseJson<DomainEntityMap[Name]>(serializeJson(entity));
  }

  async tombstone(
    scope: RepositoryScope,
    id: DomainEntityMap[Name]['id'],
    options: TombstoneOptions,
  ): Promise<DomainEntityMap[Name]> {
    const existing = await this.findStoredRecord(scope, id);
    if (!existing) {
      throw new Error(`Cannot tombstone missing ${this.name}/${id}`);
    }

    const actualVersion = Number(existing.version);
    assertExpectedVersion(this.name, id, options.expectedVersion, actualVersion);

    const current = parseJson<DomainEntityMap[Name]>(existing.entity_json);
    const nextVersion = actualVersion + 1;
    const tombstoned = {
      ...current,
      deletedAt: options.deletedAt,
      ...('version' in current ? { version: nextVersion } : {}),
    } as DomainEntityMap[Name];

    await this.getDriver().run(
      `UPDATE domain_records
       SET version = ?, deleted_at = ?, entity_json = ?
       WHERE collection = ?
         AND organization_id = ?
         AND branch_id = ?
         AND entity_id = ?`,
      [
        nextVersion,
        options.deletedAt,
        serializeJson(tombstoned),
        this.name,
        scope.organizationId,
        branchKey(scope),
        id,
      ],
    );
    return tombstoned;
  }

  private async findStoredRecord(
    scope: RepositoryScope,
    id: string,
  ): Promise<DomainRecordRow | null> {
    const { sql, parameters } = this.recordSelector(scope, id, true);
    return this.getDriver().getFirst<DomainRecordRow>(
      `SELECT entity_json, version, deleted_at
       FROM domain_records
       WHERE ${sql}
       LIMIT 1`,
      parameters,
    );
  }

  private recordSelector(
    scope: RepositoryScope,
    id: string,
    exactBranch = false,
  ): { readonly sql: string; readonly parameters: readonly SqliteValue[] } {
    const parameters: SqliteValue[] = [this.name, scope.organizationId];
    const shouldFilterBranch = exactBranch || scope.branchId !== undefined;
    const branchClause = shouldFilterBranch ? ' AND branch_id = ?' : '';

    if (shouldFilterBranch) {
      parameters.push(branchKey(scope));
    }

    parameters.push(id);
    return {
      sql: `collection = ?
            AND organization_id = ?
            ${branchClause}
            AND entity_id = ?`,
      parameters,
    };
  }
}
