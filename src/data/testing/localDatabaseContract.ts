import {
  Hall,
  BranchId,
  DeviceId,
  HallId,
  MutationId,
  OrganizationId,
  SyncConflictId,
  toDomainId,
} from '../../domain';
import {
  LocalDatabase,
  LocalTransaction,
  OptimisticConcurrencyError,
  OutboxMutation,
  RepositoryScope,
  SyncConflict,
} from '../contracts';

const organizationId = toDomainId<OrganizationId>('organization-contract');
const otherOrganizationId = toDomainId<OrganizationId>('organization-other');
const branchId = toDomainId<BranchId>('branch-contract');
const otherBranchId = toDomainId<BranchId>('branch-other');
const deviceId = toDomainId<DeviceId>('device-contract');
const mutationId = toDomainId<MutationId>('mutation-contract');
const timestamp = '2026-07-26T13:00:00.000Z';

const scope: RepositoryScope = { organizationId, branchId };
const otherBranchScope: RepositoryScope = {
  organizationId,
  branchId: otherBranchId,
};
const otherOrganizationScope: RepositoryScope = {
  organizationId: otherOrganizationId,
  branchId,
};

export function defineLocalDatabaseContract(
  adapterName: string,
  createDatabase: () => LocalDatabase | Promise<LocalDatabase>,
): void {
  describe(`${adapterName} local database contract`, () => {
    let database: LocalDatabase;

    beforeEach(async () => {
      database = await createDatabase();
    });

    afterEach(async () => {
      await database.close();
    });

    it('isolates organization and branch-scoped records', async () => {
      const hall = createHall('hall-primary', scope);
      const otherHall = createHall('hall-other', otherBranchScope);

      await database.transaction(async (transaction) => {
        await transaction.repository('halls').put(scope, hall, {
          expectedVersion: null,
        });
        await transaction
          .repository('halls')
          .put(otherBranchScope, otherHall, { expectedVersion: null });
      });

      await expect(database.repository('halls').getById(scope, hall.id)).resolves.toEqual(hall);
      await expect(
        database.repository('halls').getById(otherBranchScope, hall.id),
      ).resolves.toBeNull();
      await expect(database.repository('halls').list(otherOrganizationScope)).resolves.toEqual({
        items: [],
        nextCursor: undefined,
      });

      const organizationPage = await database.repository('halls').list({
        organizationId,
      });
      expect(organizationPage.items).toHaveLength(2);
    });

    it('commits entity and outbox writes atomically', async () => {
      const hall = createHall('hall-atomic', scope);
      const mutation = createMutation(hall);

      await database.transaction(async (transaction) => {
        await transaction.repository('halls').put(scope, hall, {
          expectedVersion: null,
        });
        await transaction.outbox.enqueue(mutation);
      });

      await expect(database.repository('halls').getById(scope, hall.id)).resolves.toEqual(hall);
      await expect(database.outbox.getById(mutation.id)).resolves.toEqual(mutation);
    });

    it('rolls back every write when a transaction fails', async () => {
      const hall = createHall('hall-rollback', scope);
      const mutation = createMutation(hall);

      await expect(
        database.transaction(async (transaction) => {
          await transaction.repository('halls').put(scope, hall, {
            expectedVersion: null,
          });
          await transaction.outbox.enqueue(mutation);
          throw new Error('simulated crash');
        }),
      ).rejects.toThrow('simulated crash');

      await expect(database.repository('halls').getById(scope, hall.id)).resolves.toBeNull();
      await expect(database.outbox.getById(mutation.id)).resolves.toBeNull();
    });

    it('does not allow transaction handles to mutate state after commit', async () => {
      let leakedTransaction: LocalTransaction | undefined;

      await database.transaction(async (transaction) => {
        leakedTransaction = transaction;
      });

      await expect(leakedTransaction!.repository('halls').list(scope)).rejects.toThrow(
        /no longer active/,
      );
    });

    it('enforces optimistic versions and retains tombstones', async () => {
      const hall = createHall('hall-versioned', scope);

      await database.transaction(async (transaction) => {
        await transaction.repository('halls').put(scope, hall, {
          expectedVersion: null,
        });
      });

      const updated = { ...hall, name: 'Updated Hall', version: 2 };
      await database.transaction(async (transaction) => {
        await transaction.repository('halls').put(scope, updated, {
          expectedVersion: 1,
        });
      });

      await expect(
        database.transaction(async (transaction) => {
          await transaction
            .repository('halls')
            .put(scope, { ...updated, name: 'Stale Update', version: 3 }, { expectedVersion: 1 });
        }),
      ).rejects.toBeInstanceOf(OptimisticConcurrencyError);

      await database.transaction(async (transaction) => {
        await transaction.repository('halls').tombstone(scope, hall.id, {
          expectedVersion: 2,
          deletedAt: timestamp,
        });
      });

      await expect(database.repository('halls').getById(scope, hall.id)).resolves.toBeNull();
      const deletedPage = await database.repository('halls').list(scope, { includeDeleted: true });
      expect(deletedPage.items[0]).toMatchObject({
        id: hall.id,
        deletedAt: timestamp,
        version: 3,
      });
    });

    it('deduplicates client mutations and enforces the outbox lifecycle', async () => {
      const mutation = createMutation(createHall('hall-outbox', scope));

      await database.transaction(async (transaction) => {
        await transaction.outbox.enqueue(mutation);
        await transaction.outbox.enqueue(mutation);
      });

      await expect(database.outbox.list(scope)).resolves.toHaveLength(1);

      await database.transaction(async (transaction) => {
        const claimed = await transaction.outbox.claimNext(scope, 10, timestamp);
        expect(claimed).toHaveLength(1);
        expect(claimed[0]).toMatchObject({
          status: 'processing',
          attemptCount: 1,
        });

        await transaction.outbox.transition(mutation.id, 'processing', 'applied', {
          appliedAt: timestamp,
        });
      });

      await expect(database.outbox.getById(mutation.id)).resolves.toMatchObject({
        status: 'applied',
        appliedAt: timestamp,
      });
      await expect(
        database.transaction(async (transaction) => {
          await transaction.outbox.transition(mutation.id, 'applied', 'processing');
        }),
      ).rejects.toThrow(/Invalid outbox transition/);
    });

    it('stores pull cursors and resolves sync conflicts per branch', async () => {
      const conflict = createConflict();

      await database.transaction(async (transaction) => {
        await transaction.syncState.setCursor({
          organizationId,
          branchId,
          value: 'cursor-42',
          updatedAt: timestamp,
        });
        await transaction.syncState.addConflict(conflict);
      });

      await expect(database.syncState.getCursor(scope)).resolves.toMatchObject({
        value: 'cursor-42',
      });
      await expect(database.syncState.listConflicts(otherBranchScope)).resolves.toEqual([]);

      await database.transaction(async (transaction) => {
        await transaction.syncState.resolveConflict(
          conflict.id,
          'resolved_server',
          timestamp,
          conflict.serverPayload,
        );
      });

      await expect(database.syncState.getConflict(conflict.id)).resolves.toMatchObject({
        status: 'resolved_server',
        resolvedAt: timestamp,
      });
    });
  });
}

function createHall(id: string, targetScope: RepositoryScope): Hall {
  if (!targetScope.branchId) {
    throw new Error('Hall fixture requires a branch scope');
  }

  return {
    id: toDomainId<HallId>(id),
    organizationId: targetScope.organizationId,
    branchId: targetScope.branchId,
    name: id,
    sortOrder: 0,
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
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
      id: hall.id,
      name: hall.name,
    },
    status: 'pending',
    attemptCount: 0,
    createdAt: timestamp,
  };
}

function createConflict(): SyncConflict {
  return {
    id: toDomainId<SyncConflictId>('conflict-contract'),
    organizationId,
    branchId,
    mutationId,
    repository: 'halls',
    entityId: 'hall-conflicted',
    baseVersion: 1,
    serverVersion: 2,
    localPayload: { name: 'Local Hall' },
    serverPayload: { name: 'Server Hall' },
    status: 'unresolved',
    detectedAt: timestamp,
  };
}
