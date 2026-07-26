import { contrastRatio } from '../contrast';
import { serviceThemes } from '../tokens';

describe.each(['light', 'dark'] as const)('%s service theme contrast', (mode) => {
  const colors = serviceThemes[mode].colors;

  it.each([
    ['primary action', colors.primaryContrast, colors.primary],
    ['accent action', colors.primaryContrast, colors.accent],
    ['body text', colors.text, colors.surface],
    ['secondary text', colors.textSubtle, colors.surface],
    ['secondary action', colors.surface, colors.secondary],
    ['destructive action', colors.onError, colors.error],
    ['pending state', colors.state.pending.text, colors.state.pending.bg],
    ['delivered state', colors.state.delivered.text, colors.state.delivered.bg],
    ['paid state', colors.state.paid.text, colors.state.paid.bg],
    ['cancelled state', colors.state.cancelled.text, colors.state.cancelled.bg],
  ])('%s meets WCAG AA for normal text', (_name, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('contrastRatio', () => {
  it('rejects values that cannot be audited reliably', () => {
    expect(() => contrastRatio('white', '#000000')).toThrow(/six-digit hex values/);
  });
});
