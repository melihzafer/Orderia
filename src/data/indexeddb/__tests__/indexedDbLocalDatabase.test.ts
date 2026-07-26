import 'fake-indexeddb/auto';

import { BranchId, DeviceId, MutationId, OrganizationId, toDomainId } from '../../../domain';
import { OutboxMutation } from '../../contracts';
import { defineLocalDatabaseContract } from '../../testing/localDatabaseContract';
import { IndexedDbLocalDatabase } from '../indexedDbLocalDatabase';
import {
  indexedDbIndexes,
  indexedDbSchemaVersion,
  indexedDbStores,
  openIndexedDbConnection,
} from '../indexedDbSchema';

const createdDatabaseNames: string[] = [];
let databaseSequence = 0;

defineLocalDatabaseContract('IndexedDB', () => {
  const name = uniqueDatabaseName('contract');
  return IndexedDbLocalDatabase.open(name);
});

describe('IndexedDB browser persistence', () => {
  it('retains queued offline mutations after the database is reopened', async () => {
    const databaseName = uniqueDatabaseName('reload');
    const mutation = createMutation('mutation-reload');
    const firstConnection = await IndexedDbLocalDatabase.open(databaseName);

    await firstConnection.transaction(async (transaction) => {
      await transaction.outbox.enqueue(mutation);
    });
    await firstConnection.close();

    const reloadedConnection = await IndexedDbLocalDatabase.open(databaseName);
    await expect(reloadedConnection.outbox.getById(mutation.id)).resolves.toEqual(mutation);
    await reloadedConnection.close();
  });

  it('does not expose aborted writes after the database is reopened', async () => {
    const databaseName = uniqueDatabaseName('recovery');
    const mutation = createMutation('mutation-aborted');
    const firstConnection = await IndexedDbLocalDatabase.open(databaseName);

    await expect(
      firstConnection.transaction(async (transaction) => {
        await transaction.outbox.enqueue(mutation);
        throw new Error('simulated browser termination');
      }),
    ).rejects.toThrow('simulated browser termination');
    await firstConnection.close();

    const recoveredConnection = await IndexedDbLocalDatabase.open(databaseName);
    await expect(recoveredConnection.outbox.getById(mutation.id)).resolves.toBeNull();
    await recoveredConnection.close();
  });

  it('keeps a transaction active across asynchronous application work', async () => {
    const databaseName = uniqueDatabaseName('async-transaction');
    const mutation = createMutation('mutation-delayed');
    const database = await IndexedDbLocalDatabase.open(databaseName);

    await database.transaction(async (transaction) => {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 1);
      });
      await transaction.outbox.enqueue(mutation);
    });

    await expect(database.outbox.getById(mutation.id)).resolves.toEqual(mutation);
    await database.close();
  });
});

describe('IndexedDB migrations', () => {
  it('creates the versioned stores and query indexes', async () => {
    const databaseName = uniqueDatabaseName('migration');
    const database = await openIndexedDbConnection(indexedDB, databaseName);
    const transaction = database.transaction(
      [
        indexedDbStores.domainRecords,
        indexedDbStores.outboxMutations,
        indexedDbStores.syncConflicts,
      ],
      'readonly',
    );

    expect(database.version).toBe(indexedDbSchemaVersion);
    expect(Array.from(database.objectStoreNames)).toEqual(
      expect.arrayContaining(Object.values(indexedDbStores)),
    );
    expect(Array.from(transaction.objectStore(indexedDbStores.domainRecords).indexNames)).toEqual(
      expect.arrayContaining([
        indexedDbIndexes.domainScopeCollectionEntity,
        indexedDbIndexes.domainOrganizationCollectionEntity,
      ]),
    );

    database.close();
  });
});

afterAll(async () => {
  for (const databaseName of createdDatabaseNames) {
    await deleteDatabase(databaseName);
  }
});

function uniqueDatabaseName(label: string): string {
  const name = `orderia-${label}-${databaseSequence}`;
  databaseSequence += 1;
  createdDatabaseNames.push(name);
  return name;
}

function createMutation(id: string): OutboxMutation {
  const mutationId = toDomainId<MutationId>(id);
  const organizationId = toDomainId<OrganizationId>('organization-pwa');
  const branchId = toDomainId<BranchId>('branch-pwa');
  const deviceId = toDomainId<DeviceId>('device-pwa');

  return {
    id: mutationId,
    organizationId,
    branchId,
    deviceId,
    clientMutationId: mutationId,
    idempotencyKey: `${deviceId}:${mutationId}`,
    repository: 'halls',
    entityId: 'hall-pwa',
    operation: 'create',
    payload: { name: 'Offline Hall' },
    status: 'pending',
    attemptCount: 0,
    createdAt: '2026-07-26T13:00:00.000Z',
  };
}

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      reject(request.error ?? new Error(`Could not delete ${name}`));
    };
    request.onblocked = () => {
      reject(new Error(`Deleting ${name} was blocked`));
    };
  });
}
