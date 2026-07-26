export interface ManagerReportRange {
  readonly dateFrom: string;
  readonly dateTo: string;
}

export function managerReportRange(
  branchTimezone: string,
  days: number,
  now = new Date(),
): ManagerReportRange {
  const dateTo = dateInTimeZone(now, branchTimezone);
  const start = new Date(`${dateTo}T12:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() - Math.max(0, days - 1));
  return {
    dateFrom: start.toISOString().slice(0, 10),
    dateTo,
  };
}

export function assertManagerReportRange(range: ManagerReportRange): void {
  if (!isDate(range.dateFrom) || !isDate(range.dateTo)) {
    throw new Error('Report dates must use YYYY-MM-DD');
  }
  if (range.dateFrom > range.dateTo) throw new Error('Start date must not be after end date');
  const days =
    (Date.parse(`${range.dateTo}T00:00:00Z`) - Date.parse(`${range.dateFrom}T00:00:00Z`)) /
    86_400_000;
  if (days > 366) throw new Error('Report range cannot exceed 366 days');
}

function dateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
