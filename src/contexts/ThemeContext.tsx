import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ServiceColorMode, ServiceThemeTokens, serviceThemes } from '../design-system/tokens';
import { useSettingsStore } from '../stores/settingsStore';

type ColorMode = ServiceColorMode;
export type ServiceDensity = 'comfortable' | 'compact';

interface ThemeContextType {
  colorMode: ColorMode;
  colors: ServiceThemeTokens['colors'];
  tokens: ServiceThemeTokens;
  /** Kullanıcı temayı elle seçtiyse true; bu durumda sistem teması artık takip edilmez. */
  followsSystem: boolean;
  toggleColorMode: () => void;
  setColorMode: (mode: ColorMode) => void;
  /** Elle yapılan seçimi unutup cihaz temasını takip etmeye geri döner. */
  useSystemColorMode: () => void;
  /** "Sıkışık liste" ayarından gelir; ServiceListRow gibi bileşenlerin varsayılan yoğunluğu. */
  density: ServiceDensity;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const COLOR_MODE_KEY = '@orderia_color_mode';

function isColorMode(value: string | null): value is ColorMode {
  return value === 'light' || value === 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();

  // Festival varsayılanı açık tema: açık havada gün ışığında okunabilirlik,
  // cihazın sistem tercihinden daha önemli.
  const [colorMode, setColorModeState] = useState<ColorMode>('light');
  const [followsSystem, setFollowsSystem] = useState(true);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(COLOR_MODE_KEY)
      .then((saved) => {
        if (cancelled) {
          return;
        }
        if (isColorMode(saved)) {
          setColorModeState(saved);
          setFollowsSystem(false);
        }
      })
      .catch((error) => {
        console.error('Error loading color mode:', error);
      })
      .finally(() => {
        if (!cancelled) {
          setPreferenceLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Sistem temasını yalnızca kullanıcı henüz elle bir seçim yapmadıysa takip et.
  // Kaydedilmiş tercih okunmadan önce sisteme uymak, seçimi bir an için ezerdi.
  useEffect(() => {
    if (!preferenceLoaded || !followsSystem || !systemColorScheme) {
      return;
    }
    setColorModeState(systemColorScheme);
  }, [followsSystem, preferenceLoaded, systemColorScheme]);

  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode);
    setFollowsSystem(false);
    AsyncStorage.setItem(COLOR_MODE_KEY, mode).catch((error) => {
      console.error('Error saving color mode:', error);
    });
  }, []);

  const toggleColorMode = useCallback(() => {
    setColorModeState((previous) => {
      const next: ColorMode = previous === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem(COLOR_MODE_KEY, next).catch((error) => {
        console.error('Error saving color mode:', error);
      });
      return next;
    });
    setFollowsSystem(false);
  }, []);

  const useSystemColorMode = useCallback(() => {
    setFollowsSystem(true);
    setColorModeState(systemColorScheme ?? 'light');
    AsyncStorage.removeItem(COLOR_MODE_KEY).catch((error) => {
      console.error('Error clearing color mode:', error);
    });
  }, [systemColorScheme]);

  const tokens = serviceThemes[colorMode];
  const colors = tokens.colors;
  const compactDensity = useSettingsStore((state) => state.compactDensity);
  const density: ServiceDensity = compactDensity ? 'compact' : 'comfortable';

  const value: ThemeContextType = {
    colorMode,
    colors,
    tokens,
    followsSystem,
    toggleColorMode,
    setColorMode,
    useSystemColorMode,
    density,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
