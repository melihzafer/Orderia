import { ReceiptArchiveFilters, ReceiptArchivePaymentMethod } from './receiptArchiveGateway';

export interface ReceiptArchiveFilterDraft {
  readonly query: string;
  readonly dateFrom: string;
  readonly dateTo: string;
  readonly timeFrom: string;
  readonly timeTo: string;
  readonly waiterQuery: string;
  readonly paymentMethod: ReceiptArchivePaymentMethod | 'all';
  readonly amountMin: string;
  readonly amountMax: string;
  readonly adjustment: 'all' | 'with' | 'without';
}

export function defaultReceiptArchiveFilters(
  branchTimezone: string,
  days = 7,
  now = new Date(),
): ReceiptArchiveFilterDraft {
  const dateTo = dateInTimeZone(now, branchTimezone);
  const start = new Date(`${dateTo}T12:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() - Math.max(0, days - 1));
  return {
    query: '',
    dateFrom: start.toISOString().slice(0, 10),
    dateTo,
    timeFrom: '',
    timeTo: '',
    waiterQuery: '',
    paymentMethod: 'all',
    amountMin: '',
    amountMax: '',
    adjustment: 'all',
  };
}

export function buildReceiptArchiveFilters(
  draft: ReceiptArchiveFilterDraft,
  currencyCode: string,
): ReceiptArchiveFilters {
  const dateFrom = optionalDate(draft.dateFrom, 'start');
  const dateTo = optionalDate(draft.dateTo, 'end');
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new Error('Start date must not be after end date');
  }
  const timeFrom = optionalTime(draft.timeFrom, 'start');
  const timeTo = optionalTime(draft.timeTo, 'end');
  const amountMinMinor = optionalMoney(draft.amountMin, currencyCode, 'minimum');
  const amountMaxMinor = optionalMoney(draft.amountMax, currencyCode, 'maximum');
  if (
    amountMinMinor !== undefined &&
    amountMaxMinor !== undefined &&
    amountMinMinor > amountMaxMinor
  ) {
    throw new Error('Minimum amount must not exceed maximum amount');
  }
  return {
    ...(clean(draft.query) ? { query: clean(draft.query) } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    ...(timeFrom ? { timeFrom } : {}),
    ...(timeTo ? { timeTo } : {}),
    ...(clean(draft.waiterQuery) ? { waiterQuery: clean(draft.waiterQuery) } : {}),
    ...(draft.paymentMethod === 'all' ? {} : { paymentMethod: draft.paymentMethod }),
    ...(amountMinMinor === undefined ? {} : { amountMinMinor }),
    ...(amountMaxMinor === undefined ? {} : { amountMaxMinor }),
    ...(draft.adjustment === 'all' ? {} : { hasAdjustment: draft.adjustment === 'with' }),
  };
}

export function activeReceiptFilterCount(draft: ReceiptArchiveFilterDraft): number {
  return [
    Boolean(draft.dateFrom || draft.dateTo),
    Boolean(draft.timeFrom || draft.timeTo),
    Boolean(clean(draft.waiterQuery)),
    draft.paymentMethod !== 'all',
    Boolean(draft.amountMin || draft.amountMax),
    draft.adjustment !== 'all',
  ].filter(Boolean).length;
}

export function withDateRange(
  draft: ReceiptArchiveFilterDraft,
  branchTimezone: string,
  days: number,
  now = new Date(),
): ReceiptArchiveFilterDraft {
  const range = defaultReceiptArchiveFilters(branchTimezone, days, now);
  return { ...draft, dateFrom: range.dateFrom, dateTo: range.dateTo };
}

function optionalDate(value: string, label: string): string | undefined {
  const normalized = clean(value);
  if (!normalized) return undefined;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(normalized) ||
    Number.isNaN(Date.parse(`${normalized}T00:00:00Z`))
  ) {
    throw new Error(`Invalid ${label} date`);
  }
  return normalized;
}

function optionalTime(value: string, label: string): string | undefined {
  const normalized = clean(value);
  if (!normalized) return undefined;
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(normalized)) {
    throw new Error(`Invalid ${label} time`);
  }
  return normalized;
}

function optionalMoney(value: string, currencyCode: string, label: string): number | undefined {
  const normalized = clean(value).replace(',', '.');
  if (!normalized) return undefined;
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) throw new Error(`Invalid ${label} amount`);
  const fractionDigits =
    new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currencyCode,
    }).resolvedOptions().maximumFractionDigits ?? 2;
  const [whole, fraction = ''] = normalized.split('.');
  if (fraction.length > fractionDigits) {
    throw new Error(`Invalid ${label} amount`);
  }
  const paddedFraction = fraction.padEnd(fractionDigits, '0');
  const minor = Number(whole) * 10 ** fractionDigits + Number(paddedFraction || 0);
  if (!Number.isSafeInteger(minor)) throw new Error(`Invalid ${label} amount`);
  return minor;
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

function clean(value: string): string {
  return value.trim();
}
