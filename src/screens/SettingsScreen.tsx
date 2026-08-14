import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import uuid from 'react-native-uuid';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { accessibleBranches } from '../contexts/authTypes';
import { useTheme } from '../contexts/ThemeContext';
import {
  haptic,
  ServiceAvatar,
  ServiceButton,
  ServiceChoiceCard,
  ServiceConfirmSheet,
  ServiceListRow,
  ServiceRowGroup,
  ServiceSectionHeader,
  ServiceSegmented,
  ServiceStatusPill,
  ServiceSurface,
  ServiceTextField,
  useAdaptiveLayout,
  useSnackbar,
} from '../design-system';
import { operationsOrder, settingsCopy } from '../features/app-settings';
import { LegacyMigrationCard } from '../features/legacy-migration/LegacyMigrationCard';
import {
  LegacyMigrationGateway,
  prepareLegacyMigration,
  type LegacyMigrationSnapshot,
} from '../features/legacy-migration';
import { PwaStatusCard } from '../features/pwa';
import { Currency, Language, useLocalization } from '../i18n';
import { DeviceId, MutationId, toDomainId } from '../domain';
import type { RootStackParamList } from '../navigation/routes';
import { brand } from '../constants/branding';
import { getSupabaseClient } from '../services/supabase';
import { useHistoryStore } from '../stores/historyStore';
import { useLayoutStore } from '../stores/layoutStore';
import { useMenuStore } from '../stores/menuStore';
import { useOrderStore } from '../stores/orderStore';
import { useOrderiaData } from '../data/runtime';
import {
  createOrderiaBackup,
  downloadTextFile,
  type OrderiaBackup,
  parseOrderiaBackup,
} from '../utils/backupUtils';
import { resetLocalOperationalData } from '../utils/localDataReset';
import {
  quickActionIds,
  useSettingsStore,
  type AppearancePreferences,
  type OperationsPreferences,
  type ServiceMode,
} from '../stores/settingsStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const languageOptions: readonly { value: Language; label: string }[] = [
  { value: 'tr', label: '🇹🇷 Türkçe' },
  { value: 'bg', label: '🇧🇬 Български' },
  { value: 'en', label: '🇬🇧 English' },
];

const currencyOptions: readonly { value: Currency; label: string }[] = [
  { value: 'TRY', label: '₺ TRY' },
  { value: 'BGN', label: 'лв BGN' },
  { value: 'EUR', label: '€ EUR' },
];

