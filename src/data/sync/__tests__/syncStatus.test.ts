import { deriveSyncStatus } from '../syncStatus';

describe('deriveSyncStatus', () => {
  it.each([
    [
      {
        online: true,
        pendingCount: 0,
        conflictCount: 0,
        syncing: false,
        hasError: false,
      },
      'synced',
    ],
    [
      {
        online: true,
        pendingCount: 3,
        conflictCount: 0,
        syncing: false,
        hasError: false,
      },
      'pending',
    ],
    [
      {
        online: true,
        pendingCount: 3,
        conflictCount: 0,
        syncing: true,
        hasError: false,
      },
      'syncing',
    ],
    [
      {
        online: false,
        pendingCount: 3,
        conflictCount: 0,
        syncing: false,
        hasError: false,
      },
      'offline',
    ],
    [
      {
        online: false,
        pendingCount: 3,
        conflictCount: 1,
        syncing: false,
        hasError: false,
      },
      'conflict',
    ],
    [
      {
        online: true,
        pendingCount: 0,
        conflictCount: 0,
        syncing: false,
        hasError: true,
      },
      'error',
    ],
  ] as const)('derives the %s state as %s', (input, expected) => {
    expect(deriveSyncStatus(input)).toMatchObject({ state: expected });
  });
});
