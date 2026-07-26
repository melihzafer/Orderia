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

export const serviceTypography = {
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' as const },
  subtitle: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  sectionTitle: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const },
  money: { fontSize: 32, lineHeight: 38, fontWeight: '700' as const },
} as const;

export const serviceSizing = {
  minimumTarget: 48,
  primaryTarget: 56,
  productTileMinimumHeight: 72,
  tableCardMinimumHeight: 104,
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

const lightColors: ServiceColorTokens = {
  primary: '#0F766E',
  primaryHover: '#115E59',
  primaryContrast: '#FFFFFF',
  accent: '#C2410C',
  accentSoft: '#FFF1E8',
  bg: '#F4F7F6',
  surface: '#FFFFFF',
  surfaceAlt: '#EAF0EE',
  border: '#D0D5DD',
  borderLight: '#EAECF0',
  text: '#101828',
  textSubtle: '#475467',
  textMuted: '#667085',
  focus: '#0F766E',
  secondary: '#344054',
  error: '#B42318',
  success: '#15803D',
  warning: '#B45309',
  info: '#175CD3',
  overlay: 'rgba(16, 24, 40, 0.56)',
  onSuccess: '#FFFFFF',
  onWarning: '#FFFFFF',
  onError: '#FFFFFF',
  onInfo: '#FFFFFF',
  state: {
    pending: {
      bg: '#FFF7E8',
      text: '#92400E',
      border: '#F59E0B',
      icon: 'time-outline',
    },
    delivered: {
      bg: '#ECFDF3',
      text: '#166534',
      border: '#22C55E',
      icon: 'checkmark-circle-outline',
    },
    paid: {
      bg: '#EFF8FF',
      text: '#175CD3',
      border: '#53B1FD',
      icon: 'card-outline',
    },
    cancelled: {
      bg: '#FEF3F2',
      text: '#B42318',
      border: '#FDA29B',
      icon: 'close-circle-outline',
    },
  },
};

const darkColors: ServiceColorTokens = {
  primary: '#2DD4BF',
  primaryHover: '#5EEAD4',
  primaryContrast: '#062D29',
  accent: '#FB923C',
  accentSoft: '#3B1604',
  bg: '#0B1114',
  surface: '#111A1F',
  surfaceAlt: '#182329',
  border: '#34433E',
  borderLight: '#24322D',
  text: '#F5F7F6',
  textSubtle: '#B4C0BC',
  textMuted: '#91A09B',
  focus: '#5EEAD4',
  secondary: '#D0D8D5',
  error: '#FDA29B',
  success: '#4ADE80',
  warning: '#FBBF24',
  info: '#84ADFF',
  overlay: 'rgba(0, 0, 0, 0.72)',
  onSuccess: '#052E16',
  onWarning: '#3B2300',
  onError: '#3B0A06',
  onInfo: '#102A56',
  state: {
    pending: {
      bg: '#3B2300',
      text: '#FDE68A',
      border: '#FBBF24',
      icon: 'time-outline',
    },
    delivered: {
      bg: '#052E16',
      text: '#86EFAC',
      border: '#4ADE80',
      icon: 'checkmark-circle-outline',
    },
    paid: {
      bg: '#102A56',
      text: '#B2CCFF',
      border: '#84ADFF',
      icon: 'card-outline',
    },
    cancelled: {
      bg: '#3B0A06',
      text: '#FECDCA',
      border: '#FDA29B',
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
