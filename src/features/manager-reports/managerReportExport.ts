import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { ManagerReport } from './managerReportGateway';

export function createManagerReportCsv(report: ManagerReport): string {
  const rows: readonly (readonly (number | string)[])[] = [
    [
      'waiter',
      'item_rows',
      'item_quantity',
      'contributed_revenue_minor',
      'payments_handled_minor',
      'payment_count',
      'tables_served',
      'cancellation_count',
      'cancellation_value_minor',
      'helped_tables',
      'observed_active_minutes',
    ],
    ...report.waiters.map((waiter) => [
      waiter.displayName,
      waiter.itemRows,
      waiter.itemQuantity,
      waiter.contributedRevenueMinor,
      waiter.paymentHandledMinor,
      waiter.paymentCount,
      waiter.tablesServed,
      waiter.cancellationCount,
      waiter.cancellationValueMinor,
      waiter.helpedTableCount,
      waiter.observedActiveMinutes,
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`;
}

export async function presentManagerReportCsv(report: ManagerReport): Promise<string | undefined> {
  const contents = createManagerReportCsv(report);
  const fileName = `orderia-${report.branchId}-${report.dateFrom}-${report.dateTo}.csv`;
  if (Platform.OS === 'web') {
    if (typeof document === 'undefined' || typeof URL === 'undefined') {
      throw new Error('Browser export is unavailable');
    }
    const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    return;
  }

  const directory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!directory) throw new Error('Device export storage is unavailable');
  const uri = `${directory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, contents, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is unavailable');
  await Sharing.shareAsync(uri, {
    dialogTitle: 'Orderia manager report',
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
  });
  return uri;
}

function csvCell(value: number | string): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
