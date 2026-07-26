import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useOrderiaData } from '../../data/runtime';
import { ServiceButton, ServiceStatusPill, ServiceSurface } from '../../design-system';
import { useLocalization } from '../../i18n';
import {
  PwaLifecycleSnapshot,
  getPwaLifecycleSnapshot,
  initializePwaLifecycle,
  requestPersistentStorage,
  requestPwaInstall,
  subscribePwaLifecycle,
} from './pwaLifecycle';

export function PwaStatusCard() {
  const { tokens } = useTheme();
  const { language } = useLocalization();
  const { lastSuccessfulSyncAt, sync } = useOrderiaData();
  const [state, setState] = useState<PwaLifecycleSnapshot>(getPwaLifecycleSnapshot);
  const copy = statusCopy(language);

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

  return (
    <ServiceSurface
      style={{ gap: tokens.space.md, marginBottom: tokens.space.md }}
      variant="raised"
    >
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: tokens.space.sm }}>
        <Ionicons color={tokens.colors.primary} name="phone-portrait-outline" size={24} />
        <View style={{ flex: 1 }}>
          <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
            {copy.title}
          </Text>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSubtle }]}>
            {state.installed ? copy.installedBody : copy.browserBody}
          </Text>
        </View>
        <ServiceStatusPill
          label={state.installed ? copy.installed : copy.browser}
          tone={state.installed ? 'success' : 'neutral'}
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs }}>
        <ServiceStatusPill
          label={state.storage === 'persistent' ? copy.persistentStorage : copy.bestEffortStorage}
          tone={state.storage === 'persistent' ? 'success' : 'warning'}
        />
        <ServiceStatusPill
          label={sync.pendingCount ? copy.pending(sync.pendingCount) : copy.synced}
          tone={sync.pendingCount ? 'warning' : 'success'}
        />
      </View>

      <Text style={[tokens.typography.caption, { color: tokens.colors.textMuted }]}>
        {lastSuccessfulSyncAt
          ? copy.lastSync(new Date(lastSuccessfulSyncAt).toLocaleString())
          : copy.noCloudSync}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm }}>
        {state.installAvailable ? (
          <ServiceButton
            icon="download-outline"
            label={copy.install}
            onPress={() => void requestPwaInstall()}
            variant="outline"
          />
        ) : null}
        {state.iosInstallGuidance ? (
          <Text style={[tokens.typography.body, { color: tokens.colors.textSubtle }]}>
            {copy.iosInstall}
          </Text>
        ) : null}
        {state.storage === 'best_effort' ? (
          <ServiceButton
            icon="shield-checkmark-outline"
            label={copy.protectStorage}
            onPress={() => void requestPersistentStorage()}
            variant="outline"
          />
        ) : null}
      </View>
    </ServiceSurface>
  );
}

function statusCopy(language: 'tr' | 'bg' | 'en') {
  if (language === 'tr') {
    return {
      title: 'PWA ve çevrimdışı veri',
      installed: 'Kurulu',
      browser: 'Tarayıcı',
      installedBody: 'Orderia bağımsız uygulama modunda çalışıyor.',
      browserBody: 'Orderia Safari veya tarayıcı sekmesinde çalışıyor.',
      persistentStorage: 'Kalıcı cihaz verisi',
      bestEffortStorage: 'Depolama korunmuyor',
      pending: (count: number) => `${count} işlem bekliyor`,
      synced: 'Cihaz kuyruğu temiz',
      lastSync: (value: string) => `Son başarılı bulut senkronu: ${value}`,
      noCloudSync: 'Bu cihazda henüz başarılı bulut senkronu yok.',
      install: 'Telefona kur',
      protectStorage: 'Depolamayı koru',
      iosInstall: 'Safari > Paylaş > Ana Ekrana Ekle ile kurabilirsin.',
    } as const;
  }
  if (language === 'bg') {
    return {
      title: 'PWA и офлайн данни',
      installed: 'Инсталирано',
      browser: 'Браузър',
      installedBody: 'Orderia работи като самостоятелно приложение.',
      browserBody: 'Orderia работи в Safari или в раздел на браузъра.',
      persistentStorage: 'Постоянни данни',
      bestEffortStorage: 'Данните не са защитени',
      pending: (count: number) => `${count} операции чакат`,
      synced: 'Опашката е празна',
      lastSync: (value: string) => `Последна успешна синхронизация: ${value}`,
      noCloudSync: 'На това устройство още няма успешна облачна синхронизация.',
      install: 'Инсталирай',
      protectStorage: 'Защити данните',
      iosInstall: 'В Safari: Споделяне > Добави към началния екран.',
    } as const;
  }
  return {
    title: 'PWA and offline data',
    installed: 'Installed',
    browser: 'Browser',
    installedBody: 'Orderia is running as a standalone app.',
    browserBody: 'Orderia is running in Safari or a browser tab.',
    persistentStorage: 'Persistent device data',
    bestEffortStorage: 'Storage not protected',
    pending: (count: number) => `${count} operations pending`,
    synced: 'Device queue is clear',
    lastSync: (value: string) => `Last successful cloud sync: ${value}`,
    noCloudSync: 'This device has not completed a cloud sync yet.',
    install: 'Install on phone',
    protectStorage: 'Protect storage',
    iosInstall: 'In Safari: Share > Add to Home Screen.',
  } as const;
}
