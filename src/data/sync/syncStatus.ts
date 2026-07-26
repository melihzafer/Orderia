export type SyncIndicatorState =
  'synced' | 'pending' | 'syncing' | 'offline' | 'conflict' | 'error';

export interface SyncStatusInput {
  readonly online: boolean;
  readonly pendingCount: number;
  readonly conflictCount: number;
  readonly syncing: boolean;
  readonly hasError: boolean;
}

export interface SyncStatusSnapshot extends SyncStatusInput {
  readonly state: SyncIndicatorState;
}

export function deriveSyncStatus(input: SyncStatusInput): SyncStatusSnapshot {
  assertCount(input.pendingCount, 'Pending');
  assertCount(input.conflictCount, 'Conflict');

  let state: SyncIndicatorState;
  if (input.conflictCount > 0) {
    state = 'conflict';
  } else if (!input.online) {
    state = 'offline';
  } else if (input.syncing) {
    state = 'syncing';
  } else if (input.pendingCount > 0) {
    state = 'pending';
  } else if (input.hasError) {
    state = 'error';
  } else {
    state = 'synced';
  }

  return { ...input, state };
}

function assertCount(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} sync count must be a non-negative safe integer`);
  }
}
