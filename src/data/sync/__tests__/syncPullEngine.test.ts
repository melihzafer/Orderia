import { BranchId, HallId, OrganizationId, toDomainId } from '../../../domain';
import { InMemoryLocalDatabase } from '../../testing';
import { SyncPullEngine } from '../syncPullEngine';
import { RemoteSyncEvent, SyncPullGateway } from '../syncPullGateway';

const organizationId = toDomainId<OrganizationId>('23000000-0000-4000-8000-000000000001');
const branchId = toDomainId<BranchId>('33000000-0000-4000-8000-000000000001');
const scope = { organizationId, branchId };
const committedAt = '2026-07-26T20:30:00.000Z';

describe('SyncPullEngine', () => {
  it('applies missed pages and advances the cursor atomically', async () => {
    const database = new InMemoryLocalDatabase();
    const pull = jest
      .fn()
      .mockResolvedValueOnce([hallEvent('4', 'Hall 4'), hallEvent('9', 'Hall 9')])
      .mockResolvedValueOnce([]);
    const engine = new SyncPullEngine(database, gateway(pull), {
      pageSize: 2,
      now: () => new Date(committedAt),
    });

    await expect(engine.runOnce(scope)).resolves.toEqual({
      applied: 2,
      pages: 1,
      cursor: '9',
      skippedBecauseRunning: false,
    });
    expect(pull).toHaveBeenNthCalledWith(1, scope, '0', 2);
    expect(pull).toHaveBeenNthCalledWith(2, scope, '9', 2);
    await expect(database.syncState.getCursor(scope)).resolves.toMatchObject({
      value: '9',
      updatedAt: committedAt,
    });
    await expect(
      database
        .repository('halls')
        .getById(scope, toDomainId<HallId>(hallEvent('9', 'Hall 9').entityId)),
    ).resolves.toMatchObject({
      name: 'Hall 9',
      syncStatus: 'synced',
      serverVersion: 1,
      lastSyncedAt: committedAt,
    });
  });

  it('rolls back page entities and cursor when one event cannot be applied', async () => {
    const database = new InMemoryLocalDatabase();
    const validEvent = hallEvent('4', 'Must Roll Back');
    const unsupportedEvent: RemoteSyncEvent = {
      ...hallEvent('5', 'Unsupported'),
      repository: 'unsafe_dynamic_table',
    };
    const engine = new SyncPullEngine(
      database,
      gateway(jest.fn().mockResolvedValue([validEvent, unsupportedEvent])),
      { pageSize: 10 },
    );

    await expect(engine.runOnce(scope)).rejects.toThrow('Unsupported remote repository');
    await expect(
      database.repository('halls').getById(scope, toDomainId<HallId>(validEvent.entityId)),
    ).resolves.toBeNull();
    await expect(database.syncState.getCursor(scope)).resolves.toBeNull();
  });

  it('continues from the durable local cursor after restart', async () => {
    const database = new InMemoryLocalDatabase();
    await database.transaction(async (transaction) => {
      await transaction.syncState.setCursor({
        ...scope,
        value: '9007199254740993',
        updatedAt: committedAt,
      });
    });
    const nextEvent = hallEvent('9007199254740994', 'Beyond JS safe integer');
    const pull = jest.fn().mockResolvedValue([nextEvent]);
    const engine = new SyncPullEngine(database, gateway(pull), { pageSize: 10 });

    await expect(engine.runOnce(scope)).resolves.toMatchObject({
      cursor: '9007199254740994',
    });
    expect(pull).toHaveBeenCalledWith(scope, '9007199254740993', 10);
  });

  it('rejects duplicate or out-of-order cursors before local writes', async () => {
    const database = new InMemoryLocalDatabase();
    const engine = new SyncPullEngine(
      database,
      gateway(jest.fn().mockResolvedValue([hallEvent('5', 'First'), hallEvent('5', 'Duplicate')])),
      { pageSize: 10 },
    );

    await expect(engine.runOnce(scope)).rejects.toThrow('strictly increasing');
    await expect(database.syncState.getCursor(scope)).resolves.toBeNull();
  });
});

function gateway(pull: jest.Mock): SyncPullGateway {
  return { pull };
}

function hallEvent(cursor: string, name: string): RemoteSyncEvent {
  return {
    cursor,
    organizationId,
    branchId,
    repository: 'halls',
    entityId: `53000000-0000-4000-8000-${cursor.padStart(12, '0')}`,
    operation: 'update',
    payload: {
      id: `53000000-0000-4000-8000-${cursor.padStart(12, '0')}`,
      organization_id: organizationId,
      branch_id: branchId,
      name,
      sort_order: 1,
      version: 1,
      created_at: committedAt,
      updated_at: committedAt,
      deleted_at: null,
    },
    serverVersion: 1,
    committedAt,
  };
}
