import { LocalDatabase, RepositoryScope } from '../contracts';
import { SyncStatusSnapshot, deriveSyncStatus } from '../sync';

export async function inspectLocalSync(
  database: LocalDatabase,
  scope: Required<RepositoryScope>,
  online: boolean,
  hasError: boolean,
): Promise<SyncStatusSnapshot> {
  const [pending, outboxConflicts, conflicts] = await Promise.all([
    database.outbox.list(scope, ['pending', 'processing', 'retry_wait']),
    database.outbox.list(scope, ['conflict', 'rejected']),
    database.syncState.listConflicts(scope, ['unresolved']),
  ]);
  return deriveSyncStatus({
    online,
    pendingCount: pending.length,
    conflictCount: outboxConflicts.length + conflicts.length,
    syncing: false,
    hasError,
  });
}
