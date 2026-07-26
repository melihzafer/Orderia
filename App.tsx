import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { LocalizationProvider } from './src/i18n';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { AnalyticsProvider } from './src/contexts/AnalyticsContext';
import { QRMenuProvider } from './src/contexts/QRMenuContext';
import { initializeSampleData } from './src/utils/sampleData';
import { AuthProvider } from './src/contexts/AuthContext';
import { AuthGate } from './src/components/AuthGate';
import { OrderiaDataProvider } from './src/data/runtime';
import { PwaLifecycleBanner } from './src/features/pwa';

export default function App() {
  useEffect(() => {
    // Initialize sample data on first launch
    setTimeout(() => {
      initializeSampleData();
    }, 1000);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LocalizationProvider>
          <ThemeProvider>
            <AuthProvider>
              <OrderiaDataProvider>
                <AuthGate>
                  <NotificationProvider>
                    <AnalyticsProvider>
                      <QRMenuProvider>
                        <AppNavigator />
                        <PwaLifecycleBanner />
                        <StatusBar style="auto" />
                      </QRMenuProvider>
                    </AnalyticsProvider>
                  </NotificationProvider>
                </AuthGate>
              </OrderiaDataProvider>
            </AuthProvider>
          </ThemeProvider>
        </LocalizationProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
