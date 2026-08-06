export type ServiceColorMode = 'light' | 'dark';
export type ServiceLayoutMode = 'compact' | 'medium' | 'expanded';

export type ServiceStatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

export interface ServiceColorTokens {
  readonly primary: string;
  readonly primaryHover: string;
  readonly primaryContrast: string;
  readonly accent: string;
  readonly accentSoft: string;
  readonly bg: string;
  readonly surface: string;
  readonly surfaceAlt: string;
  readonly border: string;
  readonly borderLight: string;
  readonly text: string;
  readonly textSubtle: string;
  readonly textMuted: string;
  readonly focus: string;
  readonly secondary: string;
  readonly error: string;
  readonly success: string;
  readonly warning: string;
  readonly info: string;
  readonly overlay: string;
  readonly onSuccess: string;
  readonly onWarning: string;
  readonly onError: string;
  readonly onInfo: string;
  readonly state: {
    readonly pending: ServiceStateColor;
    readonly delivered: ServiceStateColor;
    readonly paid: ServiceStateColor;
    readonly cancelled: ServiceStateColor;
  };
}

interface ServiceStateColor {
  readonly bg: string;
  readonly text: string;
  readonly border: string;
  readonly icon: string;
}

export interface ServiceThemeTokens {
  readonly mode: ServiceColorMode;
  readonly colors: ServiceColorTokens;
  readonly space: typeof serviceSpace;
  readonly radius: typeof serviceRadius;
  readonly typography: typeof serviceTypography;
  readonly sizing: typeof serviceSizing;
  readonly motion: typeof serviceMotion;
  readonly elevation: typeof serviceElevation;
}

export const serviceSpace = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const serviceRadius = {
  small: 8,
  medium: 12,
  large: 16,
  full: 9999,
} as const;

/**
 * Inter taşır arayüz metnini, Fraunces ise başlık ve para gibi "display" yüzeyleri.
 * Android'de fontWeight özel fontlarda yok sayıldığı için her ağırlık ayrı aile adıdır;
 * fontWeight yine de iOS ve web için korunur.
 */
export const serviceFontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  display: 'Fraunces_600SemiBold',
} as const;

// Mutable tuple olarak tanımlı: React Native'in TextStyle['fontVariant'] tipi
// readonly dizi kabul etmiyor, `as const` bunu readonly'ye çevirirdi.
const tabularNumbers: ['tabular-nums'] = ['tabular-nums'];

export const serviceTypography = {
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
    fontFamily: serviceFontFamily.medium,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600' as const,
    fontFamily: serviceFontFamily.semibold,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
    fontFamily: serviceFontFamily.regular,
  },
  bodyStrong: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600' as const,
    fontFamily: serviceFontFamily.semibold,
    fontVariant: tabularNumbers,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as const,
    fontFamily: serviceFontFamily.semibold,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700' as const,
    fontFamily: serviceFontFamily.bold,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700' as const,
    fontFamily: serviceFontFamily.display,
  },
  money: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700' as const,
    fontFamily: serviceFontFamily.display,
    fontVariant: tabularNumbers,
  },
} as const;

export const serviceSizing = {
  minimumTarget: 48,
  primaryTarget: 56,
  /**
   * Tek elle, telaşla ve bazen eldivenle basılan asıl eylemler için.
   * Servis sırasında telefon tek elde tutuluyor ve baş parmak nişan almıyor;
   * ekranın en önemli düğmesi parmağın kabaca isabet ettiği boyutta olmalı.
   */
  heroTarget: 64,
  /** Filtre/sekme rozetleri: 44 çok küçüktü, Android'in 48dp tabanına çekildi. */
  chipTarget: 48,
  productTileMinimumHeight: 72,
  tableCardMinimumHeight: 124,
  bottomNavigationHeight: 64,
  expandedRailWidth: 240,
  collapsedRailWidth: 72,
  contentMaximumWidth: 1600,
} as const;

export const serviceBreakpoints = {
  compactMaximum: 599,
  mediumMaximum: 1023,
} as const;

export const serviceMotion = {
  press: 80,
  state: 160,
  panel: 240,
} as const;

