import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { LocalizationProvider } from './src/i18n';
import { initializeSampleData } from './src/utils/sampleData';

export default function App() {
  useEffect(() => {
    // Initialize sample data on first launch
    setTimeout(() => {
      initializeSampleData();
    }, 1000);
  }, []);

  return (
    <LocalizationProvider>
      <ThemeProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </ThemeProvider>
    </LocalizationProvider>
  );
}