export default function SettingsScreen() {
  const {
    colorMode,
    followsSystem,
    setColorMode,
    tokens,
    useSystemColorMode: applySystemColorMode,
  } = useTheme();
  const { t, language, currency, setLanguage, setCurrency, formatDateTime } = useLocalization();
  const auth = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const layout = useAdaptiveLayout();
  const copy = useMemo(() => settingsCopy(language), [language]);
  const data = useOrderiaData();
  const {
    mode,
    scope,
    refresh,
    setManagerActionPin,
    sync,
    localOnlySyncMode,
    setLocalOnlySyncMode,
    lastSuccessfulSyncAt,
  } = data;
  const cloudClient = getSupabaseClient();
  const legacyMigrationGateway = useMemo(
    () => (cloudClient ? new LegacyMigrationGateway(cloudClient) : null),
    [cloudClient],
  );

  const layoutStore = useLayoutStore();
  const menuStore = useMenuStore();
  const orderStore = useOrderStore();
  const historyStore = useHistoryStore();

  const settings = useSettingsStore();
  const workflowDescriptionsRevealed = settings.revealedSectionDescriptions.includes('workflow');
  const appearanceDescriptionsRevealed =
    settings.revealedSectionDescriptions.includes('appearance');
  const managementDescriptionsRevealed =
    settings.revealedSectionDescriptions.includes('management');
  const dataDescriptionsRevealed = settings.revealedSectionDescriptions.includes('data');
  const [legacyMigrationVisible, setLegacyMigrationVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [managerPin, setManagerPin] = useState('');
  const [savingManagerPin, setSavingManagerPin] = useState(false);
  const [syncingNow, setSyncingNow] = useState(false);
  // Onay bekleyen yıkıcı işlemler: yedek geri yükleme ve yerel veri sıfırlama.
  const [pendingImport, setPendingImport] = useState<OrderiaBackup>();
  const [pendingCatalogReplace, setPendingCatalogReplace] = useState<LegacyMigrationSnapshot>();
  const [applyingCatalogReplace, setApplyingCatalogReplace] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const { show } = useSnackbar();

  const isManager = auth.status === 'unconfigured' || auth.activeMembership?.role === 'manager';
  const branches = auth.workspace ? accessibleBranches(auth.workspace) : [];
  const profileName = auth.workspace?.profile.display_name ?? copy.deviceOnlyProfile;
  const roleLabel = auth.activeMembership?.role ?? (isManager ? t.managerRole : undefined);

  const handleDataExport = async () => {
    setExporting(true);
    try {
      const jsonString = JSON.stringify(
        createOrderiaBackup({
          halls: layoutStore.halls,
          tables: layoutStore.tables,
          categories: menuStore.categories,
          menuItems: menuStore.menuItems,
          openTickets: orderStore.openTickets,
          dailyHistory: historyStore.dailyHistory,
          settings: {
            language,
            currency,
            colorMode,
            serviceMode: settings.serviceMode,
          },
        }),
        null,
        2,
      );
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `orderia-backup-${timestamp}.json`;

      if (Platform.OS === 'web' && downloadTextFile(filename, jsonString, 'application/json')) {
        haptic('success');
        show({ message: t.dataExported, tone: 'success' });
        return;
      }

      if (!FileSystem.documentDirectory) throw new Error(t.exportFailed);
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, jsonString);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: t.dataExport,
        });
      }

      haptic('success');
      show({ message: t.dataExported, tone: 'success' });
    } catch {
      haptic('error');
      show({ message: t.exportFailed, tone: 'error' });
    } finally {
      setExporting(false);
    }
  };

  /**
   * Dosya seçme ve doğrulama burada biter; veriyi yazma işi onaydan sonra
   * `applyImport`'a geçer. Eskiden onay web'de `window.confirm` ile alınıyordu:
   * kurulu bir PWA'nın ortasında tarayıcı diyaloğu açılıyor ve kullanıcının
   * bütün servis verisini değiştirecek an ürünün dışında geçiyordu.
   */
  const handleDataImport = async () => {
    setImporting(true);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: 'application/json',
      });
      if (picked.canceled || !picked.assets[0]) return;

      const asset = picked.assets[0];
      const raw = asset.file
        ? await asset.file.text()
        : await FileSystem.readAsStringAsync(asset.uri);

      if (mode === 'cloud') {
        if (auth.activeMembership?.role !== 'manager') {
          show({ message: copy.catalogReplaceManagerRequired, tone: 'error' });
          return;
        }
        let prepared;
        try {
          prepared = prepareLegacyMigration(JSON.parse(raw));
        } catch (error) {
          show({
            message: error instanceof Error ? error.message : copy.catalogReplaceInvalid,
            tone: 'error',
          });
          return;
        }
        if (prepared.snapshot.openTickets.length > 0 || prepared.snapshot.historyDays.length > 0) {
          show({ message: copy.catalogReplaceTicketsUnsupported, tone: 'error' });
          return;
        }
        if (prepared.report.blockingIssueCount > 0) {
          show({
            message: prepared.report.issues[0]?.message ?? copy.catalogReplaceInvalid,
            tone: 'error',
          });
          return;
        }
        setPendingCatalogReplace(prepared.snapshot);
        return;
      }

      setPendingImport(parseOrderiaBackup(raw));
    } catch (error) {
      show({ message: error instanceof Error ? error.message : t.importFailed, tone: 'error' });
    } finally {
      setImporting(false);
    }
  };

  const applyCatalogReplace = async (snapshot: LegacyMigrationSnapshot) => {
    setPendingCatalogReplace(undefined);
    if (!legacyMigrationGateway || !scope || !auth.currentDeviceId) {
      haptic('error');
      show({ message: t.workspaceUnavailable, tone: 'error' });
      return;
    }
    setApplyingCatalogReplace(true);
    try {
      const result = await legacyMigrationGateway.replaceCatalog(
        scope,
        toDomainId<DeviceId>(auth.currentDeviceId),
        snapshot,
      );
      await refresh().catch(() => undefined);
      haptic('success');
      show({ message: copy.catalogReplaceSuccess(result.counts), tone: 'success' });
    } catch (error) {
      haptic('error');
      show({ message: error instanceof Error ? error.message : t.importFailed, tone: 'error' });
    } finally {
      setApplyingCatalogReplace(false);
    }
  };

  const applyImport = (backup: OrderiaBackup) => {
    setPendingImport(undefined);
    try {
      layoutStore.replaceData({
        halls: [...backup.data.halls],
        tables: [...backup.data.tables],
      });
      menuStore.replaceData({
        categories: [...backup.data.categories],
        menuItems: [...backup.data.menuItems],
      });
      orderStore.replaceOpenTickets({ ...backup.data.openTickets });
      historyStore.replaceHistory({ ...backup.data.dailyHistory });
      const importedSettings = backup.data.settings;
      if (
        importedSettings?.language === 'tr' ||
        importedSettings?.language === 'bg' ||
        importedSettings?.language === 'en'
      ) {
        setLanguage(importedSettings.language);
      }
      if (
        importedSettings?.currency === 'TRY' ||
        importedSettings?.currency === 'BGN' ||
        importedSettings?.currency === 'EUR'
      ) {
        setCurrency(importedSettings.currency);
      }
      if (importedSettings?.colorMode === 'light' || importedSettings?.colorMode === 'dark') {
        setColorMode(importedSettings.colorMode);
      }
      if (
        importedSettings?.serviceMode === 'restaurant' ||
        importedSettings?.serviceMode === 'festival'
      ) {
        settings.setServiceMode(importedSettings.serviceMode);
      }
      haptic('success');
      show({ message: t.dataImported, tone: 'success' });
    } catch (error) {
      haptic('error');
      show({ message: error instanceof Error ? error.message : t.importFailed, tone: 'error' });
    }
  };

  const applyLocalReset = () => {
    setResetPending(false);
    resetLocalOperationalData();
    haptic('success');
    show({ message: copy.resetLocalDataDone, tone: 'success' });
  };

  const handleManualSync = async () => {
    setSyncingNow(true);
    try {
      await refresh();
      haptic('success');
      show({ message: copy.syncNowSuccess, tone: 'success' });
    } catch {
      haptic('error');
      show({ message: copy.syncNowFailed, tone: 'error' });
    } finally {
      setSyncingNow(false);
    }
  };

  const handleManagerPinSave = async () => {
    if (mode !== 'cloud' || !auth.currentDeviceId || !/^[0-9]{4}([0-9]{2})?$/.test(managerPin)) {
      haptic('warning');
      show({ message: copy.managerPinFailed, tone: 'warning' });
      return;
    }
    setSavingManagerPin(true);
    try {
      await setManagerActionPin(
        toDomainId<DeviceId>(auth.currentDeviceId),
        toDomainId<MutationId>(String(uuid.v4())),
        managerPin,
      );
      setManagerPin('');
      haptic('success');
      show({ message: copy.managerPinSaved, tone: 'success' });
    } catch {
      haptic('error');
      show({ message: copy.managerPinFailed, tone: 'error' });
    } finally {
      setSavingManagerPin(false);
    }
  };

  const setOperation = (flag: keyof OperationsPreferences, value: boolean) =>
    settings.setOperationsFlag(flag, value);
  const setAppearance = (flag: keyof AppearancePreferences, value: boolean) =>
    settings.setAppearanceFlag(flag, value);

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={{ backgroundColor: tokens.colors.bg, flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{
          alignSelf: 'center',
          maxWidth: tokens.sizing.contentMaximumWidth,
          paddingBottom: tokens.space.xxxl,
          paddingHorizontal: layout.horizontalPadding,
          paddingTop: tokens.space.md,
          width: '100%',
        }}
        style={{ flex: 1 }}
      >
        <ProfileHero
          branchName={auth.activeBranch?.name}
          hint={auth.workspace ? undefined : copy.deviceOnlyHint}
          modeLabel={copy.modeSummary(settings.serviceMode)}
          name={profileName}
          organizationName={auth.activeOrganization?.name}
          role={roleLabel}
        />

        {branches.length > 1 ? (
          <>
            <ServiceSectionHeader title={copy.switchBranch} />
            <ServiceRowGroup>
              {branches.map((branch, index) => (
                <ServiceListRow
                  accessory="check"
                  compact={settings.compactDensity}
                  icon="business-outline"
                  key={branch.id}
                  last={index === branches.length - 1}
                  onPress={() => {
                    void auth.switchBranch(branch.id);
                  }}
                  selected={branch.id === auth.activeBranch?.id}
                  title={branch.name}
                />
              ))}
            </ServiceRowGroup>
          </>
        ) : null}

        {auth.activeMembership?.role === 'manager' && mode === 'cloud' ? (
          <ServiceSurface style={{ gap: tokens.space.sm, marginTop: tokens.space.sm }}>
            <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
              {copy.managerPin}
            </Text>
            <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
              {copy.managerPinBody}
            </Text>
            <ServiceTextField
              keyboardType="number-pad"
              label={copy.managerPin}
              maxLength={6}
              onChangeText={setManagerPin}
              placeholder={copy.managerPinPlaceholder}
              secureTextEntry
              value={managerPin}
            />
            <ServiceButton
              disabled={!/^[0-9]{4}([0-9]{2})?$/.test(managerPin)}
              icon="key-outline"
              label={copy.saveManagerPin}
              loading={savingManagerPin}
              onPress={() => void handleManagerPinSave()}
              variant="outline"
            />
          </ServiceSurface>
        ) : null}

        {/* Servis modu — festival ile restoranı ayıran tek anahtar. */}
        <ServiceSectionHeader caption={copy.serviceModeCaption} title={copy.serviceModeSection} />
        <View style={{ flexDirection: 'row', gap: tokens.space.xs }}>
          <ServiceChoiceCard
            description={copy.restaurantModeBody}
            icon="restaurant-outline"
            onPress={() => settings.setServiceMode('restaurant' satisfies ServiceMode)}
            selected={settings.serviceMode === 'restaurant'}
            title={copy.restaurantMode}
          />
          <ServiceChoiceCard
            description={copy.festivalModeBody}
            icon="bonfire-outline"
            onPress={() => settings.setServiceMode('festival' satisfies ServiceMode)}
            selected={settings.serviceMode === 'festival'}
            title={copy.festivalMode}
          />
        </View>
        <Text
          style={[
            tokens.typography.caption,
            {
              color: tokens.colors.textSubtle,
              marginTop: tokens.space.xs,
              paddingHorizontal: tokens.space.xxs,
            },
          ]}
        >
          {copy.modeIsAPreset}
        </Text>

        {/* Servis akışı — moddan bağımsız tek tek açılabilen yetenekler. */}
        <ServiceSectionHeader
          actions={[
            {
              label: workflowDescriptionsRevealed ? t.hideDescriptions : t.showDescriptions,
              onPress: () => settings.toggleSectionDescriptions('workflow'),
            },
            { label: copy.resetToModeDefaults, onPress: settings.resetToModeDefaults },
          ]}
          caption={copy.workflowCaption}
          title={copy.workflowSection}
        />
        <ServiceRowGroup>
          {operationsOrder.map((flag, index) => {
            const entry = copy.operations[flag];
            return (
              <ServiceListRow
                accessory="switch"
                compact={settings.compactDensity}
                icon={entry.icon}
                key={flag}
                last={index === operationsOrder.length - 1}
                onValueChange={(next) => setOperation(flag, next)}
                showSubtitle={workflowDescriptionsRevealed}
                subtitle={entry.body}
                switchValue={settings[flag]}
                title={entry.title}
              />
            );
          })}
        </ServiceRowGroup>

        {/* Ana ekran kısayolları */}
        <ServiceSectionHeader caption={copy.quickActionsCaption} title={copy.quickActionsSection} />
        <ServiceRowGroup>
          {quickActionIds.map((id, index) => (
            <ServiceListRow
              accessory="switch"
              compact={settings.compactDensity}
              icon={copy.quickActions[id].icon}
              key={id}
              last={index === quickActionIds.length - 1}
              onValueChange={() => settings.toggleQuickAction(id)}
              switchValue={settings.quickActions.includes(id)}
              title={copy.quickActions[id].label}
            />
          ))}
        </ServiceRowGroup>

        {/* Görünüm */}
        <ServiceSectionHeader
          action={{
            label: appearanceDescriptionsRevealed ? t.hideDescriptions : t.showDescriptions,
            onPress: () => settings.toggleSectionDescriptions('appearance'),
          }}
          caption={copy.appearanceCaption}
          title={copy.appearanceSection}
        />
        <ServiceRowGroup>
          <ServiceListRow
            accessory="switch"
            compact={settings.compactDensity}
            disabled={followsSystem}
            icon={colorMode === 'dark' ? 'moon-outline' : 'sunny-outline'}
            onValueChange={(next) => setColorMode(next ? 'dark' : 'light')}
            showSubtitle={followsSystem || appearanceDescriptionsRevealed}
            subtitle={followsSystem ? copy.darkModeFollowsSystemBody : copy.darkModeBody}
            switchValue={colorMode === 'dark'}
            title={copy.darkMode}
          />
          <ServiceListRow
            accessory="switch"
            compact={settings.compactDensity}
            icon="phone-portrait-outline"
            onValueChange={(next) => {
              if (next) {
                applySystemColorMode();
              } else {
                setColorMode(colorMode);
              }
            }}
            showSubtitle={appearanceDescriptionsRevealed}
            subtitle={copy.followSystemThemeBody}
            switchValue={followsSystem}
            title={copy.followSystemTheme}
          />
          <ServiceListRow
            accessory="switch"
            compact={settings.compactDensity}
            icon="list-outline"
            onValueChange={(next) => setAppearance('compactDensity', next)}
            showSubtitle={appearanceDescriptionsRevealed}
            subtitle={copy.compactDensityBody}
            switchValue={settings.compactDensity}
            title={copy.compactDensity}
          />
          <ServiceListRow
            accessory="switch"
            compact={settings.compactDensity}
            icon="image-outline"
            onValueChange={(next) => setAppearance('showItemPhotos', next)}
            showSubtitle={appearanceDescriptionsRevealed}
            subtitle={copy.showItemPhotosBody}
            switchValue={settings.showItemPhotos}
            title={copy.showItemPhotos}
          />
          <ServiceListRow
            accessory="switch"
            compact={settings.compactDensity}
            icon="camera-outline"
            last
            onValueChange={(next) => setAppearance('allowPhotoUpload', next)}
            showSubtitle={appearanceDescriptionsRevealed}
            subtitle={copy.allowPhotoUploadBody}
            switchValue={settings.allowPhotoUpload}
            title={copy.allowPhotoUpload}
          />
        </ServiceRowGroup>

        <ServiceSurface style={{ marginTop: tokens.space.sm }}>
          <Text
            style={[
              tokens.typography.caption,
              { color: tokens.colors.textMuted, marginBottom: tokens.space.xs },
            ]}
          >
            {copy.languageLabel}
          </Text>
          <ServiceSegmented
            fill
            label={copy.languageLabel}
            onChange={setLanguage}
            options={languageOptions}
            value={language}
          />
          <Text
            style={[
              tokens.typography.caption,
              {
                color: tokens.colors.textMuted,
                marginBottom: tokens.space.xs,
                marginTop: tokens.space.md,
              },
            ]}
          >
            {copy.currencyLabel}
          </Text>
          <ServiceSegmented
            fill
            label={copy.currencyLabel}
            onChange={setCurrency}
            options={currencyOptions}
            value={currency}
          />
        </ServiceSurface>

        {/* Yönetim */}
        {isManager ? (
          <>
            <ServiceSectionHeader
              action={{
                label: managementDescriptionsRevealed ? t.hideDescriptions : t.showDescriptions,
                onPress: () => settings.toggleSectionDescriptions('management'),
              }}
              caption={copy.managementCaption}
              title={copy.managementSection}
            />
            <ServiceRowGroup>
              <ServiceListRow
                accessory="chevron"
                compact={settings.compactDensity}
                icon="book-outline"
                onPress={() => navigation.navigate('MainTabs', { screen: 'Menu' })}
                showSubtitle={managementDescriptionsRevealed}
                subtitle={copy.menuManagementBody}
                title={copy.menuManagement}
              />
              <ServiceListRow
                accessory="chevron"
                compact={settings.compactDensity}
                icon="stats-chart-outline"
                onPress={() => navigation.navigate('Analytics')}
                showSubtitle={managementDescriptionsRevealed}
                subtitle={copy.reportsBody}
                title={copy.reports}
              />
              {auth.activeMembership?.role === 'manager' ? (
                <>
                  <ServiceListRow
                    accessory="chevron"
                    compact={settings.compactDensity}
                    icon="phone-portrait-outline"
                    onPress={() => navigation.navigate('Devices')}
                    showSubtitle={managementDescriptionsRevealed}
                    subtitle={copy.devicesBody}
                    title={copy.devices}
                  />
                  <ServiceListRow
                    accessory="chevron"
                    compact={settings.compactDensity}
                    icon="people-outline"
                    onPress={() => navigation.navigate('Approvals')}
                    showSubtitle={managementDescriptionsRevealed}
                    subtitle={copy.approvalsBody}
                    title={t.approvalsTitle}
                  />
                  <ServiceListRow
                    accessory="chevron"
                    compact={settings.compactDensity}
                    icon="close-circle-outline"
                    onPress={() => navigation.navigate('CancellationReasons')}
                    showSubtitle={managementDescriptionsRevealed}
                    subtitle={copy.cancellationReasonsBody}
                    title={copy.cancellationReasons}
                  />
                  {auth.activeBranch?.restaurant_code ? (
                    <ServiceListRow
                      accessory="value"
                      compact={settings.compactDensity}
                      icon="key-outline"
                      last
                      showSubtitle={managementDescriptionsRevealed}
                      subtitle={copy.restaurantCodeBody}
                      title={t.restaurantCodeLabel}
                      value={auth.activeBranch.restaurant_code}
                    />
                  ) : null}
                </>
              ) : null}
            </ServiceRowGroup>
          </>
        ) : null}

        {/* Senkronizasyon */}
        {mode === 'cloud' ? (
          <>
            <ServiceSectionHeader caption={copy.syncCaption} title={copy.syncSection} />
            <ServiceRowGroup>
              <ServiceListRow
                accessory="switch"
                compact={settings.compactDensity}
                icon="cloud-offline-outline"
                onValueChange={(next) => {
                  void setLocalOnlySyncMode(next);
                }}
                showSubtitle
                subtitle={copy.localOnlySyncModeBody}
                switchValue={localOnlySyncMode}
                title={copy.localOnlySyncMode}
              />
              <ServiceListRow
                accessory="value"
                compact={settings.compactDensity}
                disabled={syncingNow || !sync.online}
                icon="sync-outline"
                last
                onPress={() => {
                  void handleManualSync();
                }}
                showSubtitle
                subtitle={
                  syncingNow
                    ? copy.syncNowRunning
                    : !sync.online
                      ? copy.syncOffline
                      : sync.pendingCount > 0
                        ? copy.syncPendingCount(sync.pendingCount)
                        : lastSuccessfulSyncAt
                          ? copy.syncLastSynced(formatDateTime(new Date(lastSuccessfulSyncAt).getTime()))
                          : copy.syncNeverSynced
                }
                title={copy.syncNow}
              />
            </ServiceRowGroup>
          </>
        ) : null}

        {/* Veri ve yedek */}
        <ServiceSectionHeader
          action={{
            label: dataDescriptionsRevealed ? t.hideDescriptions : t.showDescriptions,
            onPress: () => settings.toggleSectionDescriptions('data'),
          }}
          caption={copy.dataCaption}
          title={copy.dataSection}
        />
        <PwaStatusCard />
        <ServiceRowGroup style={{ marginTop: tokens.space.sm }}>
          <ServiceListRow
            accessory="chevron"
            compact={settings.compactDensity}
            disabled={exporting}
            icon="cloud-download-outline"
            onPress={() => {
              void handleDataExport();
            }}
            showSubtitle={dataDescriptionsRevealed}
            subtitle={copy.exportBackupBody}
            title={copy.exportBackup}
          />
          <ServiceListRow
            accessory="chevron"
            compact={settings.compactDensity}
            disabled={importing || applyingCatalogReplace}
            icon="cloud-upload-outline"
            onPress={() => {
              void handleDataImport();
            }}
            showSubtitle={dataDescriptionsRevealed}
            subtitle={mode === 'cloud' ? copy.importBackupCloudBody : t.restorePreviousData}
            title={t.dataImport}
          />
          <ServiceListRow
            accessory="chevron"
            compact={settings.compactDensity}
            destructive
            icon="trash-outline"
            last
            onPress={() => setResetPending(true)}
            showSubtitle
            subtitle={copy.resetLocalDataBody}
            title={copy.resetLocalData}
          />
        </ServiceRowGroup>
        <View style={{ marginTop: tokens.space.sm }}>
          {legacyMigrationVisible ? (
            <LegacyMigrationCard />
          ) : (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setLegacyMigrationVisible(true)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Text style={[tokens.typography.label, { color: tokens.colors.primary }]}>
                {copy.legacyMigrationReveal}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Oturum */}
        {auth.workspace ? (
          <ServiceRowGroup style={{ marginTop: tokens.space.lg }}>
            <ServiceListRow
              destructive
              compact={settings.compactDensity}
              icon="log-out-outline"
              last
              onPress={() => {
                void auth.signOut();
              }}
              title={copy.signOut}
            />
          </ServiceRowGroup>
        ) : null}

        {/* Uygulama künyesi */}
        <ServiceSectionHeader title={copy.aboutSection} />
        <ServiceSurface style={{ alignItems: 'center' }}>
          <Ionicons color={tokens.colors.primary} name="restaurant" size={28} />
          <Text
            style={[
              tokens.typography.title,
              { color: tokens.colors.text, marginTop: tokens.space.xs },
            ]}
          >
            {brand.name}
          </Text>
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
            {brand.tagline}
          </Text>
          <Text
            style={[
              tokens.typography.caption,
              { color: tokens.colors.textMuted, marginTop: tokens.space.xs },
            ]}
          >
            {copy.versionLabel} 1.0.0 · OMNI Tech Solutions
          </Text>
        </ServiceSurface>
      </ScrollView>

      <ServiceConfirmSheet
        body={t.restorePreviousData}
        cancelLabel={t.cancel}
        confirmLabel={t.import}
        destructive
        onClose={() => setPendingImport(undefined)}
        onConfirm={() => {
          if (pendingImport) applyImport(pendingImport);
        }}
        title={t.importWarning}
        visible={pendingImport !== undefined}
      />

      <ServiceConfirmSheet
        body={copy.catalogReplaceConfirmBody}
        busy={applyingCatalogReplace}
        cancelLabel={t.cancel}
        confirmLabel={t.import}
        destructive
        onClose={() => setPendingCatalogReplace(undefined)}
        onConfirm={() => {
          if (pendingCatalogReplace) void applyCatalogReplace(pendingCatalogReplace);
        }}
        title={copy.catalogReplaceConfirmTitle}
        visible={pendingCatalogReplace !== undefined}
      />

      <ServiceConfirmSheet
        body={copy.resetLocalDataConfirm}
        cancelLabel={t.cancel}
        confirmLabel={copy.resetLocalData}
        destructive
        onClose={() => setResetPending(false)}
        onConfirm={applyLocalReset}
        title={copy.resetLocalData}
        visible={resetPending}
      />
    </SafeAreaView>
  );
}