export const serviceElevation = {
  none: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  // Neredeyse görünmez kart gölgesi: ayrımı hairline sınır taşır, gölge değil.
  card: {
    shadowColor: '#1B1712',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sticky: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  overlay: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
} as const;

/**
 * Sıcak, tek vurgulu (terracotta) açık tema. Festival gün ışığı için varsayılan.
 * Her renk çifti __tests__/tokens.test.ts içindeki 4.5:1 WCAG AA kapısından geçer.
 */
const lightColors: ServiceColorTokens = {
  primary: '#BE4A26',
  primaryHover: '#A63F1F',
  primaryContrast: '#FFFFFF',
  accent: '#A63F1F',
  accentSoft: '#FBEDE8',
  bg: '#F6F4EF',
  surface: '#FFFFFF',
  surfaceAlt: '#FBFAF6',
  border: '#E8E4DA',
  borderLight: '#F0EDE5',
  text: '#1B1712',
  textSubtle: '#57524A',
  textMuted: '#6E6959',
  focus: '#BE4A26',
  secondary: '#413C34',
  error: '#A6231B',
  success: '#2E7D4F',
  warning: '#8E6210',
  info: '#1A599B',
  overlay: 'rgba(27, 23, 18, 0.56)',
  onSuccess: '#FFFFFF',
  onWarning: '#FFFFFF',
  onError: '#FFFFFF',
  onInfo: '#FFFFFF',
  state: {
    pending: {
      bg: '#F7EEDC',
      text: '#8E6210',
      border: '#C9A24A',
      icon: 'time-outline',
    },
    delivered: {
      bg: '#E4F0E7',
      text: '#25623E',
      border: '#5E9E77',
      icon: 'checkmark-circle-outline',
    },
    paid: {
      bg: '#F8E9E3',
      text: '#A63F1F',
      border: '#D08A69',
      icon: 'card-outline',
    },
    cancelled: {
      bg: '#F9E5E3',
      text: '#A6231B',
      border: '#D2837C',
      icon: 'close-circle-outline',
    },
  },
};

/**
 * Akşam servisi için sıcak koyu tema. Dikkat: vurgu rengi (#DC6840) üstünde beyaz metin
 * yalnızca 3.44:1 verir — bu yüzden primaryContrast koyu mürekkeptir, beyaz değil.
 */
const darkColors: ServiceColorTokens = {
  primary: '#DC6840',
  primaryHover: '#E8815C',
  primaryContrast: '#2B1409',
  accent: '#E8815C',
  accentSoft: '#3A1C10',
  bg: '#151310',
  surface: '#1E1A15',
  surfaceAlt: '#242019',
  border: '#2C2820',
  borderLight: '#26221B',
  text: '#F4F1E9',
  textSubtle: '#B7B1A4',
  textMuted: '#8F8878',
  focus: '#E8815C',
  secondary: '#D8D2C6',
  error: '#F5A79B',
  success: '#7BC69B',
  warning: '#E0B45C',
  info: '#93B9E8',
  overlay: 'rgba(0, 0, 0, 0.72)',
  onSuccess: '#0E2E1C',
  onWarning: '#3A2A0C',
  onError: '#40100A',
  onInfo: '#10243E',
  state: {
    pending: {
      bg: '#3A2A0C',
      text: '#F0CE8A',
      border: '#8A6A22',
      icon: 'time-outline',
    },
    delivered: {
      bg: '#0E2E1C',
      text: '#9BD9B4',
      border: '#3C7A56',
      icon: 'checkmark-circle-outline',
    },
    paid: {
      bg: '#3B1A0C',
      text: '#F3B69B',
      border: '#8C4A2C',
      icon: 'card-outline',
    },
    cancelled: {
      bg: '#3E120C',
      text: '#F7BDB5',
      border: '#8E3830',
      icon: 'close-circle-outline',
    },
  },
};

export const serviceThemes: Readonly<Record<ServiceColorMode, ServiceThemeTokens>> = {
  light: {
    mode: 'light',
    colors: lightColors,
    space: serviceSpace,
    radius: serviceRadius,
    typography: serviceTypography,
    sizing: serviceSizing,
    motion: serviceMotion,
    elevation: serviceElevation,
  },
  dark: {
    mode: 'dark',
    colors: darkColors,
    space: serviceSpace,
    radius: serviceRadius,
    typography: serviceTypography,
    sizing: serviceSizing,
    motion: serviceMotion,
    elevation: serviceElevation,
  },
};
