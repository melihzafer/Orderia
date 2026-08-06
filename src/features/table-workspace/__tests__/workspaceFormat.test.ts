import type { DraftOrderLine } from '../orderCommands';
import { conflictNote, draftLineTotal, formatMoney, timeOnly } from '../workspaceFormat';

/**
 * Bu yardımcılar TableDetailScreen'in içinde 3.000 satırın arasında yaşarken
 * doğrudan test edilemiyorlardı. Ayrı bir modül olduklarına göre artık edilebilirler.
 */

/**
 * `draftLineTotal` yalnızca fiyat, adet ve seçili seçenekleri okur; testin
 * WorkspaceProduct'ın tamamını kurması gerekmiyor, bu yüzden sadece okunan
 * alanlar veriliyor ve tip tek noktada gevşetiliyor.
 */
function draftLine(product: ProductShape, quantity = 1, selectedOptionIds: string[] = []) {
  return {
    id: 'draft-1',
    quantity,
    selectedOptionIds,
    product,
  } as unknown as DraftOrderLine;
}

interface ProductShape {
  readonly priceMinor: number;
  readonly modifierGroups: readonly {
    readonly options: readonly { readonly id: string; readonly priceDeltaMinor: number }[];
  }[];
}

const plainTea: ProductShape = { priceMinor: 2500, modifierGroups: [] };

const coffeeWithExtras: ProductShape = {
  priceMinor: 4000,
  modifierGroups: [
    {
      options: [
        { id: 'extra-shot', priceDeltaMinor: 500 },
        { id: 'syrup', priceDeltaMinor: 300 },
      ],
    },
  ],
};

describe('draftLineTotal', () => {
  it('multiplies the base price by the quantity', () => {
    expect(draftLineTotal(draftLine(plainTea, 3))).toBe(7500);
  });

  it('counts only the modifiers the line actually selected', () => {
    // (4000 + 500) * 2 — seçilmeyen şurup toplama girmez.
    expect(draftLineTotal(draftLine(coffeeWithExtras, 2, ['extra-shot']))).toBe(9000);
  });

  it('treats a line with no selected options as bare product price', () => {
    expect(draftLineTotal(draftLine(coffeeWithExtras))).toBe(4000);
  });
});

describe('formatMoney', () => {
  it('renders minor units as major units in the selected locale', () => {
    const turkish = formatMoney(4250, 'TRY', 'tr');
    expect(turkish).toContain('42,50');

    const english = formatMoney(4250, 'EUR', 'en');
    expect(english).toContain('42.50');
    expect(english).toContain('€');
  });

  it('keeps zero readable rather than blank', () => {
    expect(formatMoney(0, 'EUR', 'en')).toContain('0.00');
  });
});

describe('timeOnly', () => {
  it('shows just the clock time, not the date', () => {
    const formatted = timeOnly('2026-07-26T12:30:00.000Z', 'en');
    expect(formatted).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe('conflictNote', () => {
  it('reads a trimmed note out of a conflict payload', () => {
    expect(conflictNote({ note: '  masa değişti  ' })).toBe('masa değişti');
  });

  it('ignores payloads that carry no usable note', () => {
    expect(conflictNote(undefined)).toBeUndefined();
    expect(conflictNote(null)).toBeUndefined();
    expect(conflictNote('note')).toBeUndefined();
    expect(conflictNote([{ note: 'x' }])).toBeUndefined();
    expect(conflictNote({ note: '   ' })).toBeUndefined();
    expect(conflictNote({ note: 42 })).toBeUndefined();
  });
});
