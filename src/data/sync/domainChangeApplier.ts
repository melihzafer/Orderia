import { JsonValue } from '../../domain';
import {
  LocalTransaction,
  RepositoryName,
  RepositoryScope,
  TransactionRepository,
} from '../contracts';
import { RemoteSyncEvent } from './syncPullGateway';

type SyncableRecord = {
  readonly id: string;
  readonly organizationId: string;
  readonly branchId: string;
  readonly version?: number;
  readonly deletedAt?: string;
  readonly [key: string]: unknown;
};

const remoteRepositories: Readonly<Record<string, RepositoryName>> = {
  halls: 'halls',
  restaurant_tables: 'restaurantTables',
  menu_categories: 'menuCategories',
  menu_items: 'menuItems',
  modifier_groups: 'modifierGroups',
  modifier_options: 'modifierOptions',
  cancellation_reasons: 'cancellationReasons',
  table_sessions: 'tableSessions',
  checks: 'checks',
  order_batches: 'orderBatches',
  order_items: 'orderItems',
  order_item_modifiers: 'orderItemModifiers',
  payments: 'payments',
  payment_allocations: 'paymentAllocations',
  receipts: 'receipts',
};

export interface RemoteChangeApplier {
  apply(
    transaction: LocalTransaction,
    scope: Required<RepositoryScope>,
    event: RemoteSyncEvent,
  ): Promise<void>;
}

export class DomainRemoteChangeApplier implements RemoteChangeApplier {
  async apply(
    transaction: LocalTransaction,
    scope: Required<RepositoryScope>,
    event: RemoteSyncEvent,
  ): Promise<void> {
    assertEventScope(scope, event);
    const repositoryName = remoteRepositories[event.repository];
    if (!repositoryName) {
      throw new Error(`Unsupported remote repository: ${event.repository}`);
    }

    const repository = transaction.repository(
      repositoryName,
    ) as unknown as TransactionRepository<SyncableRecord>;
    if (event.operation === 'delete') {
      const existing = await repository.getById(scope, event.entityId);
      if (existing) {
        await repository.tombstone(scope, event.entityId, {
          deletedAt: event.committedAt,
        });
      }
      return;
    }

    const canonical = canonicalEntity(event);
    await repository.put(scope, canonical);
  }
}

function canonicalEntity(event: RemoteSyncEvent): SyncableRecord {
  const row = camelizeTopLevel(event.payload);
  const entity = {
    ...row,
    id: event.entityId,
    organizationId: event.organizationId,
    branchId: event.branchId,
    syncStatus: 'synced',
    ...(event.serverVersion === undefined ? {} : { serverVersion: event.serverVersion }),
    lastSyncedAt: event.committedAt,
  };

  if (event.repository === 'receipts' && 'snapshotJson' in entity) {
    return {
      ...entity,
      snapshot: entity.snapshotJson,
    } as SyncableRecord;
  }

  return entity as SyncableRecord;
}

function camelizeTopLevel(payload: JsonValue): Record<string, unknown> {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new Error('Remote sync payload must be an object');
  }

  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
      value,
    ]),
  );
}

function assertEventScope(scope: Required<RepositoryScope>, event: RemoteSyncEvent): void {
  if (event.organizationId !== scope.organizationId || event.branchId !== scope.branchId) {
    throw new Error('Remote sync event escaped the requested tenant scope');
  }
}
