import { BranchId, DeviceId, MutationId, OrganizationId, toDomainId } from '../../../domain';
import { OutboxMutation } from '../../contracts';
import { InMemoryLocalDatabase } from '../../testing';
import { MutationPushGateway, MutationPushResult } from '../mutationPushGateway';
import { OutboxPushWorker } from '../outboxPushWorker';
import { MutationPushError } from '../retryPolicy';

const organizationId = toDomainId<OrganizationId>('22000000-0000-4000-8000-000000000001');
const branchId = toDomainId<BranchId>('32000000-0000-4000-8000-000000000001');
const deviceId = toDomainId<DeviceId>('42000000-0000-4000-8000-000000000001');
const mutationId = toDomainId<MutationId>('62000000-0000-4000-8000-000000000001');
const scope = { organizationId, branchId };
const now = new Date('2026-07-26T19:00:00.000Z');
const appliedResult: MutationPushResult = {
  status: 'applied',
  repository: 'halls',
  entityId: '52000000-0000-4000-8000-000000000001',
  serverVersion: 1,
  committedAt: now.toISOString(),
  result: { status: 'applied' },
};

describe('OutboxPushWorker', () => {
  it('claims and marks a successful mutation as applied', async () => {
    const database = await databaseWithMutation();
    const push = jest.fn().mockResolvedValue(appliedResult);
    const worker = createWorker(database, push);

    await expect(worker.runOnce(scope)).resolves.toEqual({
      claimed: 1,
      applied: 1,
      retrying: 0,
      conflicted: 0,
      rejected: 0,
      skippedBecauseRunning: false,
    });
    await expect(database.outbox.getById(mutationId)).resolves.toMatchObject({
      status: 'applied',
      attemptCount: 1,
      appliedAt: now.toISOString(),
    });
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('schedules transient failures with exponential backoff and jitter', async () => {
    const database = await databaseWithMutation();
    const push = jest.fn().mockRejectedValue(
      new MutationPushError('Service unavailable', {
        code: 'PGRST000',
        status: 503,
      }),
    );
    const worker = createWorker(database, push);

    await expect(worker.runOnce(scope)).resolves.toMatchObject({
      claimed: 1,
      retrying: 1,
    });
    await expect(database.outbox.getById(mutationId)).resolves.toMatchObject({
      status: 'retry_wait',
      attemptCount: 1,
      nextAttemptAt: '2026-07-26T19:00:00.500Z',
      errorCode: 'PGRST000',
    });

    await expect(worker.runOnce(scope)).resolves.toMatchObject({ claimed: 0 });
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('separates conflicts from permanent rejection', async () => {
    const conflictDatabase = await databaseWithMutation();
    const conflictWorker = createWorker(
      conflictDatabase,
      jest.fn().mockRejectedValue(new MutationPushError('version_conflict', { code: 'P0001' })),
    );
    await expect(conflictWorker.runOnce(scope)).resolves.toMatchObject({
      conflicted: 1,
    });
    await expect(conflictDatabase.outbox.getById(mutationId)).resolves.toMatchObject({
      status: 'conflict',
      errorMessage: 'version_conflict',
    });

    const rejectedDatabase = await databaseWithMutation();
    const rejectedWorker = createWorker(
      rejectedDatabase,
      jest.fn().mockRejectedValue(new MutationPushError('Forbidden', { status: 403 })),
    );
    await expect(rejectedWorker.runOnce(scope)).resolves.toMatchObject({
      rejected: 1,
    });
    await expect(rejectedDatabase.outbox.getById(mutationId)).resolves.toMatchObject({
      status: 'rejected',
      errorMessage: 'Forbidden',
    });
  });

  it('stops retrying after the configured attempt limit', async () => {
    const database = await databaseWithMutation();
    const worker = createWorker(
      database,
      jest.fn().mockRejectedValue(new TypeError('Network request failed')),
      1,
    );

    await expect(worker.runOnce(scope)).resolves.toMatchObject({
      retrying: 0,
      rejected: 1,
    });
    await expect(database.outbox.getById(mutationId)).resolves.toMatchObject({
      status: 'rejected',
      attemptCount: 1,
      errorCode: 'RETRY_ATTEMPTS_EXHAUSTED',
    });
  });

  it('recovers a mutation left processing by an interrupted app session', async () => {
    const database = await databaseWithMutation();
    await database.transaction(async (transaction) => {
      await transaction.outbox.claimNext(scope, 1, '2026-07-26T18:55:00.000Z');
    });
    const worker = createWorker(database, jest.fn().mockResolvedValue(appliedResult));

    await expect(worker.runOnce(scope)).resolves.toMatchObject({
      claimed: 1,
      applied: 1,
    });
    await expect(database.outbox.getById(mutationId)).resolves.toMatchObject({
      status: 'applied',
      attemptCount: 2,
    });
  });

  it('does not run overlapping push cycles', async () => {
    const database = await databaseWithMutation();
    let releasePush!: (result: MutationPushResult) => void;
    const push = jest.fn(
      () =>
        new Promise<MutationPushResult>((resolve) => {
          releasePush = resolve;
        }),
    );
    const worker = createWorker(database, push);

    const firstCycle = worker.runOnce(scope);
    while (push.mock.calls.length === 0) {
      await Promise.resolve();
    }
    await expect(worker.runOnce(scope)).resolves.toMatchObject({
      claimed: 0,
      skippedBecauseRunning: true,
    });
    releasePush(appliedResult);
    await expect(firstCycle).resolves.toMatchObject({ applied: 1 });
  });
});

async function databaseWithMutation(): Promise<InMemoryLocalDatabase> {
  const database = new InMemoryLocalDatabase();
  await database.transaction(async (transaction) => {
    await transaction.outbox.enqueue(createMutation());
  });
  return database;
}

function createMutation(): OutboxMutation {
  return {
    id: mutationId,
    organizationId,
    branchId,
    deviceId,
    clientMutationId: mutationId,
    idempotencyKey: `${deviceId}:${mutationId}`,
    repository: 'halls',
    entityId: appliedResult.entityId,
    operation: 'create',
    payload: { name: 'Main Hall', sortOrder: 1 },
    status: 'pending',
    attemptCount: 0,
    createdAt: now.toISOString(),
  };
}

function createWorker(
  database: InMemoryLocalDatabase,
  push: MutationPushGateway['push'],
  maximumAttempts = 8,
): OutboxPushWorker {
  const gateway: MutationPushGateway = { push };
  return new OutboxPushWorker(database, gateway, {
    now: () => now,
    random: () => 0.5,
    retryPolicy: {
      baseDelayMs: 1_000,
      maximumDelayMs: 60_000,
      maximumAttempts,
    },
  });
}
