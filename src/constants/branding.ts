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
      accent: '#D946EF',
      accentSoft: '#FDF4FF',
      bg: '#F9FAFB',
      surface: '#FFFFFF',
      surfaceAlt: '#F3F4F6',
      border: '#E5E7EB',
      text: '#111827',
      textSubtle: '#6B7280',
      focus: '#6366F1',
      state: {
        pending: { bg: '#EDE9FE', text: '#6D28D9', border: '#C4B5FD', icon: '🕓' },
        delivered: { bg: '#D1FAE5', text: '#047857', border: '#6EE7B7', icon: '✅' },
        paid: { bg: '#E5E7EB', text: '#6B7280', border: '#D1D5DB', icon: '💰' }
      }
    },
    dark: {
      primary: '#6366F1',
      primaryHover: '#4F46E5',
      accent: '#E879F9',
      accentSoft: '#4A044E',
      bg: '#030712',
      surface: '#111827',
      surfaceAlt: '#1F2937',
      border: '#374151',
      text: '#F9FAFB',
      textSubtle: '#9CA3AF',
      focus: '#818CF8',
      state: {
        pending: { bg: '#4C1D95', text: '#C4B5FD', border: '#7C3AED', icon: '🕓' },
        delivered: { bg: '#064E3B', text: '#6EE7B7', border: '#10B981', icon: '✅' },
        paid: { bg: '#374151', text: '#9CA3AF', border: '#4B5563', icon: '💰' }
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
