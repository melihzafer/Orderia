/* eslint-disable @typescript-eslint/no-require-imports -- Jest native component factories are hoisted. */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import { TableOperationSheet } from '../TableOperationSheet';

jest.mock('react-native/Libraries/Components/ActivityIndicator/ActivityIndicator', () => ({
  __esModule: true,
  default: 'ActivityIndicator',
}));
jest.mock('react-native/Libraries/Modal/Modal', () => {
  const ReactModule = require('react') as typeof React;
  function MockModal({
    children,
    visible,
  }: {
    readonly children: React.ReactNode;
    readonly visible: boolean;
  }) {
    return visible ? ReactModule.createElement('Modal', null, children) : null;
  }
  return { __esModule: true, default: MockModal };
});
jest.mock('react-native/Libraries/Components/ScrollView/ScrollView', () => {
  const ReactModule = require('react') as typeof React;
  function MockScrollView({ children }: { readonly children: React.ReactNode }) {
    return ReactModule.createElement('ScrollView', null, children);
  }
  return { __esModule: true, default: MockScrollView };
});

describe('TableOperationSheet', () => {
  it('makes an occupied target explicit and preserves named checks in review', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    const target = {
      table: table('table-2', 'Patio 2'),
      session: session('session-2', 'table-2', 3),
    };
    const screen = await render(
      <ThemeProvider>
        <TableOperationSheet
          busy={false}
          language="en"
          onClose={jest.fn()}
          onConfirm={onConfirm}
          online
          sourceChecks={[check('check-1', 'General'), check('check-2', 'Children')]}
          sourceSession={session('session-1', 'table-1', 2)}
          sourceTable={table('table-1', 'Patio 1')}
          targets={[target, { table: table('table-3', 'Patio 3') }]}
          visible
        />
      </ThemeProvider>,
    );

    fireEvent.press(screen.getByRole('button', { name: /Patio 2/i }));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Review operation' }).props.accessibilityState.disabled,
      ).toBe(false),
    );
    fireEvent.press(screen.getByRole('button', { name: 'Review operation' }));
    expect(
      await screen.findByText('Sessions merge while every named check remains separate.'),
    ).toBeTruthy();
    expect(screen.getByText('General')).toBeTruthy();
    expect(screen.getByText('Children')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Confirm merge' }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onConfirm.mock.calls[0][0]).toEqual({
      sourceSessionId: 'session-1',
      targetTableId: 'table-2',
      expectedSourceVersion: 2,
      expectedTargetVersion: 3,
    });
  });
});

function table(id: string, label: string) {
  return {
    id,
    organizationId: 'organization-1',
    branchId: 'branch-1',
    hallId: 'hall-1',
    label,
    sequenceNumber: Number(id.at(-1)),
    sortOrder: Number(id.at(-1)),
    version: 1,
    createdAt: '2026-07-26T10:00:00.000Z',
    updatedAt: '2026-07-26T10:00:00.000Z',
    syncStatus: 'synced',
  } as never;
}

function session(id: string, tableId: string, version: number) {
  return {
    id,
    organizationId: 'organization-1',
    branchId: 'branch-1',
    tableId,
    status: 'open',
    openedBy: 'waiter-1',
    openedAt: '2026-07-26T10:00:00.000Z',
    version,
    serverVersion: version,
    createdAt: '2026-07-26T10:00:00.000Z',
    updatedAt: '2026-07-26T10:00:00.000Z',
    syncStatus: 'synced',
  } as never;
}

function check(id: string, name: string) {
  return {
    id,
    organizationId: 'organization-1',
    branchId: 'branch-1',
    tableSessionId: 'session-1',
    name,
    status: 'open',
    openedBy: 'waiter-1',
    openedAt: '2026-07-26T10:00:00.000Z',
    version: 1,
    createdAt: '2026-07-26T10:00:00.000Z',
    updatedAt: '2026-07-26T10:00:00.000Z',
    syncStatus: 'synced',
  } as never;
}
