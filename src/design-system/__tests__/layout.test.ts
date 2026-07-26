import { adaptiveLayoutForWindow, layoutModeForWidth } from '../layout';

describe('layoutModeForWidth', () => {
  it.each([
    [320, 'compact'],
    [599, 'compact'],
    [600, 'medium'],
    [1023, 'medium'],
    [1024, 'expanded'],
    [1920, 'expanded'],
  ] as const)('maps %dpx to %s', (width, expected) => {
    expect(layoutModeForWidth(width)).toBe(expected);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid width %s', (width) => {
    expect(() => layoutModeForWidth(width)).toThrow(/positive finite/);
  });
});

describe('adaptiveLayoutForWindow', () => {
  it('keeps touch-oriented compact screens to two table columns', () => {
    expect(adaptiveLayoutForWindow(390, 844, 1)).toMatchObject({
      mode: 'compact',
      horizontalPadding: 16,
      tableColumns: 2,
    });
  });

  it('adds density progressively without shrinking targets', () => {
    expect(adaptiveLayoutForWindow(768, 1024, 1).tableColumns).toBe(3);
    expect(adaptiveLayoutForWindow(1440, 900, 1).tableColumns).toBe(4);
  });

  it('preserves window accessibility information for consumers', () => {
    expect(adaptiveLayoutForWindow(390, 844, 1.4)).toMatchObject({
      height: 844,
      fontScale: 1.4,
    });
  });
});
