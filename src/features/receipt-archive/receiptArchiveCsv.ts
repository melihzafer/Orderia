import { ReceiptArchiveEntry } from './receiptArchiveGateway';

export function receiptArchiveCsv(entries: readonly ReceiptArchiveEntry[]): string {
  const headers = [
    'receipt_number',
    'issued_at',
    'table',
    'checks',
    'items',
    'total_minor',
    'currency',
    'payment_methods',
    'waiters',
    'status',
  ];
  const rows = entries.map(({ receipt }) => [
    receipt.receiptNumber,
    receipt.issuedAt,
    receipt.snapshot.tableLabel,
    receipt.snapshot.checks.map((check) => check.name).join(' | '),
    receipt.snapshot.checks
      .flatMap((check) => check.items.map((item) => `${item.quantity}x ${item.name}`))
      .join(' | '),
    receipt.totalMinor,
    receipt.currencyCode,
    [...new Set(receipt.snapshot.payments.map((payment) => payment.method))].join(' + '),
    receipt.snapshot.waiterDisplayNames.join(' | '),
    receipt.status,
  ]);
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
