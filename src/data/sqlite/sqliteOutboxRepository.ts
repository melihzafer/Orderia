import {
  OutboxMutation,
  OutboxRepository,
  OutboxStatus,
  OutboxTransitionPatch,
  RepositoryScope,
  assertOutboxTransition,
} from '../contracts';
import { MutationId } from '../../domain/ids';
import { SqliteDriver, SqliteRow, SqliteValue } from './sqliteDriver';
import { parseJson, serializeJson, stableSerialize } from './sqliteSerialization';

interface OutboxRow extends SqliteRow {
  id: string;
  organization_id: string;
  branch_id: string;
  device_id: string;
  client_mutation_id: string;
  idempotency_key: string;
  repository: string;
  entity_id: string;
  operation: string;
  payload_json: string;
  base_version: number | null;
  status: string;
  attempt_count: number;
  created_at: string;
  last_attempt_at: string | null;
  next_attempt_at: string | null;
  applied_at: string | null;
  error_code: string | null;
  error_message: string | null;
}

const outboxColumns = `
  id,
  organization_id,
  branch_id,
  device_id,
  client_mutation_id,
  idempotency_key,
  repository,
  entity_id,
  operation,
  payload_json,
  base_version,
  status,
  attempt_count,
  created_at,
  last_attempt_at,
  next_attempt_at,
  applied_at,
  error_code,
  error_message
`;

export class SqliteOutboxRepository implements OutboxRepository {
  constructor(private readonly getDriver: () => SqliteDriver) {}

  async enqueue(mutation: OutboxMutation): Promise<OutboxMutation> {
    if (mutation.status !== 'pending' || mutation.attemptCount !== 0) {
      throw new Error('New outbox mutations must start pending with zero attempts');
    }

    if (!mutation.idempotencyKey.trim()) {
      throw new Error('Outbox mutation requires an idempotency key');
    }

    const existingClientMutation = await this.getDriver().getFirst<OutboxRow>(
      `SELECT ${outboxColumns}
       FROM outbox_mutations
       WHERE device_id = ? AND client_mutation_id = ?
       LIMIT 1`,
      [mutation.deviceId, mutation.clientMutationId],
    );

    if (existingClientMutation) {
      const existing = mapOutboxRow(existingClientMutation);
      if (stableSerialize(existing) !== stableSerialize(mutation)) {
        throw new Error('Client mutation ID was reused with different content');
      }

      return existing;
    }

    const existingId = await this.getById(mutation.id);
    if (existingId) {
      throw new Error(`Outbox mutation ID already exists: ${mutation.id}`);
    }

    await this.getDriver().run(
      `INSERT INTO outbox_mutations (
         ${outboxColumns}
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      outboxParameters(mutation),
    );
    return cloneMutation(mutation);
  }

  async getById(id: MutationId): Promise<OutboxMutation | null> {
    const row = await this.getDriver().getFirst<OutboxRow>(
      `SELECT ${outboxColumns}
       FROM outbox_mutations
       WHERE id = ?
       LIMIT 1`,
      [id],
    );
    return row ? mapOutboxRow(row) : null;
  }

  async list(
    scope: RepositoryScope,
    statuses?: readonly OutboxStatus[],
  ): Promise<readonly OutboxMutation[]> {
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

    const rows = await this.getDriver().getAll<OutboxRow>(
      `SELECT ${outboxColumns}
       FROM outbox_mutations
       WHERE organization_id = ?
         ${branchClause}
         ${statusClause}
       ORDER BY created_at, id`,
      parameters,
    );
    return rows.map(mapOutboxRow);
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
    await this.getDriver().run(
      `UPDATE outbox_mutations
       SET status = ?,
           attempt_count = ?,
           last_attempt_at = ?,
           next_attempt_at = ?,
           applied_at = ?,
           error_code = ?,
           error_message = ?
       WHERE id = ?`,
      [
        next.status,
        next.attemptCount,
        next.lastAttemptAt ?? null,
        next.nextAttemptAt ?? null,
        next.appliedAt ?? null,
        next.errorCode ?? null,
        next.errorMessage ?? null,
        next.id,
      ],
    );
    return next;
  }
}

function outboxParameters(mutation: OutboxMutation): readonly SqliteValue[] {
  return [
    mutation.id,
    mutation.organizationId,
    mutation.branchId,
    mutation.deviceId,
    mutation.clientMutationId,
    mutation.idempotencyKey,
    mutation.repository,
    mutation.entityId,
    mutation.operation,
    serializeJson(mutation.payload),
    mutation.baseVersion ?? null,
    mutation.status,
    mutation.attemptCount,
    mutation.createdAt,
    mutation.lastAttemptAt ?? null,
    mutation.nextAttemptAt ?? null,
    mutation.appliedAt ?? null,
    mutation.errorCode ?? null,
    mutation.errorMessage ?? null,
  ];
}

function mapOutboxRow(row: OutboxRow): OutboxMutation {
  return {
    id: row.id as OutboxMutation['id'],
    organizationId: row.organization_id as OutboxMutation['organizationId'],
    branchId: row.branch_id as OutboxMutation['branchId'],
    deviceId: row.device_id as OutboxMutation['deviceId'],
    clientMutationId: row.client_mutation_id as OutboxMutation['clientMutationId'],
    idempotencyKey: row.idempotency_key,
    repository: row.repository as OutboxMutation['repository'],
    entityId: row.entity_id,
    operation: row.operation as OutboxMutation['operation'],
    payload: parseJson<OutboxMutation['payload']>(row.payload_json),
    ...(row.base_version === null ? {} : { baseVersion: row.base_version }),
    status: row.status as OutboxStatus,
    attemptCount: row.attempt_count,
    createdAt: row.created_at,
    ...(row.last_attempt_at === null ? {} : { lastAttemptAt: row.last_attempt_at }),
    ...(row.next_attempt_at === null ? {} : { nextAttemptAt: row.next_attempt_at }),
    ...(row.applied_at === null ? {} : { appliedAt: row.applied_at }),
    ...(row.error_code === null ? {} : { errorCode: row.error_code }),
    ...(row.error_message === null ? {} : { errorMessage: row.error_message }),
  };
}

function cloneMutation(mutation: OutboxMutation): OutboxMutation {
  return parseJson<OutboxMutation>(serializeJson(mutation));
}
