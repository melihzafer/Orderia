import { Receipt } from './entities';
import { assertMinorUnits, assertSameCurrency } from './money';

export function assertValidReceipt(receipt: Receipt): void {
  assertMinorUnits(receipt.totalMinor, 'receipt totalMinor');
  assertMinorUnits(receipt.snapshot.totalMinor, 'receipt snapshot totalMinor');
  assertSameCurrency(receipt.currencyCode, receipt.snapshot.currencyCode);

  if (receipt.totalMinor !== receipt.snapshot.totalMinor) {
    throw new Error('Receipt total does not match its immutable snapshot total');
  }

  const checkTotal = receipt.snapshot.checks.reduce(
    (total, check) => assertMinorUnits(total + check.totalMinor),
    0,
  );

  if (checkTotal !== receipt.totalMinor) {
    throw new Error('Receipt check totals do not reconcile with the receipt total');
  }
}

export function assertIssuedReceiptUnchanged(original: Receipt, candidate: Receipt): void {
  if (original.status !== 'issued') {
    throw new Error('Receipt immutability check requires an issued original receipt');
  }

  if (stableSerialize(original) !== stableSerialize(candidate)) {
    throw new Error('Issued receipts are immutable; create an adjustment receipt');
  }
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}
