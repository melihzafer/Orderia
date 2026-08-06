import React, { useCallback, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { SnackbarProvider } from './src/design-system';
import { LocalizationProvider } from './src/i18n';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { AnalyticsProvider } from './src/contexts/AnalyticsContext';
import { QRMenuProvider } from './src/contexts/QRMenuContext';
import { initializeSampleData } from './src/utils/sampleData';
import { AuthProvider } from './src/contexts/AuthContext';
import { AuthGate } from './src/components/AuthGate';
import { OrderiaDataProvider } from './src/data/runtime';
import { PwaLifecycleBanner, PwaLifecycleBridge } from './src/features/pwa';
import { AppErrorBoundary } from './src/observability';
import { TelemetryIdentityBridge } from './src/observability/TelemetryIdentityBridge';

void SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Fraunces_600SemiBold,
  });

  // Font yüklenmesi başarısız olsa bile açılışı engelleme: festivalde POS'un
  // açılmaması, sistem fontuna düşmekten çok daha kötü.
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    // Initialize sample data on first launch
    setTimeout(() => {
      initializeSampleData();
    }, 1000);
  }, []);

  const onLayoutRootView = useCallback(() => {
    if (ready) {
      void SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <AppErrorBoundary>
      <GestureHandlerRootView onLayout={onLayoutRootView} style={{ flex: 1 }}>
        <SafeAreaProvider>
          <BottomSheetModalProvider>
            <LocalizationProvider>
              <ThemeProvider>
                {/*
                  Snackbar konağı gezinme ağacının dışında ve üstünde durur: geri alma
                  yüzeyi, onu doğuran ekran değişse bile ekranda kalmalı.
                */}
                <SnackbarProvider>
                  {/*
                    Kimlik kapısının üstünde: uygulama kabuğu, kullanıcı giriş
                    yapmadan önce de önbelleğe alınmalı.
                  */}
                  <PwaLifecycleBridge />
                  <AuthProvider>
                    <TelemetryIdentityBridge />
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
                </SnackbarProvider>
              </ThemeProvider>
            </LocalizationProvider>
          </BottomSheetModalProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}
