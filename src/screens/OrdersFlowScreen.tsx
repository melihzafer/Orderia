import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useOrderiaData } from '../data/runtime';
import {
  haptic,
  ServiceAction,
  ServiceActionSheet,
  ServiceEmptyState,
  ServiceScreenHeader,
  ServiceSkeleton,
  ServiceTextField,
  useAdaptiveLayout,
} from '../design-system';
import {
  ServiceTableCard,
  ShiftBoardSnapshot,
  buildLegacyShiftBoard,
  filterShiftBoardTables,
  loadDomainShiftBoard,
} from '../features/service-board';
import { useLocalization } from '../i18n';
import { RootStackParamList, TabParamList } from '../navigation/routes';
import { useLayoutStore, useOrderStore } from '../stores';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

const emptySnapshot: ShiftBoardSnapshot = {
  halls: [],
  tables: [],
  openCount: 0,
  attentionCount: 0,
  totalOpenMinor: 0,
};

/**
 * Orders is intentionally a short navigation flow. Operational filters and
 * statistics belong to the manager/service board, not the first screen a
 * waiter sees when opening Orders.
 */
export default function OrdersFlowScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<RouteProp<TabParamList, 'Orders'>>();
  const { tokens } = useTheme();
  const { currency, t } = useLocalization();
  const auth = useAuth();
  const layout = useAdaptiveLayout();
  const { database, mode, readiness, resolveProfileNames, revision, scope } = useOrderiaData();
  const halls = useLayoutStore((state) => state.halls);
  const tables = useLayoutStore((state) => state.tables);
  const tickets = useOrderStore((state) => state.openTickets);
  const [cloudSnapshot, setCloudSnapshot] = useState<ShiftBoardSnapshot | null>(null);
  const [selectedHallId, setSelectedHallId] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>();
  const [filter, setFilter] = useState<
    'all' | 'open' | 'payment' | 'available' | 'mine' | 'alerts'
  >('all');
  const [query, setQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(route.params?.search === true);
  const [actionTargetId, setActionTargetId] = useState<string>();
  const cloudMode = mode === 'cloud' && scope !== null;

  useEffect(() => {
    const focus = route.params?.focus;
    if (!focus || focus === 'all') return;
    setFilter(focus);
    setSelectedHallId(undefined);
  }, [route.params?.focus]);

  useEffect(() => {
    setSearchVisible(route.params?.search === true);
  }, [route.params?.search]);

  const fallbackCurrencyCode = auth.activeBranch?.currency_code ?? currency;
  const legacySnapshot = useMemo(
    () =>
      buildLegacyShiftBoard(
        {
          halls,
          tables,
          tickets,
          currentWaiterName: auth.workspace?.profile.display_name ?? t.deviceOnly,
          currencyCode: fallbackCurrencyCode,
          fallbackHallName: t.unassignedHall,
        },
        new Date(),
      ),
    [
      auth.workspace?.profile.display_name,
      fallbackCurrencyCode,
      halls,
      tables,
      t.deviceOnly,
      t.unassignedHall,
      tickets,
    ],
  );

  const loadCloud = useCallback(async () => {
    if (!database || !scope) return emptySnapshot;
    return loadDomainShiftBoard(database, scope, {
      currentUserId: auth.session?.user.id,
      fallbackCurrencyCode,
      fallbackHallName: t.unassignedHall,
      unknownWaiterName: t.unknownWaiter,
      resolveWaiterNames: resolveProfileNames,
    });
  }, [auth.session?.user.id, database, fallbackCurrencyCode, resolveProfileNames, scope, t]);

  useEffect(() => {
    if (!cloudMode) {
      setCloudSnapshot(null);
      setLoading(false);
      setError(undefined);
      return;
    }

    let active = true;
    setLoading(true);
    void loadCloud()
      .then((snapshot) => {
        if (!active) return;
        setCloudSnapshot(snapshot);
        setError(undefined);
      })
      .catch(() => {
        if (active) setError(t.boardReadFailed);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [cloudMode, loadCloud, revision, t.boardReadFailed]);

  const snapshot = cloudMode ? (cloudSnapshot ?? emptySnapshot) : legacySnapshot;
  const selectedHall = snapshot.halls.find((hall) => hall.id === selectedHallId);

  useEffect(() => {
    if (selectedHallId && !selectedHall) setSelectedHallId(undefined);
  }, [selectedHall, selectedHallId]);

  const actionTarget = snapshot.tables.find((table) => table.id === actionTargetId);

  const tableActions = (table: ShiftBoardSnapshot['tables'][number]): readonly ServiceAction[] => [
    {
      icon: 'open-outline',
      id: 'open',
      label: t.tableDetail,
      onPress: () => navigation.navigate('TableDetail', { tableId: table.id }),
    },
    {
      description: table.hallName,
      disabled: selectedHallId === table.hallId,
      icon: 'business-outline',
      id: 'hall',
      label: t.selectHall,
      onPress: () => {
        haptic('selection');
        setSelectedHallId(table.hallId);
      },
    },
  ];

  const refresh = async () => {
    if (!cloudMode) return;
    setRefreshing(true);
    try {
      setCloudSnapshot(await loadCloud());
      setError(undefined);
    } catch {
      setError(t.refreshFailed);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading || (cloudMode && readiness === 'opening' && !cloudSnapshot)) {
    return (
      <SafeAreaView
        edges={['top', 'bottom', 'left', 'right']}
        style={{ backgroundColor: tokens.colors.bg, flex: 1 }}
      >
        <View style={{ padding: layout.horizontalPadding }}>
          <ServiceSkeleton height={34} label={t.ordersNav} width="48%" />
          <ServiceSkeleton
            height={112}
            label={t.selectHall}
            style={{ marginTop: tokens.space.lg }}
          />
          <ActivityIndicator color={tokens.colors.primary} style={{ marginTop: tokens.space.lg }} />
        </View>
      </SafeAreaView>
    );
  }

  if (snapshot.halls.length === 0) {
    return (
      <SafeAreaView
        edges={['top', 'bottom', 'left', 'right']}
        style={{ backgroundColor: tokens.colors.bg, flex: 1 }}
      >
        <View style={{ flex: 1, justifyContent: 'center', padding: layout.horizontalPadding }}>
          <ServiceEmptyState
            action={
              auth.activeMembership?.role === 'manager' || auth.status === 'unconfigured'
                ? { label: t.configureTables, onPress: () => navigation.navigate('Tables') }
                : undefined
            }
            body={error ?? t.noHalls}
            icon="business-outline"
            title={error ? t.error : t.noHalls}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left', 'right']}
      style={{ backgroundColor: tokens.colors.bg, flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{
          alignSelf: 'center',
          gap: tokens.space.md,
          maxWidth: tokens.sizing.contentMaximumWidth,
          paddingBottom: tokens.space.md,
          paddingHorizontal: layout.horizontalPadding,
          paddingTop: tokens.space.md,
          width: '100%',
        }}
        refreshControl={
          <RefreshControl
            onRefresh={() => void refresh()}
            refreshing={refreshing}
            tintColor={tokens.colors.primary}
          />
        }
      >
        {selectedHall ? (
          <TableStep
            filter={filter}
            hall={selectedHall}
            layoutMode={layout.mode}
            onBack={() => setSelectedHallId(undefined)}
            onOpenTable={(tableId) => navigation.navigate('TableDetail', { tableId })}
            onQueryChange={setQuery}
            onTableActions={setActionTargetId}
            query={query}
            searchVisible={searchVisible}
            snapshot={snapshot}
          />
        ) : (
          <HallStep
            halls={snapshot.halls}
            layoutMode={layout.mode}
            onOpenTable={(tableId) => navigation.navigate('TableDetail', { tableId })}
            onQueryChange={setQuery}
            onSelect={setSelectedHallId}
            onTableActions={setActionTargetId}
            query={query}
            searchVisible={searchVisible}
            t={t}
            tables={snapshot.tables}
          />
        )}
      </ScrollView>

      {/*
        Salon şeridi ekranın altında: salon değiştirmek için bir adım geri gidip
        listeden seçmek yerine başparmakla tek dokunuş yetiyor. Geri düğmesi yerinde
        kalıyor, çünkü hiyerarşiden çıkmanın alışılmış yolu o.
      */}
      {selectedHall && snapshot.halls.length > 1 ? (
        <View
          style={[
            {
              backgroundColor: tokens.colors.surface,
              borderTopColor: tokens.colors.borderLight,
              borderTopWidth: 1,
              paddingHorizontal: tokens.space.sm,
              paddingVertical: tokens.space.xs,
            },
            tokens.elevation.sticky,
          ]}
        >
          <ScrollView
            contentContainerStyle={{ alignItems: 'center', gap: tokens.space.xs }}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {snapshot.halls.map((hall) => (
              <HallChip
                key={hall.id}
                label={hall.name}
                onPress={() => {
                  haptic('selection');
                  setSelectedHallId(hall.id);
                }}
                selected={hall.id === selectedHallId}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <ServiceActionSheet
        actions={actionTarget ? tableActions(actionTarget) : []}
        cancelLabel={t.cancel}
        onClose={() => setActionTargetId(undefined)}
        subtitle={actionTarget?.hallName}
        title={actionTarget?.label ?? ''}
        visible={actionTarget !== undefined}
      />
    </SafeAreaView>
  );
}

function HallChip({
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
        backgroundColor: selected ? tokens.colors.accent : tokens.colors.surfaceAlt,
        borderColor: selected ? tokens.colors.accent : tokens.colors.border,
        borderRadius: tokens.radius.full,
        borderWidth: 1,
        justifyContent: 'center',
        minHeight: tokens.sizing.chipTarget,
        opacity: pressed ? 0.8 : 1,
        paddingHorizontal: tokens.space.md,
      })}
    >
      <Text
        style={[
          tokens.typography.label,
          { color: selected ? tokens.colors.primaryContrast : tokens.colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function HallStep({
  halls,
  layoutMode,
  onOpenTable,
  onQueryChange,
  onSelect,
  onTableActions,
  query,
  searchVisible,
  t,
  tables,
}: {
  readonly halls: ShiftBoardSnapshot['halls'];
  readonly layoutMode: 'compact' | 'medium' | 'expanded';
  readonly onOpenTable: (tableId: string) => void;
  readonly onQueryChange: (value: string) => void;
  readonly onSelect: (hallId: string) => void;
  readonly onTableActions: (tableId: string) => void;
  readonly query: string;
  readonly searchVisible: boolean;
  readonly t: ReturnType<typeof useLocalization>['t'];
  readonly tables: ShiftBoardSnapshot['tables'];
}) {
  const { tokens } = useTheme();
  const term = query.trim();
  // İsimle arama salon adımını atlar: hangi salonda olduğunu bilmediğin için
  // aratıyorsun. Sonuçlar bütün salonlardan gelir.
  const matches = term.length === 0 ? [] : filterShiftBoardTables(tables, { scope: 'all', query });

  return (
    <View style={{ gap: tokens.space.md }}>
      <ServiceScreenHeader subtitle={t.selectHall} title={t.ordersNav} />

      {searchVisible ? (
        <ServiceTextField
          autoFocus
          hideLabel
          label={t.searchTableOrWaiter}
          onChangeText={onQueryChange}
          placeholder={t.searchTableOrWaiter}
          returnKeyType="search"
          value={query}
        />
      ) : null}

      {term.length > 0 ? (
        matches.length === 0 ? (
          <ServiceEmptyState
            body={t.tryDifferentSearch}
            icon="search-outline"
            title={t.noMatchingTables}
          />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm }}>
            {matches.map((table) => (
              <View
                key={table.id}
                style={{
                  flexBasis: layoutMode === 'expanded' ? '31%' : '48%',
                  flexGrow: 1,
                  minWidth: 156,
                }}
              >
                <ServiceTableCard
                  onLongPress={() => onTableActions(table.id)}
                  onMore={() => onTableActions(table.id)}
                  onPress={() => onOpenTable(table.id)}
                  table={table}
                />
              </View>
            ))}
          </View>
        )
      ) : null}
      <View style={{ gap: tokens.space.sm, display: term.length > 0 ? 'none' : 'flex' }}>
        {halls.map((hall) => {
          return (
            <Pressable
              accessibilityHint={t.selectTableForOrder}
              accessibilityLabel={hall.name}
              accessibilityRole="button"
              key={hall.id}
              onPress={() => onSelect(hall.id)}
              style={({ pressed }) => ({
                backgroundColor: tokens.colors.surface,
                borderColor: tokens.colors.borderLight,
                borderRadius: tokens.radius.large,
                borderWidth: 1,
                opacity: pressed ? 0.8 : 1,
                padding: tokens.space.lg,
              })}
            >
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: tokens.space.md }}>
                <View
                  style={{
                    alignItems: 'center',
                    backgroundColor: tokens.colors.accentSoft,
                    borderRadius: tokens.radius.medium,
                    height: 52,
                    justifyContent: 'center',
                    width: 52,
                  }}
                >
                  <Ionicons color={tokens.colors.accent} name="business-outline" size={26} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
                    {hall.name}
                  </Text>
                </View>
                <Text style={[tokens.typography.title, { color: tokens.colors.textSubtle }]}>
                  ›
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TableStep({
  hall,
  snapshot,
  layoutMode,
  onBack,
  onOpenTable,
  onTableActions,
  onQueryChange,
  filter,
  query,
  searchVisible,
}: {
  readonly hall: ShiftBoardSnapshot['halls'][number];
  readonly snapshot: ShiftBoardSnapshot;
  readonly layoutMode: 'compact' | 'medium' | 'expanded';
  readonly onBack: () => void;
  readonly onOpenTable: (tableId: string) => void;
  readonly onTableActions: (tableId: string) => void;
  readonly onQueryChange: (value: string) => void;
  readonly filter: 'all' | 'open' | 'payment' | 'available' | 'mine' | 'alerts';
  readonly query: string;
  readonly searchVisible: boolean;
}) {
  const { tokens } = useTheme();
  const { t } = useLocalization();
  const tables = filterShiftBoardTables(snapshot.tables, {
    scope: filter,
    hallId: hall.id,
    query,
  });

  return (
    <View style={{ gap: tokens.space.md }}>
      <ServiceScreenHeader
        back={{ label: t.allHalls, onPress: onBack }}
        subtitle={t.selectTableForOrder}
        title={hall.name}
      />
      {searchVisible ? (
        <ServiceTextField
          hideLabel
          label={t.searchTableOrWaiter}
          onChangeText={onQueryChange}
          placeholder={t.searchTableOrWaiter}
          value={query}
        />
      ) : null}
      {tables.length === 0 ? (
        <ServiceEmptyState body={t.askManagerForTables} icon="grid-outline" title={t.noTables} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm }}>
          {/*
            Masalar ekranıyla aynı kart: tutar, hesap sayısı ve süre kartın üstünde
            duruyor, garson hangi masaya gideceğine bakmadan karar verebiliyor.
          */}
          {tables.map((table) => (
            <View
              key={table.id}
              style={{
                flexBasis: layoutMode === 'expanded' ? '31%' : '48%',
                flexGrow: 1,
                minWidth: 156,
              }}
            >
              <ServiceTableCard
                onLongPress={() => onTableActions(table.id)}
                onMore={() => onTableActions(table.id)}
                onPress={() => onOpenTable(table.id)}
                table={table}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
