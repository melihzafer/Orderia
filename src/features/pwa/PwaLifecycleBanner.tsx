import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useOrderiaData } from '../../data/runtime';
import { ServiceButton } from '../../design-system';
import { useLocalization } from '../../i18n';
import {
  PwaLifecycleSnapshot,
  applyWaitingPwaUpdate,
  getPwaLifecycleSnapshot,
  initializePwaLifecycle,
  requestPwaInstall,
  subscribePwaLifecycle,
} from './pwaLifecycle';

export function PwaLifecycleBanner() {
  const { tokens } = useTheme();
  const { language } = useLocalization();
  const { sync } = useOrderiaData();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<PwaLifecycleSnapshot>(getPwaLifecycleSnapshot);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [updateDeferred, setUpdateDeferred] = useState(false);
  const copy = pwaCopy(language);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const disposeLifecycle = initializePwaLifecycle();
    const unsubscribe = subscribePwaLifecycle(setState);
    return () => {
      unsubscribe();
      disposeLifecycle();
    };
  }, []);

  if (Platform.OS !== 'web') return null;
  const showUpdate = state.updateReady && !updateDeferred;
  const showInstall =
    !showUpdate &&
    !installDismissed &&
    !state.installed &&
    (state.installAvailable || state.iosInstallGuidance);
  if (!showUpdate && !showInstall) return null;

  const updateBlocked = sync.pendingCount > 0 || state.criticalFlowCount > 0;
  const body = showUpdate
    ? updateBlocked
      ? copy.updateBlocked(sync.pendingCount, state.criticalFlowCount)
      : copy.updateReady
    : state.iosInstallGuidance
      ? copy.iosInstall
      : copy.installReady;

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        alignSelf: 'center',
        backgroundColor: tokens.colors.surface,
        borderColor: showUpdate ? tokens.colors.info : tokens.colors.primary,
        borderRadius: tokens.radius.large,
        borderWidth: 2,
        elevation: 12,
        gap: tokens.space.sm,
        left: tokens.space.sm,
        maxWidth: 720,
        padding: tokens.space.md,
        position: 'absolute',
        right: tokens.space.sm,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
        top: Math.max(insets.top, tokens.space.sm),
        zIndex: 1000,
      }}
    >
      <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: tokens.space.sm }}>
        <Ionicons
          color={showUpdate ? tokens.colors.info : tokens.colors.primary}
          name={showUpdate ? 'cloud-download-outline' : 'phone-portrait-outline'}
          size={24}
        />
        <View style={{ flex: 1 }}>
          <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
            {showUpdate ? copy.updateTitle : copy.installTitle}
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSubtle }]}>{body}</Text>
        </View>
        <Pressable
          accessibilityLabel={copy.later}
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => {
            if (showUpdate) setUpdateDeferred(true);
            else setInstallDismissed(true);
          }}
        >
          <Ionicons color={tokens.colors.textSubtle} name="close" size={24} />
        </Pressable>
      </View>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: tokens.space.sm }}>
        {showUpdate ? (
          <ServiceButton
            disabled={updateBlocked}
            icon="refresh"
            label={copy.updateNow}
            onPress={applyWaitingPwaUpdate}
            variant="primary"
          />
        ) : state.installAvailable ? (
          <ServiceButton
            icon="download-outline"
            label={copy.install}
            onPress={() => void requestPwaInstall()}
            variant="primary"
          />
        ) : null}
        <ServiceButton
          label={copy.later}
          onPress={() => {
            if (showUpdate) setUpdateDeferred(true);
            else setInstallDismissed(true);
          }}
          variant="ghost"
        />
      </View>
    </View>
  );
}

function pwaCopy(language: 'tr' | 'bg' | 'en') {
  if (language === 'tr') {
    return {
      installTitle: 'Orderia’yı telefona ekle',
      installReady: 'Daha hızlı açılış ve çevrimdışı servis için uygulama olarak kur.',
      iosInstall: 'Safari’de Paylaş düğmesine, ardından “Ana Ekrana Ekle”ye dokun.',
      install: 'Uygulamayı kur',
      updateTitle: 'Yeni sürüm hazır',
      updateReady: 'Veriler güvende. Uygulamayı şimdi yenileyebilirsin.',
      updateBlocked: (pending: number, critical: number) =>
        `${pending ? `${pending} işlem senkron bekliyor. ` : ''}${
          critical ? 'Açık ödeme adımı tamamlanmalı. ' : ''
        }Güncelleme güvenli zamana bırakıldı.`,
      updateNow: 'Şimdi yenile',
      later: 'Sonra',
    } as const;
  }
  if (language === 'bg') {
    return {
      installTitle: 'Добавете Orderia на телефона',
      installReady: 'Инсталирайте за по-бързо стартиране и офлайн обслужване.',
      iosInstall: 'В Safari докоснете Споделяне, после „Добави към началния екран“.',
      install: 'Инсталирай',
      updateTitle: 'Има нова версия',
      updateReady: 'Данните са защитени. Можете да обновите сега.',
      updateBlocked: (pending: number, critical: number) =>
        `${pending ? `${pending} операции чакат синхронизация. ` : ''}${
          critical ? 'Завършете отвореното плащане. ' : ''
        }Обновяването е отложено безопасно.`,
      updateNow: 'Обнови сега',
      later: 'По-късно',
    } as const;
  }
  return {
    installTitle: 'Add Orderia to your phone',
    installReady: 'Install for faster launches and offline service.',
    iosInstall: 'In Safari, tap Share and then “Add to Home Screen”.',
    install: 'Install app',
    updateTitle: 'A new version is ready',
    updateReady: 'Your data is safe. You can refresh now.',
    updateBlocked: (pending: number, critical: number) =>
      `${pending ? `${pending} operations are waiting to sync. ` : ''}${
        critical ? 'Finish the open payment step. ' : ''
      }The update is safely deferred.`,
    updateNow: 'Refresh now',
    later: 'Later',
  } as const;
}
