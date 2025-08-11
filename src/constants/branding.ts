import { OrderStatus } from '../types';

export const brand = {
  name: 'Orderia',
  tagline: 'Your Smart Order Pad',
  gradient: {
    primary: ['#4F46E5', '#D946EF'],
  },
  color: {
    light: {
      primary: '#4F46E5',
      primaryHover: '#4338CA',
      primaryContrast: '#FFFFFF',
      accent: '#D946EF',
      accentSoft: '#FDF4FF',
      bg: '#F9FAFB',
      surface: '#FFFFFF',
      surfaceAlt: '#F3F4F6',
      border: '#E5E7EB',
      borderLight: '#F3F4F6',
      text: '#111827',
      textSubtle: '#6B7280',
      textMuted: '#9CA3AF',
      focus: '#6366F1',
      secondary: '#6B7280',
      error: '#DC2626',
      success: '#10B981',
      warning: '#F59E0B',
      info: '#3B82F6',
      overlay: 'rgba(0, 0, 0, 0.5)',
      state: {
        pending: { bg: '#EDE9FE', text: '#6D28D9', border: '#C4B5FD', icon: '🕓' },
        delivered: { bg: '#D1FAE5', text: '#047857', border: '#6EE7B7', icon: '✅' },
        paid: { bg: '#E5E7EB', text: '#6B7280', border: '#D1D5DB', icon: '💰' },
        cancelled: { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA', icon: '❌' }
      }
    },
    dark: {
      primary: '#6366F1',
      primaryHover: '#4F46E5',
      primaryContrast: '#FFFFFF',
      accent: '#E879F9',
      accentSoft: '#4A044E',
      bg: '#030712',
      surface: '#111827',
      surfaceAlt: '#1F2937',
      border: '#374151',
      borderLight: '#1F2937',
      text: '#F9FAFB',
      textSubtle: '#9CA3AF',
      textMuted: '#6B7280',
      focus: '#818CF8',
      secondary: '#9CA3AF',
      error: '#F87171',
      success: '#34D399',
      warning: '#FBBF24',
      info: '#60A5FA',
      overlay: 'rgba(0, 0, 0, 0.7)',
      state: {
        pending: { bg: '#4C1D95', text: '#C4B5FD', border: '#7C3AED', icon: '🕓' },
        delivered: { bg: '#064E3B', text: '#6EE7B7', border: '#10B981', icon: '✅' },
        paid: { bg: '#374151', text: '#9CA3AF', border: '#4B5563', icon: '💰' },
        cancelled: { bg: '#7F1D1D', text: '#FCA5A5', border: '#F87171', icon: '❌' }
      }
    }
  }
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
};

export const elevation = {
  none: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
};

export const typography = {
  h1: { fontSize: 24, fontWeight: '600' as const },
  h2: { fontSize: 20, fontWeight: '600' as const },
  h3: { fontSize: 18, fontWeight: '500' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodySmall: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
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
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}
