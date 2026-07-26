import {
  BranchId,
  DeviceId,
  Hall,
  HallId,
  MutationId,
  OrganizationId,
  toDomainId,
} from '../../../domain';
import { OutboxMutation } from '../../contracts';
import { InMemoryLocalDatabase } from '../../testing';
import { commitLocalEntityMutation } from '../localMutation';

const organizationId = toDomainId<OrganizationId>('22000000-0000-4000-8000-000000000001');
const branchId = toDomainId<BranchId>('32000000-0000-4000-8000-000000000001');
const hallId = toDomainId<HallId>('52000000-0000-4000-8000-000000000001');
const deviceId = toDomainId<DeviceId>('42000000-0000-4000-8000-000000000001');
const mutationId = toDomainId<MutationId>('62000000-0000-4000-8000-000000000001');
const scope = { organizationId, branchId };

describe('commitLocalEntityMutation', () => {
  it('commits the entity and outbox record atomically', async () => {
    const database = new InMemoryLocalDatabase();
    const hall = createHall('Main Hall', 1);
    const mutation = createMutation(hall);

    const result = await commitLocalEntityMutation(database, {
      scope,
      repository: 'halls',
      entity: hall,
      mutation,
    });

    await expect(database.repository('halls').getById(scope, hall.id)).resolves.toEqual(hall);
    await expect(database.outbox.getById(mutation.id)).resolves.toEqual(mutation);
    expect(result).toEqual({ entity: hall, mutation });
  });

  it('rolls back the entity update when enqueueing fails', async () => {
    const database = new InMemoryLocalDatabase();
    const original = createHall('Original', 1);
    const originalMutation = createMutation(original);
    await commitLocalEntityMutation(database, {
      scope,
      repository: 'halls',
      entity: original,
      mutation: originalMutation,
    });

    const edited: Hall = {
      ...original,
      name: 'Must Roll Back',
      version: 2,
      updatedAt: '2026-07-26T19:01:00.000Z',
    };
    const reusedMutation: OutboxMutation = {
      ...originalMutation,
      payload: {
        name: edited.name,
        sortOrder: edited.sortOrder,
        version: edited.version,
      },
    };

    await expect(
      commitLocalEntityMutation(database, {
        scope,
        repository: 'halls',
        entity: edited,
        mutation: reusedMutation,
        putOptions: { expectedVersion: 1 },
      }),
    ).rejects.toThrow('Client mutation ID was reused with different content');

    await expect(database.repository('halls').getById(scope, hallId)).resolves.toEqual(original);
  });

  it('rejects a mismatched tenant scope before opening a transaction', async () => {
    const database = new InMemoryLocalDatabase();
    const hall = createHall('Main Hall', 1);
    const mutation = {
      ...createMutation(hall),
      branchId: toDomainId<BranchId>('32000000-0000-4000-8000-000000000002'),
    };

    await expect(
      commitLocalEntityMutation(database, {
        scope,
        repository: 'halls',
        entity: hall,
        mutation,
      }),
    ).rejects.toThrow('Outbox tenant scope does not match');
  });
});

function createHall(name: string, version: number): Hall {
  return {
    id: hallId,
    organizationId,
    branchId,
    name,
    sortOrder: 1,
    version,
    createdAt: '2026-07-26T19:00:00.000Z',
    updatedAt: '2026-07-26T19:00:00.000Z',
    syncStatus: 'pending',
    clientMutationId: mutationId,
  };
}

function createMutation(hall: Hall): OutboxMutation {
  return {
    id: mutationId,
    organizationId,
    branchId,
    deviceId,
    clientMutationId: mutationId,
    idempotencyKey: `${deviceId}:${mutationId}`,
    repository: 'halls',
    entityId: hall.id,
    operation: 'create',
    payload: {
      name: hall.name,
      sortOrder: hall.sortOrder,
      version: hall.version,
    },
    status: 'pending',
    attemptCount: 0,
    createdAt: '2026-07-26T19:00:00.000Z',
  };
}
