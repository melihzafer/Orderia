export const indexedDbSchemaVersion = 1;

export const indexedDbStores = {
  domainRecords: 'domain_records',
  metadata: 'metadata',
  outboxMutations: 'outbox_mutations',
  syncConflicts: 'sync_conflicts',
  syncCursors: 'sync_cursors',
} as const;

export const indexedDbStoreNames = Object.values(indexedDbStores);

export const indexedDbIndexes = {
  domainOrganizationCollectionEntity: 'by_organization_collection_entity',
  domainScopeCollectionEntity: 'by_scope_collection_entity',
  outboxDeviceClientMutation: 'by_device_client_mutation',
  outboxOrganizationCreated: 'by_organization_created',
  outboxScopeCreated: 'by_scope_created',
  conflictOrganizationDetected: 'by_organization_detected',
  conflictScopeDetected: 'by_scope_detected',
} as const;

export interface IndexedDbMigration {
  readonly version: number;
  readonly name: string;
  upgrade(database: IDBDatabase): void;
}

export const indexedDbMigrations: readonly IndexedDbMigration[] = [
  {
    version: 1,
    name: 'local_first_foundation',
    upgrade(database) {
      const domainRecords = database.createObjectStore(indexedDbStores.domainRecords, {
        keyPath: 'key',
      });
      domainRecords.createIndex(indexedDbIndexes.domainScopeCollectionEntity, [
        'organizationId',
        'branchId',
        'collection',
        'entityId',
      ]);
      domainRecords.createIndex(indexedDbIndexes.domainOrganizationCollectionEntity, [
        'organizationId',
        'collection',
        'entityId',
      ]);

      const outbox = database.createObjectStore(indexedDbStores.outboxMutations, { keyPath: 'id' });
      outbox.createIndex(
        indexedDbIndexes.outboxDeviceClientMutation,
        ['deviceId', 'clientMutationId'],
        { unique: true },
      );
      outbox.createIndex(indexedDbIndexes.outboxScopeCreated, [
        'organizationId',
        'branchId',
        'createdAt',
        'id',
      ]);
      outbox.createIndex(indexedDbIndexes.outboxOrganizationCreated, [
        'organizationId',
        'createdAt',
        'id',
      ]);

      database.createObjectStore(indexedDbStores.syncCursors, {
        keyPath: 'key',
      });

      const conflicts = database.createObjectStore(indexedDbStores.syncConflicts, {
        keyPath: 'id',
      });
      conflicts.createIndex(indexedDbIndexes.conflictScopeDetected, [
        'organizationId',
        'branchId',
        'detectedAt',
        'id',
      ]);
      conflicts.createIndex(indexedDbIndexes.conflictOrganizationDetected, [
        'organizationId',
        'detectedAt',
        'id',
      ]);

      database.createObjectStore(indexedDbStores.metadata, {
        keyPath: 'key',
      });
    },
  },
];

export function openIndexedDbConnection(
  factory: IDBFactory,
  databaseName: string,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(databaseName, indexedDbSchemaVersion);
    let settled = false;

    request.onupgradeneeded = (event) => {
      const oldVersion = event.oldVersion;
      const newVersion = event.newVersion ?? indexedDbSchemaVersion;

      for (const migration of indexedDbMigrations) {
        if (migration.version > oldVersion && migration.version <= newVersion) {
          migration.upgrade(request.result);
        }
      }
    };
    request.onerror = () => {
      settled = true;
      reject(request.error ?? new Error('Could not open IndexedDB'));
    };
    request.onblocked = () => {
      settled = true;
      reject(new Error(`IndexedDB upgrade for "${databaseName}" is blocked by another tab`));
    };
    request.onsuccess = () => {
      if (settled) {
        request.result.close();
        return;
      }

      settled = true;
      resolve(request.result);
    };
  });
}
