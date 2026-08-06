import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
  ServiceButton,
  ServiceEmptyState,
  ServiceIconButton,
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

type StatusFilter = 'all' | 'open' | 'payment' | 'available' | 'mine';

/**
 * Masalar — garsonun evi. mockup-v2 "tables-view" pattern'i:
 * KPI strip + salon filtreleri + durum filtreleri + arama + görsel masa grid'i.
 * Tüm aksiyonlar tek ekranda: salon seçmek ayrı bir adım DEĞİL, bir filtredir.
 */
export default function TablesHomeScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<RouteProp<TabParamList, 'Masalar'>>();
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  // Arama alanı varsayılan olarak kapalı: servis sırasında nadiren kullanılıyor ve
  // sürekli açık durduğunda masa grid'ini bir satır aşağı itiyordu.
  const [searchOpen, setSearchOpen] = useState(false);
  const [actionTargetId, setActionTargetId] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>();
  const cloudMode = mode === 'cloud' && scope !== null;

  const fallbackCurrencyCode = auth.activeBranch?.currency_code ?? currency;
  const currentWaiterName = auth.workspace?.profile.display_name ?? t.deviceOnly;

  const legacySnapshot = useMemo(
    () =>
      buildLegacyShiftBoard(
        {
          halls,
          tables,
          tickets,
          currentWaiterName,
          currencyCode: fallbackCurrencyCode,
          fallbackHallName: t.unassignedHall,
        },
        new Date(),
      ),
    [currentWaiterName, fallbackCurrencyCode, halls, tables, t.unassignedHall, tickets],
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

  // Home ekranındaki kısayollar (focus/search) Masalar'a parametre geçebilir.
  const focus = route.params?.focus;
  useEffect(() => {
    if (!focus || focus === 'all') return;
    const mapped: StatusFilter =
      focus === 'open'
        ? 'open'
        : focus === 'payment'
          ? 'payment'
          : focus === 'available'
            ? 'available'
            : 'mine';
    setStatusFilter(mapped);
    setSelectedHallId(undefined);
  }, [focus]);

  useEffect(() => {
    if (route.params?.search === true) {
      setQuery('');
      setSearchOpen(true);
    }
  }, [route.params?.search]);

  const selectFilter = (next: StatusFilter) => {
    haptic('selection');
    setStatusFilter(next);
  };
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

  const visibleTables = useMemo(() => {
    return filterShiftBoardTables(snapshot.tables, {
      scope: statusFilter,
      ...(selectedHallId ? { hallId: selectedHallId } : {}),
      query,
    });
  }, [query, selectedHallId, snapshot.tables, statusFilter]);

  const actionTarget = snapshot.tables.find((table) => table.id === actionTargetId);

  /**
   * Uzun basış ve taşma düğmesinin ortak listesi. Masayı açmanın yanında iki hızlı
   * daraltma sunar: yoğun bir salonda "sadece bu salon" ya da "sadece benim masalarım"
   * demek, aynı sonuca üstteki filtrelerden ulaşmaktan belirgin biçimde kısa.
   */
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
    {
      disabled: statusFilter === 'mine',
      icon: 'person-outline',
      id: 'mine',
      label: t.mine,
      onPress: () => selectFilter('mine'),
    },
  ];

  if (loading || (cloudMode && readiness === 'opening' && !cloudSnapshot)) {
    return (
      <SafeAreaView
        edges={['top', 'bottom', 'left', 'right']}
        style={{ backgroundColor: tokens.colors.bg, flex: 1 }}
      >
        <View style={{ padding: layout.horizontalPadding }}>
          <ServiceSkeleton height={34} label={t.tablesNav} width="48%" />
          <ServiceSkeleton
            height={76}
            label={t.checksCount}
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
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            onRefresh={() => void refresh()}
            refreshing={refreshing}
            tintColor={tokens.colors.primary}
          />
        }
      >
        <ServiceScreenHeader
          action={
            <ServiceIconButton
              icon={searchOpen ? 'close' : 'search'}
              label={t.searchTableOrWaiter}
              onPress={() => {
                haptic('selection');
                setSearchOpen((open) => {
                  if (open) setQuery('');
                  return !open;
                });
              }}
              tone={searchOpen ? 'primary' : 'default'}
            />
          }
          subtitle={t.selectTableForOrder}
          title={t.tablesNav}
        />

        <View>
          <Text
            style={[
              tokens.typography.label,
              { color: tokens.colors.text, marginBottom: tokens.space.xs },
            ]}
          >
            {t.selectHall}
          </Text>
          <ScrollView
            horizontal
            contentContainerStyle={{ gap: tokens.space.sm }}
            showsHorizontalScrollIndicator={false}
          >
            <FilterChip
              label={t.allHalls}
              onPress={() => setSelectedHallId(undefined)}
              selected={selectedHallId === undefined}
            />
            {snapshot.halls.map((hall) => (
              <FilterChip
                key={hall.id}
                label={hall.name}
                onPress={() => setSelectedHallId(hall.id)}
                selected={selectedHallId === hall.id}
              />
            ))}
          </ScrollView>
        </View>

        {/* Durum filtreleri ekranın altındaki başparmak şeridine taşındı. */}

        {searchOpen ? (
          <ServiceTextField
            autoFocus
            hideLabel
            label={t.searchTableOrWaiter}
            onChangeText={setQuery}
            placeholder={t.searchTableOrWaiter}
            returnKeyType="search"
            value={query}
          />
        ) : null}

        {visibleTables.length === 0 ? (
          <ServiceEmptyState body={t.askManagerForTables} icon="grid-outline" title={t.noTables} />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm }}>
            {/*
              Kart, tutarı ve hesap sayısını doğrudan gösteriyor: garson hangi masaya
              gideceğine karar vermek için artık masaları tek tek açmak zorunda değil.
            */}
            {visibleTables.map((table) => (
              <View key={table.id} style={{ flexBasis: '48%', flexGrow: 1, minWidth: 156 }}>
                <ServiceTableCard
                  onLongPress={() => setActionTargetId(table.id)}
                  onMore={() => setActionTargetId(table.id)}
                  onPress={() => navigation.navigate('TableDetail', { tableId: table.id })}
                  table={table}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/*
        Başparmak şeridi. Servis sırasında en sık kullanılan iki şey — durum filtresi
        ve yeni sipariş — ekranın alt kenarında, telefonu tek elle tutan başparmağın
        doğal yayında duruyor. Eskiden filtreler en üstteydi: her dokunuş için elin
        yeniden konumlanması gerekiyordu.
      */}
      <View
        style={[
          {
            backgroundColor: tokens.colors.surface,
            borderTopColor: tokens.colors.borderLight,
            borderTopWidth: 1,
            gap: tokens.space.xs,
            paddingHorizontal: tokens.space.sm,
            paddingVertical: tokens.space.xs,
          },
          tokens.elevation.sticky,
        ]}
      >
        {/*
          Rozetler ve asıl eylem ayrı satırlarda. Tek satıra sığdırıldığında hero
          düğmesi şeridin yarısını yiyor ve ikinci rozet ortasından kesiliyordu.
        */}
        <ScrollView
          contentContainerStyle={{ alignItems: 'center', gap: tokens.space.xs }}
          horizontal
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
        >
          <FilterChip
            label={t.all}
            onPress={() => selectFilter('all')}
            selected={statusFilter === 'all'}
          />
          <FilterChip
            count={snapshot.openCount}
            label={t.openState}
            onPress={() => selectFilter('open')}
            selected={statusFilter === 'open'}
          />
          <FilterChip
            label={t.paymentDueState}
            onPress={() => selectFilter('payment')}
            selected={statusFilter === 'payment'}
          />
          <FilterChip
            label={t.availableState}
            onPress={() => selectFilter('available')}
            selected={statusFilter === 'available'}
          />
          <FilterChip
            count={snapshot.attentionCount || undefined}
            label={t.mine}
            onPress={() => selectFilter('mine')}
            selected={statusFilter === 'mine'}
          />
        </ScrollView>

        <ServiceButton
          accessibilityLabel={t.newOrder}
          fullWidth
          icon="add"
          label={t.newOrder}
          onPress={() => {
            haptic('activate');
            navigation.navigate('NewOrder');
          }}
          size="hero"
          variant="accent"
        />
      </View>

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

function FilterChip({
  label,
  onPress,
  selected,
  count,
}: {
  readonly label: string;
  readonly onPress: () => void;
  readonly selected: boolean;
  readonly count?: number;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityLabel={count && count > 0 ? `${label}, ${count}` : label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: selected ? tokens.colors.accent : tokens.colors.surfaceAlt,
        borderColor: selected ? tokens.colors.accent : tokens.colors.border,
        borderRadius: tokens.radius.full,
        borderWidth: 1,
        flexDirection: 'row',
        gap: tokens.space.xxs,
        justifyContent: 'center',
        // 44 yerine 48: Android'in dokunma hedefi tabanı ve uygulamanın kendi token'ı.
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
      {count !== undefined && count > 0 ? (
        <Text
          style={[
            tokens.typography.caption,
            {
              color: selected ? tokens.colors.primaryContrast : tokens.colors.textSubtle,
            },
          ]}
        >
          {count}
        </Text>
      ) : null}
    </Pressable>
  );
}
