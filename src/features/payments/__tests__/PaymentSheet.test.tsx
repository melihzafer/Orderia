/* eslint-disable @typescript-eslint/no-require-imports -- Jest native component factories are hoisted. */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import { PaymentSheet } from '../PaymentSheet';

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

describe('PaymentSheet', () => {
  it('reviews and confirms the exact remaining amount with a 48px-first action flow', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    const screen = await render(
      <ThemeProvider>
        <PaymentSheet
          allocations={[]}
          busy={false}
          check={check}
          language="en"
          modifiers={[]}
          onClose={jest.fn()}
          onConfirm={onConfirm}
          online
          orderItems={[item]}
          payments={[]}
          visible
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Take payment')).toBeTruthy();
    expect(screen.getByText(/€10.00/)).toBeTruthy();
    const review = screen.getByRole('button', { name: 'Review payment' });
    expect(review.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ minHeight: 48 })]),
    );

    fireEvent.press(review);
    expect(await screen.findByText('Remaining after payment')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Confirm payment' }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onConfirm.mock.calls[0][0]).toMatchObject({
      checkId: 'check-1',
      expectedCheckVersion: 1,
      payments: [{ method: 'card', amountMinor: 1_000 }],
    });
  });

  it('blocks confirmation while offline', async () => {
    const screen = await render(
      <ThemeProvider>
        <PaymentSheet
          allocations={[]}
          busy={false}
          check={check}
          language="en"
          modifiers={[]}
          onClose={jest.fn()}
          onConfirm={jest.fn()}
          online={false}
          orderItems={[item]}
          payments={[]}
          visible
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Connection required')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Review payment' }).props.accessibilityState).toEqual(
      {
        busy: false,
        disabled: true,
      },
    );
  });
});

const common = {
  organizationId: 'organization-1',
  branchId: 'branch-1',
  tableSessionId: 'session-1',
} as const;

const check = {
  ...common,
  id: 'check-1',
  name: 'General',
  status: 'open',
  openedBy: 'waiter-1',
  openedAt: '2026-07-26T10:00:00.000Z',
  version: 1,
  serverVersion: 1,
  createdAt: '2026-07-26T10:00:00.000Z',
  updatedAt: '2026-07-26T10:00:00.000Z',
  syncStatus: 'synced',
} as never;

const item = {
  ...common,
  id: 'item-1',
  checkId: 'check-1',
  orderBatchId: 'batch-1',
  nameSnapshot: 'Fries',
  unitPriceMinor: 500,
  currencyCode: 'EUR',
  taxRateBasisPoints: 0,
  quantity: 2,
  status: 'ordered',
  createdBy: 'waiter-1',
  updatedBy: 'waiter-1',
  originalTableId: 'table-1',
  originalTableSessionId: 'session-1',
  version: 1,
  createdAt: '2026-07-26T10:00:00.000Z',
  updatedAt: '2026-07-26T10:00:00.000Z',
  syncStatus: 'synced',
} as never;
