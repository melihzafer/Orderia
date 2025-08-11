import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { LocalizationProvider } from './src/i18n';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { AnalyticsProvider } from './src/contexts/AnalyticsContext';
import { QRMenuProvider } from './src/contexts/QRMenuContext';
import { initializeSampleData } from './src/utils/sampleData';

export default function App() {
  useEffect(() => {
    // Initialize sample data on first launch
    setTimeout(() => {
      initializeSampleData();
    }, 1000);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LocalizationProvider>
        <ThemeProvider>
          <NotificationProvider>
            <AnalyticsProvider>
              <QRMenuProvider>
                <AppNavigator />
                <StatusBar style="auto" />
              </QRMenuProvider>
            </AnalyticsProvider>
          </NotificationProvider>
        </ThemeProvider>
      </LocalizationProvider>
    </GestureHandlerRootView>
  );
}
