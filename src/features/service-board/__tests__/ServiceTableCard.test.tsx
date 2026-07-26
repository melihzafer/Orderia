import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import { LocalizationProvider } from '../../../i18n';
import { ShiftBoardTable } from '../shiftBoardModel';
import { ServiceTableCard, formatMinorCurrency } from '../ServiceTableCard';

const table: ShiftBoardTable = {
  id: 'table-4',
  hallId: 'hall-1',
  hallName: 'Terrace',
  label: 'Table 4',
  sequenceNumber: 4,
  state: 'payment_pending',
  syncStatus: 'pending',
  pendingMutationCount: 2,
  openedAt: '2026-07-26T12:30:00.000Z',
  durationMinutes: 30,
  totalMinor: 4250,
  paidMinor: 1000,
  remainingMinor: 3250,
  currencyCode: 'EUR',
  checkCount: 2,
  waiterNames: ['Deniz Kaya', 'Ayşe Yılmaz'],
  waiterInitials: ['DK', 'AY'],
  isMine: true,
  needsAttention: true,
};

describe('ServiceTableCard', () => {
  it('provides a large named table action and a separate visible more action', async () => {
    const onPress = jest.fn();
    const onMore = jest.fn();
    const screen = await render(
      <LocalizationProvider>
        <ThemeProvider>
          <ServiceTableCard onMore={onMore} onPress={onPress} table={table} />
        </ThemeProvider>
      </LocalizationProvider>,
    );

    const tableAction = screen.getByRole('button', {
      name: /Table 4.*32,50.*2 hesap/i,
    });
    await fireEvent.press(tableAction);
    await fireEvent.press(
      screen.getByRole('button', {
        name: /Table 4, Masa işlemleri/i,
      }),
    );

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onMore).toHaveBeenCalledTimes(1);
    expect(tableAction.props.style.minHeight).toBe(104);
  });
});

describe('formatMinorCurrency', () => {
  it('formats integer minor units using the selected locale and currency', () => {
    const formatted = formatMinorCurrency(4250, 'EUR', 'tr');
    expect(formatted).toContain('42,50');
    expect(formatted).toContain('€');
  });
});
