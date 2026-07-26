import {
  BranchId,
  DeviceId,
  MutationId,
  OrganizationId,
  SyncConflictId,
  toDomainId,
} from '../../../domain';
import { OutboxMutation, RepositoryScope, SyncConflict } from '../../contracts';
import { InMemoryLocalDatabase } from '../../testing';
import { inspectLocalSync } from '../syncInspection';

const organizationId = toDomainId<OrganizationId>('organization-runtime');
const branchId = toDomainId<BranchId>('branch-runtime');
const mutationId = toDomainId<MutationId>('mutation-runtime');
const scope: Required<RepositoryScope> = { organizationId, branchId };
const timestamp = '2026-07-26T13:00:00.000Z';

describe('inspectLocalSync', () => {
  let database: InMemoryLocalDatabase;

  beforeEach(() => {
    database = new InMemoryLocalDatabase();
  });

  afterEach(async () => {
    await database.close();
  });

  it('reports a clean online database as synced', async () => {
    await expect(inspectLocalSync(database, scope, true, false)).resolves.toMatchObject({
      state: 'synced',
      pendingCount: 0,
      conflictCount: 0,
    });
  });

  it('counts durable queued work and unresolved conflicts', async () => {
    await database.transaction(async (transaction) => {
      await transaction.outbox.enqueue(createMutation());
      await transaction.syncState.addConflict(createConflict());
    });

    await expect(inspectLocalSync(database, scope, true, false)).resolves.toMatchObject({
      state: 'conflict',
      pendingCount: 1,
      conflictCount: 1,
    });
  });
});

function createMutation(): OutboxMutation {
  return {
    id: mutationId,
    organizationId,
    branchId,
    deviceId: toDomainId<DeviceId>('device-runtime'),
    clientMutationId: mutationId,
    idempotencyKey: 'device-runtime:mutation-runtime',
    repository: 'halls',
    entityId: 'hall-runtime',
    operation: 'create',
    payload: { name: 'Terrace' },
    status: 'pending',
    attemptCount: 0,
    createdAt: timestamp,
  };
}

function createConflict(): SyncConflict {
  return {
    id: toDomainId<SyncConflictId>('conflict-runtime'),
    organizationId,
    branchId,
    mutationId,
    repository: 'halls',
    entityId: 'hall-runtime',
    baseVersion: 1,
    serverVersion: 2,
    localPayload: { name: 'Terrace local' },
    serverPayload: { name: 'Terrace server' },
    status: 'unresolved',
    detectedAt: timestamp,
  };
}
