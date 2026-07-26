import {
  RepositoryScope,
  SyncConflict,
  SyncConflictStatus,
  SyncCursor,
  SyncStateRepository,
} from '../contracts';
import { JsonValue } from '../../domain/entities';
import { SyncConflictId } from '../../domain/ids';
import { SqliteDriver, SqliteRow, SqliteValue } from './sqliteDriver';
import { parseJson, serializeJson } from './sqliteSerialization';

interface CursorRow extends SqliteRow {
  organization_id: string;
  branch_id: string;
  cursor_value: string;
  updated_at: string;
}

interface ConflictRow extends SqliteRow {
  id: string;
  organization_id: string;
  branch_id: string;
  mutation_id: string;
  repository: string;
  entity_id: string;
  base_version: number | null;
  server_version: number;
  local_payload_json: string;
  server_payload_json: string;
  status: string;
  detected_at: string;
  resolved_at: string | null;
  resolution_payload_json: string | null;
}

const conflictColumns = `
  id,
  organization_id,
  branch_id,
  mutation_id,
  repository,
  entity_id,
  base_version,
  server_version,
  local_payload_json,
  server_payload_json,
  status,
  detected_at,
  resolved_at,
  resolution_payload_json
`;

export class SqliteSyncStateRepository implements SyncStateRepository {
  constructor(private readonly getDriver: () => SqliteDriver) {}

  async getCursor(scope: RepositoryScope): Promise<SyncCursor | null> {
    if (scope.branchId === undefined) {
      throw new Error('Sync cursor access requires a branch scope');
    }

    const row = await this.getDriver().getFirst<CursorRow>(
      `SELECT organization_id, branch_id, cursor_value, updated_at
       FROM sync_cursors
       WHERE organization_id = ? AND branch_id = ?
       LIMIT 1`,
      [scope.organizationId, scope.branchId],
    );
    return row ? mapCursorRow(row) : null;
  }

  async setCursor(cursor: SyncCursor): Promise<SyncCursor> {
    await this.getDriver().run(
      `INSERT INTO sync_cursors (
         organization_id,
         branch_id,
         cursor_value,
         updated_at
       ) VALUES (?, ?, ?, ?)
       ON CONFLICT (organization_id, branch_id)
       DO UPDATE SET
         cursor_value = excluded.cursor_value,
         updated_at = excluded.updated_at`,
      [cursor.organizationId, cursor.branchId, cursor.value, cursor.updatedAt],
    );
    return cloneCursor(cursor);
  }

  async addConflict(conflict: SyncConflict): Promise<SyncConflict> {
    if (conflict.status !== 'unresolved') {
      throw new Error('New sync conflicts must start unresolved');
    }

    if (await this.getConflict(conflict.id)) {
      throw new Error(`Sync conflict already exists: ${conflict.id}`);
    }

    await this.getDriver().run(
      `INSERT INTO sync_conflicts (
         ${conflictColumns}
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      conflictParameters(conflict),
    );
    return cloneConflict(conflict);
  }

  async getConflict(id: SyncConflictId): Promise<SyncConflict | null> {
    const row = await this.getDriver().getFirst<ConflictRow>(
      `SELECT ${conflictColumns}
       FROM sync_conflicts
       WHERE id = ?
       LIMIT 1`,
      [id],
    );
    return row ? mapConflictRow(row) : null;
  }

  async listConflicts(
    scope: RepositoryScope,
    statuses?: readonly SyncConflictStatus[],
  ): Promise<readonly SyncConflict[]> {
    if (statuses?.length === 0) return [];

    const parameters: SqliteValue[] = [scope.organizationId];
    const branchClause = scope.branchId === undefined ? '' : 'AND branch_id = ?';
    if (scope.branchId !== undefined) {
      parameters.push(scope.branchId);
    }

    const statusClause =
      statuses === undefined ? '' : `AND status IN (${statuses.map(() => '?').join(', ')})`;
    if (statuses !== undefined) {
      parameters.push(...statuses);
    }

    const rows = await this.getDriver().getAll<ConflictRow>(
      `SELECT ${conflictColumns}
       FROM sync_conflicts
       WHERE organization_id = ?
         ${branchClause}
         ${statusClause}
       ORDER BY detected_at, id`,
      parameters,
    );
    return rows.map(mapConflictRow);
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
    await this.getDriver().run(
      `UPDATE sync_conflicts
       SET status = ?, resolved_at = ?, resolution_payload_json = ?
       WHERE id = ?`,
      [
        status,
        resolvedAt,
        resolutionPayload === undefined ? null : serializeJson(resolutionPayload),
        id,
      ],
    );
    return next;
  }
}

function conflictParameters(conflict: SyncConflict): readonly SqliteValue[] {
  return [
    conflict.id,
    conflict.organizationId,
    conflict.branchId,
    conflict.mutationId,
    conflict.repository,
    conflict.entityId,
    conflict.baseVersion ?? null,
    conflict.serverVersion,
    serializeJson(conflict.localPayload),
    serializeJson(conflict.serverPayload),
    conflict.status,
    conflict.detectedAt,
    conflict.resolvedAt ?? null,
    conflict.resolutionPayload === undefined ? null : serializeJson(conflict.resolutionPayload),
  ];
}

function mapCursorRow(row: CursorRow): SyncCursor {
  return {
    organizationId: row.organization_id as SyncCursor['organizationId'],
    branchId: row.branch_id as SyncCursor['branchId'],
    value: row.cursor_value,
    updatedAt: row.updated_at,
  };
}

function mapConflictRow(row: ConflictRow): SyncConflict {
  return {
    id: row.id as SyncConflict['id'],
    organizationId: row.organization_id as SyncConflict['organizationId'],
    branchId: row.branch_id as SyncConflict['branchId'],
    mutationId: row.mutation_id as SyncConflict['mutationId'],
    repository: row.repository as SyncConflict['repository'],
    entityId: row.entity_id,
    ...(row.base_version === null ? {} : { baseVersion: row.base_version }),
    serverVersion: row.server_version,
    localPayload: parseJson<JsonValue>(row.local_payload_json),
    serverPayload: parseJson<JsonValue>(row.server_payload_json),
    status: row.status as SyncConflictStatus,
    detectedAt: row.detected_at,
    ...(row.resolved_at === null ? {} : { resolvedAt: row.resolved_at }),
    ...(row.resolution_payload_json === null
      ? {}
      : {
          resolutionPayload: parseJson<JsonValue>(row.resolution_payload_json),
        }),
  };
}

function cloneCursor(cursor: SyncCursor): SyncCursor {
  return parseJson<SyncCursor>(serializeJson(cursor));
}

function cloneConflict(conflict: SyncConflict): SyncConflict {
  return parseJson<SyncConflict>(serializeJson(conflict));
}