function ProfileHero({
  branchName,
  hint,
  modeLabel,
  name,
  organizationName,
  role,
}: {
  readonly branchName?: string;
  readonly hint?: string;
  readonly modeLabel: string;
  readonly name: string;
  readonly organizationName?: string;
  readonly role?: string;
}) {
  const { tokens } = useTheme();
  const subtitle = [organizationName, branchName].filter(Boolean).join(' · ');

  return (
    <ServiceSurface padding="large">
      <View style={{ alignItems: 'center', flexDirection: 'row' }}>
        <ServiceAvatar name={name} size={56} />
        <View style={{ flex: 1, marginLeft: tokens.space.sm }}>
          <Text
            numberOfLines={1}
            style={[tokens.typography.sectionTitle, { color: tokens.colors.text }]}
          >
            {name}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={1}
              style={[tokens.typography.caption, { color: tokens.colors.textSubtle, marginTop: 2 }]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: tokens.space.xs,
          marginTop: tokens.space.sm,
        }}
      >
        <ServiceStatusPill icon="options-outline" label={modeLabel} size="small" tone="info" />
        {role ? (
          <ServiceStatusPill icon="person-outline" label={role} size="small" tone="neutral" />
        ) : null}
      </View>

      {hint ? (
        <Text
          style={[
            tokens.typography.caption,
            { color: tokens.colors.textSubtle, marginTop: tokens.space.sm },
          ]}
        >
          {hint}
        </Text>
      ) : null}
    </ServiceSurface>
  );
}
