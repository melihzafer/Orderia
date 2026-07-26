import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useOrderiaData } from '../data/runtime';
import {
  ServiceButton,
  ServiceEmptyState,
  ServiceSkeleton,
  ServiceStatusPill,
  ServiceSurface,
  ServiceTextField,
  useAdaptiveLayout,
} from '../design-system';
import {
  ServiceTableCard,
  ShiftBoardScopeFilter,
  ShiftBoardSnapshot,
  buildLegacyShiftBoard,
  filterShiftBoardTables,
  loadDomainShiftBoard,
} from '../features/service-board';
import { useLocalization } from '../i18n';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useLayoutStore, useOrderStore } from '../stores';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const emptySnapshot: ShiftBoardSnapshot = {
  halls: [],
  tables: [],
  openCount: 0,
  attentionCount: 0,
  totalOpenMinor: 0,
};

export default function ShiftBoardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { tokens } = useTheme();
  const { currency, t } = useLocalization();
  const auth = useAuth();
  const {
    database,
    errorMessage: runtimeError,
    mode,
    readiness,
    refresh,
    resolveProfileNames,
    revision,
    scope,
    sync,
  } = useOrderiaData();
  const halls = useLayoutStore((state) => state.halls);
  const legacyTables = useLayoutStore((state) => state.tables);
  const openTickets = useOrderStore((state) => state.openTickets);
  const layout = useAdaptiveLayout();
  const [cloudSnapshot, setCloudSnapshot] = useState<ShiftBoardSnapshot | null>(null);
  const [boardError, setBoardError] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<ShiftBoardScopeFilter>('all');
  const [hallId, setHallId] = useState<string>();
  const [clock, setClock] = useState(() => Date.now());

  const fallbackCurrencyCode = auth.activeBranch?.currency_code ?? currency;
  const currentWaiterName = auth.workspace?.profile.display_name ?? t.deviceOnly;
  const waiterNames = useMemo(
    () =>
      auth.workspace?.profile
        ? {
            [auth.workspace.profile.id]: auth.workspace.profile.display_name,
          }
        : {},
    [auth.workspace],
  );
  const cloudMode = mode === 'cloud' && scope !== null;

  const legacySnapshot = useMemo(
    () =>
      buildLegacyShiftBoard(
        {
          halls,
          tables: legacyTables,
          tickets: openTickets,
          currentWaiterName,
          currencyCode: fallbackCurrencyCode,
          fallbackHallName: t.unassignedHall,
        },
        new Date(clock),
      ),
    [
      clock,
      currentWaiterName,
      fallbackCurrencyCode,
      halls,
      legacyTables,
      openTickets,
      t.unassignedHall,
    ],
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
    t.unassignedHall,
    t.unknownWaiter,
    waiterNames,
  ]);

  useEffect(() => {
    if (!cloudMode || !database || !scope) {
      setCloudSnapshot(null);
      setBoardError(undefined);
      return;
    }

    let active = true;
    void loadCloudBoard()
      .then((snapshot) => {
        if (!active || !snapshot) return;
        setCloudSnapshot(snapshot);
        setBoardError(undefined);
      })
      .catch(() => {
        if (!active) return;
        setBoardError(t.boardReadFailed);
      });
    return () => {
      active = false;
    };
  }, [cloudMode, database, loadCloudBoard, revision, scope, t.boardReadFailed]);

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
      const snapshot = cloudMode ? await loadCloudBoard() : null;
      if (snapshot) setCloudSnapshot(snapshot);
      setClock(Date.now());
      setBoardError(undefined);
    } catch {
      setBoardError(t.refreshFailed);
    } finally {
      setRefreshing(false);
    }
  }, [cloudMode, loadCloudBoard, refresh, t.refreshFailed]);

  const snapshot = cloudMode ? (cloudSnapshot ?? emptySnapshot) : legacySnapshot;
  const tablesWithCurrentAge = useMemo(
    () =>
      snapshot.tables.map((table) =>
        table.openedAt
          ? {
              ...table,
              durationMinutes: Math.max(
                0,
                Math.floor((clock - Date.parse(table.openedAt)) / 60_000),
              ),
            }
          : table,
      ),
    [clock, snapshot.tables],
  );
  const filteredTables = useMemo(
    () =>
      filterShiftBoardTables(tablesWithCurrentAge, {
        scope: scopeFilter,
        hallId,
        query,
      }),
    [hallId, query, scopeFilter, tablesWithCurrentAge],
  );
  const isManager = auth.status === 'unconfigured' || auth.activeMembership?.role === 'manager';
  const isInitialLoading =
    cloudMode && cloudSnapshot === null && readiness !== 'error' && !boardError;
  const errorMessage = boardError ?? (runtimeError ? t.syncErrorState : undefined);

  const resetFilters = () => {
    setQuery('');
    setHallId(undefined);
    setScopeFilter('all');
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ backgroundColor: tokens.colors.bg, flex: 1 }}
    >
      <FlatList
        key={`shift-board-${layout.tableColumns}`}
        accessibilityLabel={t.shiftBoard}
        columnWrapperStyle={layout.tableColumns > 1 ? { alignItems: 'stretch' } : undefined}
        contentContainerStyle={{
          paddingBottom: tokens.space.xxl,
          paddingHorizontal: layout.horizontalPadding - 6,
        }}
        data={filteredTables}
        keyExtractor={(table) => table.id}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 6 }}>
            <BoardHeader
              branchName={auth.activeBranch?.name ?? 'Orderia'}
              clock={clock}
              mode={mode}
              openCount={snapshot.openCount}
              attentionCount={snapshot.attentionCount}
              sync={sync}
            />

            {errorMessage ? (
              <ServiceSurface
                accessibilityRole="alert"
                variant="outlined"
                style={{
                  borderColor: tokens.colors.error,
                  marginBottom: tokens.space.md,
                }}
              >
                <Text style={[tokens.typography.body, { color: tokens.colors.text }]}>
                  {errorMessage}
                </Text>
                <ServiceButton
                  label={t.retrySync}
                  onPress={() => {
                    void handleRefresh();
                  }}
                  style={{ marginTop: tokens.space.sm }}
                  variant="outline"
                />
              </ServiceSurface>
            ) : null}

            <ServiceTextField
              label={t.searchTableOrWaiter}
              onChangeText={setQuery}
              placeholder={t.searchTableOrWaiter}
              returnKeyType="search"
              value={query}
            />

            <View
              accessibilityRole="tablist"
              style={{
                flexDirection: 'row',
                marginTop: tokens.space.sm,
              }}
            >
              <BoardFilter
                label={t.all}
                onPress={() => setScopeFilter('all')}
                selected={scopeFilter === 'all'}
              />
              <BoardFilter
                label={t.mine}
                onPress={() => setScopeFilter('mine')}
                selected={scopeFilter === 'mine'}
              />
              <BoardFilter
                badge={snapshot.attentionCount}
                label={t.alerts}
                onPress={() => setScopeFilter('alerts')}
                selected={scopeFilter === 'alerts'}
              />
            </View>

            <ScrollView
              horizontal
              accessibilityLabel={t.allHalls}
              contentContainerStyle={{ paddingVertical: tokens.space.sm }}
              showsHorizontalScrollIndicator={false}
            >
              <HallFilter
                label={t.allHalls}
                onPress={() => setHallId(undefined)}
                selected={hallId === undefined}
              />
              {snapshot.halls.map((hall) => (
                <HallFilter
                  key={hall.id}
                  label={hall.name}
                  onPress={() => setHallId(hall.id)}
                  selected={hallId === hall.id}
                />
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <View style={{ paddingHorizontal: 6 }}>
            {isInitialLoading ? (
              <BoardSkeletons columns={layout.tableColumns} label={t.loadingTable} />
            ) : snapshot.tables.length === 0 ? (
              <ServiceEmptyState
                action={
                  isManager
                    ? {
                        label: t.configureTables,
                        onPress: () => navigation.navigate('AddHall', {}),
                      }
                    : undefined
                }
                body={isManager ? t.configureTablesDescription : t.askManagerForTables}
                icon="grid-outline"
                title={t.noTablesConfigured}
              />
            ) : (
              <ServiceEmptyState
                action={{
                  label: t.clearFilters,
                  onPress: resetFilters,
                }}
                body={t.searchTableOrWaiter}
                icon="search-outline"
                title={t.noMatchingTables}
              />
            )}
          </View>
        }
        numColumns={layout.tableColumns}
        refreshControl={
          <RefreshControl
            colors={[tokens.colors.primary]}
            onRefresh={() => {
              void handleRefresh();
            }}
            refreshing={refreshing}
            tintColor={tokens.colors.primary}
          />
        }
        renderItem={({ item }) => (
          <View
            style={{
              flexBasis: `${100 / layout.tableColumns}%`,
              flexGrow: 0,
              flexShrink: 0,
              padding: 6,
            }}
          >
            <ServiceTableCard
              onMore={() =>
                navigation.navigate('TableDetail', {
                  tableId: item.id,
                })
              }
              onPress={() =>
                navigation.navigate('TableDetail', {
                  tableId: item.id,
                })
              }
              table={item}
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function BoardHeader({
  branchName,
  clock,
  mode,
  openCount,
  attentionCount,
  sync,
}: {
  readonly branchName: string;
  readonly clock: number;
  readonly mode: ReturnType<typeof useOrderiaData>['mode'];
  readonly openCount: number;
  readonly attentionCount: number;
  readonly sync: ReturnType<typeof useOrderiaData>['sync'];
}) {
  const { tokens } = useTheme();
  const { language, t } = useLocalization();
  const syncPresentation = globalSyncPresentation(mode, sync, t);
  const locale = language === 'tr' ? 'tr-TR' : language === 'bg' ? 'bg-BG' : 'en-GB';

  return (
    <View style={{ paddingBottom: tokens.space.md, paddingTop: tokens.space.sm }}>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1, marginRight: tokens.space.sm }}>
          <Text
            numberOfLines={1}
            style={[tokens.typography.label, { color: tokens.colors.textSubtle }]}
          >
            {branchName}
          </Text>
          <Text
            accessibilityRole="header"
            style={[tokens.typography.title, { color: tokens.colors.text }]}
          >
            {t.shiftBoard}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text
            style={[
              tokens.typography.label,
              {
                color: tokens.colors.textSubtle,
                marginBottom: tokens.space.xxs,
              },
            ]}
          >
            {new Date(clock).toLocaleTimeString(locale, {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          <ServiceStatusPill
            icon={syncPresentation.icon}
            label={syncPresentation.label}
            tone={syncPresentation.tone}
          />
        </View>
      </View>
      <Text
        style={[
          tokens.typography.caption,
          { color: tokens.colors.textSubtle, marginTop: tokens.space.xs },
        ]}
      >
        {openCount} {t.openTablesSummary}
        {attentionCount > 0 ? ` · ${attentionCount} ${t.attentionSummary}` : ''}
      </Text>
    </View>
  );
}

function BoardFilter({
  badge,
  label,
  onPress,
  selected,
}: {
  readonly badge?: number;
  readonly label: string;
  readonly onPress: () => void;
  readonly selected: boolean;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: selected ? tokens.colors.primary : tokens.colors.surface,
        borderColor: selected ? tokens.colors.primary : tokens.colors.border,
        borderRadius: tokens.radius.medium,
        borderWidth: 1,
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        marginRight: tokens.space.xs,
        minHeight: tokens.sizing.minimumTarget,
        opacity: pressed ? 0.8 : 1,
        paddingHorizontal: tokens.space.sm,
      })}
    >
      <Text
        style={[
          tokens.typography.label,
          {
            color: selected ? tokens.colors.primaryContrast : tokens.colors.text,
          },
        ]}
      >
        {label}
      </Text>
      {badge ? (
        <View
          style={{
            alignItems: 'center',
            backgroundColor: selected
              ? tokens.colors.primaryContrast
              : tokens.colors.state.pending.bg,
            borderRadius: tokens.radius.full,
            justifyContent: 'center',
            marginLeft: tokens.space.xs,
            minHeight: 22,
            minWidth: 22,
            paddingHorizontal: tokens.space.xxs,
          }}
        >
          <Text
            style={[
              tokens.typography.caption,
              {
                color: selected ? tokens.colors.primary : tokens.colors.state.pending.text,
              },
            ]}
          >
            {badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function HallFilter({
  label,
  onPress,
  selected,
}: {
  readonly label: string;
  readonly onPress: () => void;
  readonly selected: boolean;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: selected ? tokens.colors.surfaceAlt : tokens.colors.surface,
        borderColor: selected ? tokens.colors.primary : tokens.colors.border,
        borderRadius: tokens.radius.full,
        borderWidth: selected ? 2 : 1,
        justifyContent: 'center',
        marginRight: tokens.space.xs,
        minHeight: tokens.sizing.minimumTarget,
        opacity: pressed ? 0.8 : 1,
        paddingHorizontal: tokens.space.md,
      })}
    >
      <Text
        style={[
          tokens.typography.label,
          {
            color: selected ? tokens.colors.primary : tokens.colors.textSubtle,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function BoardSkeletons({ columns, label }: { readonly columns: number; readonly label: string }) {
  const { tokens } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {Array.from({ length: Math.max(4, columns * 2) }, (_, index) => (
        <View
          key={index}
          style={{
            padding: 6,
            width: `${100 / columns}%`,
          }}
        >
          <ServiceSkeleton
            height={tokens.sizing.tableCardMinimumHeight}
            label={`${label} ${index + 1}`}
          />
        </View>
      ))}
    </View>
  );
}

function globalSyncPresentation(
  mode: ReturnType<typeof useOrderiaData>['mode'],
  sync: ReturnType<typeof useOrderiaData>['sync'],
  t: ReturnType<typeof useLocalization>['t'],
): {
  readonly label: string;
  readonly tone: 'neutral' | 'info' | 'success' | 'warning' | 'error';
  readonly icon: keyof typeof Ionicons.glyphMap;
} {
  if (mode === 'local_only') {
    return {
      label: t.deviceOnly,
      tone: 'neutral',
      icon: 'phone-portrait-outline',
    };
  }
  switch (sync.state) {
    case 'synced':
      return {
        label: t.syncedState,
        tone: 'success',
        icon: 'cloud-done-outline',
      };
    case 'syncing':
      return {
        label: t.syncingState,
        tone: 'info',
        icon: 'sync-outline',
      };
    case 'offline':
      return {
        label: sync.pendingCount > 0 ? `${t.offlineState} · ${sync.pendingCount}` : t.offlineState,
        tone: 'warning',
        icon: 'cloud-offline-outline',
      };
    case 'pending':
      return {
        label: `${sync.pendingCount} ${t.queuedChanges}`,
        tone: 'warning',
        icon: 'cloud-upload-outline',
      };
    case 'conflict':
      return {
        label: `${sync.conflictCount} ${t.needsReviewState}`,
        tone: 'error',
        icon: 'warning-outline',
      };
    default:
      return {
        label: t.syncErrorState,
        tone: 'error',
        icon: 'alert-circle-outline',
      };
  }
}
