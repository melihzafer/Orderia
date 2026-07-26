import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import { ReceiptArchiveEntry } from '../receiptArchiveGateway';
import { ReceiptArchiveCard } from '../ReceiptArchiveCard';

describe('ReceiptArchiveCard', () => {
  it('keeps detail, download, and share actions visible and accessible', async () => {
    const onDetail = jest.fn();
    const onDownload = jest.fn();
    const onShare = jest.fn();
    const screen = await render(
      <ThemeProvider>
        <ReceiptArchiveCard
          entry={entry}
          language="tr"
          onDetail={onDetail}
          onDownload={onDownload}
          onShare={onShare}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Masa 4 · Pencere tarafı')).toBeTruthy();
    expect(screen.getByText('Düzeltme içeriyor')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Detay' }));
    await fireEvent.press(screen.getByRole('button', { name: 'PDF indir' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Paylaş' }));

    expect(onDetail).toHaveBeenCalledTimes(1);
    expect(onDownload).toHaveBeenCalledTimes(1);
    expect(onShare).toHaveBeenCalledTimes(1);
  });
});

const entry: ReceiptArchiveEntry = {
  branchName: 'Sofia',
  branchTimezone: 'Europe/Sofia',
  hasAdjustment: true,
  receipt: {
    id: 'receipt-1' as never,
    organizationId: 'organization-1' as never,
    branchId: 'branch-1' as never,
    tableSessionId: 'session-1' as never,
    checkId: 'check-1' as never,
    receiptNumber: 'WB1-20260726-000001',
    businessDate: '2026-07-26' as never,
    issuedAt: '2026-07-26T18:00:00.000Z',
    issuedBy: 'waiter-1' as never,
    totalMinor: 500,
    currencyCode: 'EUR' as never,
    snapshot: {
      schemaVersion: 1,
      organizationName: 'Orderia',
      branchName: 'Sofia',
      branchTimezone: 'Europe/Sofia',
      tableLabel: 'Masa 4',
      openedAt: '2026-07-26T17:00:00.000Z',
      issuedAt: '2026-07-26T18:00:00.000Z',
      waiterDisplayNames: ['Şule'],
      checks: [
        {
          checkId: 'check-1' as never,
          name: 'Pencere tarafı',
          items: [],
          totalMinor: 500,
        },
      ],
      payments: [
        {
          paymentId: 'payment-1' as never,
          method: 'card',
          amountMinor: 500,
          confirmedAt: '2026-07-26T18:00:00.000Z',
          createdByDisplayName: 'Şule',
        },
      ],
      totalMinor: 500,
      currencyCode: 'EUR' as never,
    },
    pdfStoragePath: 'organization-1/branch-1/2026-07-26/receipt-1.pdf',
    status: 'issued',
  },
};
