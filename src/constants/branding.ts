import { OrderStatus } from '../types';
import {
  serviceElevation,
  serviceRadius,
  serviceSpace,
  serviceThemes,
  serviceTypography,
} from '../design-system/tokens';

export const brand = {
  name: 'Orderia',
  tagline: 'Your Smart Order Pad',
  gradient: {
    primary: [serviceThemes.light.colors.primary, serviceThemes.light.colors.accent],
  },
  color: {
    light: serviceThemes.light.colors,
    dark: serviceThemes.dark.colors,
  },
};

/**
 * @deprecated Shifted alias of serviceSpace — `spacing.md` here is 12, while
 * `serviceSpace.md` is 16. Import serviceSpace from design-system/tokens directly.
 */
export const spacing = {
  xs: serviceSpace.xxs,
  sm: serviceSpace.xs,
  md: serviceSpace.sm,
  lg: serviceSpace.md,
  xl: serviceSpace.lg,
};

export const radius = {
  sm: serviceRadius.small,
  md: serviceRadius.medium,
  lg: serviceRadius.large,
  full: serviceRadius.full,
};

export const elevation = {
  none: serviceElevation.none,
  sm: serviceElevation.none,
  md: serviceElevation.sticky,
  lg: serviceElevation.overlay,
  xl: serviceElevation.overlay,
};

export const typography = {
  h1: serviceTypography.title,
  h2: serviceTypography.sectionTitle,
  h3: serviceTypography.subtitle,
  body: serviceTypography.body,
  bodySmall: serviceTypography.label,
  caption: serviceTypography.caption,
};

export function getStatusConfig(status: OrderStatus, mode: 'light' | 'dark' = 'light') {
  return brand.color[mode].state[status];
}

// Deprecated: Use useLocalization().formatPrice instead
export function formatPrice(priceInCents: number): string {
  return `₺${(priceInCents / 100).toFixed(2)}`;
}

// Deprecated: Use useLocalization().formatDate instead
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('tr-TR');
}

// Deprecated: Use useLocalization().formatDateTime instead
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('tr-TR');
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

export function generateTableId(hallId: string, sequence: number): string {
  return `${hallId}-${sequence}`;
}

export function generateDateKey(date?: Date): string {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
