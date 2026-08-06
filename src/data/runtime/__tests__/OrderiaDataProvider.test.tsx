import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import { BranchId, OrganizationId, toDomainId } from '../../../domain';
import { OutboxPushWorker, SyncPullEngine, subscribeToRealtimeSyncHints } from '../../sync';
import { InMemoryLocalDatabase } from '../../testing';
import { OrderiaDataProvider, useOrderiaData } from '../OrderiaDataContext';

let mockActiveBranch = branch('branch-a');

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ activeBranch: mockActiveBranch }),
}));

jest.mock('../../sync', () => {
  const actual = jest.requireActual('../../sync');
  return {
    ...actual,
    OutboxPushWorker: jest.fn(),
    SyncPullEngine: jest.fn(),
    subscribeToRealtimeSyncHints: jest.fn(),
  };
});

describe('OrderiaDataProvider scoped refreshes', () => {
  beforeEach(() => {
    mockActiveBranch = branch('branch-a');
    (subscribeToRealtimeSyncHints as jest.Mock).mockResolvedValue({
      unsubscribe: jest.fn().mockResolvedValue(undefined),
    });
    (SyncPullEngine as jest.Mock).mockImplementation(() => ({
      runOnce: jest.fn().mockResolvedValue(undefined),
    }));
  });

  it('starts the new branch refresh and ignores completion from the previous branch', async () => {
    const branchA = deferred<void>();
    const branchB = deferred<void>();
    const pushScopes: string[] = [];
    (OutboxPushWorker as jest.Mock).mockImplementation(() => ({
      runOnce: jest.fn((scope: { branchId: BranchId }) => {
        pushScopes.push(String(scope.branchId));
        return String(scope.branchId) === 'branch-a' ? branchA.promise : branchB.promise;
      }),
    }));

    const database = new InMemoryLocalDatabase();
    const openDatabase = jest.fn().mockResolvedValue(database);
    const client = {} as never;
    const view = await render(
      <OrderiaDataProvider client={client} openDatabase={openDatabase}>
        <RevisionProbe />
      </OrderiaDataProvider>,
    );

    await waitFor(() => expect(pushScopes).toEqual(['branch-a']));

    mockActiveBranch = branch('branch-b');
    await view.rerender(
      <OrderiaDataProvider client={client} openDatabase={openDatabase}>
        <RevisionProbe />
      </OrderiaDataProvider>,
    );

    await waitFor(() => expect(pushScopes).toEqual(['branch-a', 'branch-b']));
    branchB.resolve();
    await waitFor(() => expect(view.getByTestId('revision').props.children).toBe(1));

    branchA.resolve();
    await waitFor(() => expect(view.getByTestId('revision').props.children).toBe(1));

    await view.unmount();
  });
});

function RevisionProbe() {
  const { revision } = useOrderiaData();
  return <Text testID="revision">{revision}</Text>;
}

function branch(id: string) {
  return {
    id: toDomainId<BranchId>(id),
    organization_id: toDomainId<OrganizationId>('organization-runtime'),
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}
