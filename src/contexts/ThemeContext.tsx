import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { ServiceColorMode, ServiceThemeTokens, serviceThemes } from '../design-system/tokens';

type ColorMode = ServiceColorMode;

interface ThemeContextType {
  colorMode: ColorMode;
  colors: ServiceThemeTokens['colors'];
  tokens: ServiceThemeTokens;
  toggleColorMode: () => void;
  setColorMode: (mode: ColorMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [colorMode, setColorMode] = useState<ColorMode>(systemColorScheme || 'light');

  useEffect(() => {
    if (systemColorScheme) {
      setColorMode(systemColorScheme);
    }
  }, [systemColorScheme]);

  const tokens = serviceThemes[colorMode];
  const colors = tokens.colors;

  const toggleColorMode = () => {
    setColorMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const value: ThemeContextType = {
    colorMode,
    colors,
    tokens,
    toggleColorMode,
    setColorMode,
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
