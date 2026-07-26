declare const currencyCodeBrand: unique symbol;

export type CurrencyCode = string & {
  readonly [currencyCodeBrand]: 'CurrencyCode';
};

export interface Money {
  readonly amountMinor: number;
  readonly currencyCode: CurrencyCode;
}

export function toCurrencyCode(value: string): CurrencyCode {
  const normalized = value.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new Error(`Invalid ISO 4217 currency code: ${value}`);
  }

  return normalized as CurrencyCode;
}

export function assertMinorUnits(value: number, field = 'amountMinor'): number {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${field} must be a safe integer expressed in minor units`);
  }

  return value;
}

export function money(amountMinor: number, currencyCode: CurrencyCode): Money {
  return {
    amountMinor: assertMinorUnits(amountMinor),
    currencyCode,
  };
}

export function addMoney(...values: Money[]): Money {
  if (values.length === 0) {
    throw new Error('addMoney requires at least one value');
  }

  const currencyCode = values[0].currencyCode;
  const amountMinor = values.reduce((sum, value) => {
    assertSameCurrency(currencyCode, value.currencyCode);
    return assertMinorUnits(sum + value.amountMinor);
  }, 0);

  return money(amountMinor, currencyCode);
}

export function subtractMoney(minuend: Money, subtrahend: Money): Money {
  assertSameCurrency(minuend.currencyCode, subtrahend.currencyCode);
  return money(
    assertMinorUnits(minuend.amountMinor - subtrahend.amountMinor),
    minuend.currencyCode,
  );
}

export function multiplyMoney(value: Money, multiplier: number): Money {
  if (!Number.isSafeInteger(multiplier) || multiplier < 0) {
    throw new Error('Money multiplier must be a non-negative safe integer');
  }

  return money(assertMinorUnits(value.amountMinor * multiplier), value.currencyCode);
}

export function assertSameCurrency(left: CurrencyCode, right: CurrencyCode): void {
  if (left !== right) {
    throw new Error(`Currency mismatch: ${left} cannot be combined with ${right}`);
  }
}
