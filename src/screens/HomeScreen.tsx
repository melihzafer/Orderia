import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useOrderiaData } from '../data/runtime';
import {
  ServiceMetricTile,
  ServiceQuickAction,
  ServiceSectionHeader,
  ServiceStatusPill,
  ServiceSurface,
  useAdaptiveLayout,
} from '../design-system';
import {
  ShiftBoardQuickActions,
  ShiftBoardSnapshot,
  buildLegacyShiftBoard,
  formatMinorCurrency,
  loadDomainShiftBoard,
} from '../features/service-board';
import { settingsCopy } from '../features/app-settings';
import { useLocalization } from '../i18n';
import { RootStackParamList } from '../navigation/routes';
import { useLayoutStore, useOrderStore } from '../stores';
import { useSettingsStore, type QuickActionId } from '../stores/settingsStore';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

const emptySnapshot: ShiftBoardSnapshot = {
  halls: [],
  tables: [],
  openCount: 0,
  attentionCount: 0,
  totalOpenMinor: 0,
};

export default function HomeScreen() {
  const navigation = useNavigation<Navigation>();
  const { tokens } = useTheme();
  const { currency, language, t } = useLocalization();
  const auth = useAuth();
  const layout = useAdaptiveLayout();
  const { database, mode, readiness, resolveProfileNames, revision, scope, sync } =
    useOrderiaData();
  const halls = useLayoutStore((state) => state.halls);
  const tables = useLayoutStore((state) => state.tables);
  const openTickets = useOrderStore((state) => state.openTickets);
  const quickActions = useSettingsStore((state) => state.quickActions);
  const [cloudSnapshot, setCloudSnapshot] = useState<ShiftBoardSnapshot | null>(null);
  const [error, setError] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);

  const fallbackCurrencyCode = auth.activeBranch?.currency_code ?? currency;
  const currentWaiterName = auth.workspace?.profile.display_name ?? t.deviceOnly;
  const cloudMode = mode === 'cloud' && scope !== null;
  const waiterNames = useMemo(
    () =>
      auth.workspace?.profile
        ? { [auth.workspace.profile.id]: auth.workspace.profile.display_name }
        : {},
    [auth.workspace],
  );
  const legacySnapshot = useMemo(
    () =>
      buildLegacyShiftBoard(
        {
          halls,
          tables,
          tickets: openTickets,
          currentWaiterName,
          currencyCode: fallbackCurrencyCode,
          fallbackHallName: t.unassignedHall,
        },
        new Date(),
      ),
    [currentWaiterName, fallbackCurrencyCode, halls, openTickets, t.unassignedHall, tables],
  );

  const loadCloudBoard = useCallback(async () => {
    if (!database || !scope) return null;
    return loadDomainShiftBoard(
      database,
      scope,
      {
        currentUserId: auth.session?.user.id,
        waiterNames,
        fallbackCurrencyCode,
        fallbackHallName: t.unassignedHall,
        unknownWaiterName: t.unknownWaiter,
        resolveWaiterNames: resolveProfileNames,
      },
      new Date(),
    );
  }, [
    auth.session?.user.id,
    database,
    fallbackCurrencyCode,
    resolveProfileNames,
    scope,
    t,
    waiterNames,
  ]);

  useEffect(() => {
    if (!cloudMode) {
      setCloudSnapshot(null);
      setError(undefined);
      return;
    }
    let active = true;
    void loadCloudBoard()
      .then((snapshot) => {
        if (!active || !snapshot) return;
        setCloudSnapshot(snapshot);
        setError(undefined);
      })
      .catch(() => {
        if (active) setError(t.boardReadFailed);
      });
    return () => {
      active = false;
    };
  }, [cloudMode, loadCloudBoard, revision, t.boardReadFailed]);

  const snapshot = cloudMode ? (cloudSnapshot ?? emptySnapshot) : legacySnapshot;
  const availableCount = snapshot.tables.filter((table) => table.state === 'available').length;
  const paymentCount = snapshot.tables.filter((table) => table.remainingMinor > 0).length;
  const isManager = auth.status === 'unconfigured' || auth.activeMembership?.role === 'manager';
  const copy = settingsCopy(language);

  const openOrders = (
    focus?: 'all' | 'mine' | 'alerts' | 'open' | 'payment' | 'available',
    search = false,
  ) =>
    navigation.navigate('MainTabs', {
      screen: 'Orders',
      params: { ...(focus ? { focus } : {}), ...(search ? { search: true } : {}) },
    });
  const handleQuickAction = (action: QuickActionId) => {
    switch (action) {
      case 'new_order':
        navigation.navigate('NewOrder');
        return;
      case 'find_by_name':
        openOrders('all', true);
        return;
      case 'open_checks':
        openOrders('open');
        return;
      case 'take_payment':
        openOrders('payment');
        return;
      case 'day_summary':
        navigation.navigate('Analytics');
        return;
      case 'last_order': {
        const latest = [...snapshot.tables]
          .filter((table) => table.openedAt)
          .sort((left, right) => (right.openedAt ?? '').localeCompare(left.openedAt ?? ''))[0];
        if (latest) navigation.navigate('TableDetail', { tableId: latest.id });
        else openOrders();
        return;
      }
    }
  };

  const refreshHome = async () => {
    setRefreshing(true);
    try {
      if (cloudMode) {
        const next = await loadCloudBoard();
        if (next) setCloudSnapshot(next);
      }
      setError(undefined);
    } catch {
      setError(t.refreshFailed);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={{ backgroundColor: tokens.colors.bg, flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          alignSelf: 'center',
          maxWidth: tokens.sizing.contentMaximumWidth,
          paddingBottom: tokens.space.md,
          paddingHorizontal: layout.horizontalPadding,
          paddingTop: tokens.space.md,
          width: '100%',
        }}
        refreshControl={
          <RefreshControl
            onRefresh={() => void refreshHome()}
            refreshing={refreshing}
            tintColor={tokens.colors.primary}
          />
        }
      >
        <View
          style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}
        >
          <View style={{ flex: 1, marginRight: tokens.space.sm }}>
            <Text
              numberOfLines={1}
              style={[tokens.typography.label, { color: tokens.colors.text }]}
            >
              {auth.activeBranch?.name ?? 'Orderia'}
            </Text>
            <Text
              style={[tokens.typography.caption, { color: tokens.colors.textSubtle, marginTop: 2 }]}
            >
              {new Date().toLocaleDateString(
                language === 'tr' ? 'tr-TR' : language === 'bg' ? 'bg-BG' : 'en-GB',
                {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                },
              )}
            </Text>
          </View>
          <ServiceStatusPill
            icon={sync.online ? 'cloud-done-outline' : 'cloud-offline-outline'}
            label={cloudMode && sync.online ? t.syncedState : t.deviceOnly}
            tone={cloudMode && sync.online ? 'success' : 'neutral'}
          />
        </View>

        {error ? (
          <ServiceSurface
            accessibilityRole="alert"
            style={{ borderColor: tokens.colors.warning, marginTop: tokens.space.md }}
            variant="outlined"
          >
            <Text style={[tokens.typography.body, { color: tokens.colors.text }]}>{error}</Text>
          </ServiceSurface>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: tokens.space.xs,
            marginTop: tokens.space.md,
          }}
        >
          <ServiceMetricTile
            hint={t.openTablesSummary}
            label={t.openTables}
            onPress={() => openOrders('open')}
            style={{ flexBasis: layout.mode === 'compact' ? '47%' : 0 }}
            tone="info"
            value={String(snapshot.openCount)}
          />
          <ServiceMetricTile
            hint={t.paymentDueState}
            label={t.total}
            onPress={() => openOrders('payment')}
            style={{ flexBasis: layout.mode === 'compact' ? '47%' : 0 }}
            tone="accent"
            value={formatMinorCurrency(snapshot.totalOpenMinor, fallbackCurrencyCode, language)}
          />
          <ServiceMetricTile
            label={t.availableState}
            onPress={() => openOrders('available')}
            style={{ flexBasis: layout.mode === 'compact' ? '47%' : 0 }}
            tone="success"
            value={String(availableCount)}
          />
          <ServiceMetricTile
            hint={t.attentionSummary}
            label={t.alerts}
            onPress={() => openOrders('alerts')}
            style={{ flexBasis: layout.mode === 'compact' ? '47%' : 0 }}
            tone={snapshot.attentionCount > 0 ? 'warning' : 'success'}
            value={String(snapshot.attentionCount)}
          />
        </View>

        {readiness === 'opening' && cloudMode && !cloudSnapshot ? (
          <Text
            style={[
              tokens.typography.caption,
              { color: tokens.colors.textSubtle, marginTop: tokens.space.sm },
            ]}
          >
            {t.loading}
          </Text>
        ) : null}

        <ServiceSectionHeader title={copy.quickActionsSection} />
        <ShiftBoardQuickActions
          actions={
            isManager ? quickActions : quickActions.filter((action) => action !== 'day_summary')
          }
          counts={{
            attentionCount: snapshot.attentionCount,
            availableCount,
            openCount: snapshot.openCount,
            paymentCount,
          }}
          onAction={handleQuickAction}
        />

        <ServiceSectionHeader title={t.moreNav} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs }}>
          {isManager ? (
            <ServiceQuickAction
              emphasis="primary"
              icon="grid-outline"
              label={t.configureTables}
              onPress={() => navigation.navigate('Tables')}
              style={{ flexBasis: '47%' }}
              tone="accent"
            />
          ) : null}
          {isManager ? (
            <ServiceQuickAction
              icon="bar-chart-outline"
              label={t.reportsNav}
              onPress={() => navigation.navigate('Analytics')}
              style={{ flexBasis: '31%' }}
              tone="info"
            />
          ) : null}
          <ServiceQuickAction
            icon="settings-outline"
            label={t.settings}
            onPress={() => navigation.navigate('Settings')}
            style={{ flexBasis: '31%' }}
            tone="neutral"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
