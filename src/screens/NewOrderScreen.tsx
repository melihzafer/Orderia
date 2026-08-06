import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useOrderiaData } from '../data/runtime';
import {
  ServiceButton,
  ServiceChoiceCard,
  ServiceEmptyState,
  ServiceListRow,
  ServiceRowGroup,
  ServiceSectionHeader,
  ServiceSurface,
  ServiceStatusPill,
  ServiceSkeleton,
  useAdaptiveLayout,
} from '../design-system';
import { loadDomainShiftBoard, ShiftBoardSnapshot } from '../features/service-board';
import { useLocalization } from '../i18n';
import { RootStackParamList } from '../navigation/routes';
import { useLayoutStore } from '../stores';
import { Table } from '../types';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

interface NewOrderTable {
  readonly id: string;
  readonly label: string;
  readonly sequenceNumber: number;
  readonly available: boolean;
  readonly capacity?: number;
}

interface NewOrderHall {
  readonly id: string;
  readonly name: string;
  readonly sortOrder: number;
  readonly tables: readonly NewOrderTable[];
}

const emptySnapshot: ShiftBoardSnapshot = {
  halls: [],
  tables: [],
  openCount: 0,
  attentionCount: 0,
  totalOpenMinor: 0,
};

export default function NewOrderScreen() {
  const navigation = useNavigation<Navigation>();
  const { tokens } = useTheme();
  const { currency, t } = useLocalization();
  const auth = useAuth();
  const layout = useAdaptiveLayout();
  const { database, mode, readiness, revision, resolveProfileNames, scope } = useOrderiaData();
  const legacyHalls = useLayoutStore((state) => state.halls);
  const legacyTables = useLayoutStore((state) => state.tables);
  const [cloudSnapshot, setCloudSnapshot] = useState<ShiftBoardSnapshot | null>(null);
  const [selectedHallId, setSelectedHallId] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const cloudMode = mode === 'cloud' && scope !== null;

  const loadCloud = useCallback(async () => {
    if (!database || !scope) return emptySnapshot;
    return loadDomainShiftBoard(database, scope, {
      currentUserId: auth.session?.user.id,
      fallbackCurrencyCode: auth.activeBranch?.currency_code ?? currency,
      fallbackHallName: t.unassignedHall,
      unknownWaiterName: t.unknownWaiter,
      resolveWaiterNames: resolveProfileNames,
    });
  }, [
    auth.activeBranch?.currency_code,
    auth.session?.user.id,
    currency,
    database,
    resolveProfileNames,
    scope,
    t.unassignedHall,
    t.unknownWaiter,
  ]);

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
        if (active) setError(t.newOrderLoadFailed);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [cloudMode, loadCloud, revision, t.newOrderLoadFailed]);

  const legacyPickerHalls = useMemo<readonly NewOrderHall[]>(
    () =>
      legacyHalls.map((hall, hallIndex) => ({
        id: hall.id,
        name: hall.name,
        sortOrder: hallIndex,
        tables: legacyTables
          .filter((table) => table.hallId === hall.id)
          .sort((left, right) => left.seq - right.seq)
          .map((table) => legacyTable(table)),
      })),
    [legacyHalls, legacyTables],
  );

  const cloudPickerHalls = useMemo<readonly NewOrderHall[]>(
    () =>
      (cloudSnapshot ?? emptySnapshot).halls.map((hall) => ({
        id: hall.id,
        name: hall.name,
        sortOrder: hall.sortOrder,
        tables: (cloudSnapshot ?? emptySnapshot).tables
          .filter((table) => table.hallId === hall.id)
          .map((table) => ({
            id: table.id,
            label: table.label || `${t.table} ${table.sequenceNumber}`,
            sequenceNumber: table.sequenceNumber,
            available: table.state === 'available',
            ...(table.capacity === undefined ? {} : { capacity: table.capacity }),
          })),
      })),
    [cloudSnapshot, t.table],
  );

  const halls = cloudMode ? cloudPickerHalls : legacyPickerHalls;
  const selectedHall = halls.find((hall) => hall.id === selectedHallId) ?? halls[0];
  const availableCount = halls.reduce(
    (count, hall) => count + hall.tables.filter((table) => table.available).length,
    0,
  );

  useEffect(() => {
    if (!selectedHall || selectedHall.id === selectedHallId) return;
    setSelectedHallId(selectedHall.id);
  }, [selectedHall, selectedHallId]);

  const refresh = async () => {
    if (!cloudMode) return;
    setLoading(true);
    try {
      setCloudSnapshot(await loadCloud());
      setError(undefined);
    } catch {
      setError(t.newOrderLoadFailed);
    } finally {
      setLoading(false);
    }
  };

  if (loading || (cloudMode && readiness === 'opening' && !cloudSnapshot)) {
    return (
      <SafeAreaView
        edges={['top', 'bottom', 'left', 'right']}
        style={{ backgroundColor: tokens.colors.bg, flex: 1 }}
      >
        <View
          style={{
            alignSelf: 'center',
            maxWidth: tokens.sizing.contentMaximumWidth,
            padding: layout.horizontalPadding,
            width: '100%',
          }}
        >
          <ServiceSkeleton height={32} label={t.loading} width="55%" />
          <ServiceSkeleton
            height={88}
            label={t.selectHall}
            style={{ marginTop: tokens.space.lg }}
          />
          <ActivityIndicator color={tokens.colors.primary} style={{ marginTop: tokens.space.lg }} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && halls.length === 0) {
    return (
      <SafeAreaView
        edges={['top', 'bottom', 'left', 'right']}
        style={{ backgroundColor: tokens.colors.bg, flex: 1 }}
      >
        <View style={{ flex: 1, justifyContent: 'center', padding: layout.horizontalPadding }}>
          <ServiceEmptyState
            action={{ label: t.retrySync, onPress: () => void refresh() }}
            body={error}
            icon="alert-circle-outline"
            title={t.error}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (halls.length === 0) {
    return (
      <SafeAreaView
        edges={['top', 'bottom', 'left', 'right']}
        style={{ backgroundColor: tokens.colors.bg, flex: 1 }}
      >
        <View style={{ flex: 1, justifyContent: 'center', padding: layout.horizontalPadding }}>
          <ServiceEmptyState
            action={
              auth.activeMembership?.role === 'manager'
                ? { label: t.configureTables, onPress: () => navigation.navigate('AddHall', {}) }
                : undefined
            }
            body={t.noHalls}
            icon="business-outline"
            title={t.noHalls}
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
          maxWidth: tokens.sizing.contentMaximumWidth,
          paddingBottom: tokens.space.md,
          paddingHorizontal: layout.horizontalPadding,
          paddingTop: tokens.space.md,
          width: '100%',
        }}
      >
        <View
          style={{
            alignItems: 'flex-start',
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1, marginRight: tokens.space.md }}>
            <Text style={[tokens.typography.title, { color: tokens.colors.text }]}>
              {t.newOrder}
            </Text>
            <Text
              style={[
                tokens.typography.body,
                { color: tokens.colors.textSubtle, marginTop: tokens.space.xs },
              ]}
            >
              {t.newOrderSubtitle}
            </Text>
          </View>
          <ServiceButton icon="close" label={t.close} onPress={navigation.goBack} variant="ghost" />
        </View>

        {error ? (
          <ServiceSurface
            accessibilityRole="alert"
            style={{ borderColor: tokens.colors.warning, marginTop: tokens.space.md }}
            variant="outlined"
          >
            <Text style={[tokens.typography.body, { color: tokens.colors.text }]}>{error}</Text>
            <ServiceButton
              label={t.retrySync}
              onPress={() => void refresh()}
              style={{ marginTop: tokens.space.sm }}
              variant="outline"
            />
          </ServiceSurface>
        ) : null}

        <ServiceSectionHeader title={t.selectHall} />
        <View accessibilityRole="radiogroup" style={{ gap: tokens.space.xs }}>
          {halls.map((hall) => (
            <ServiceChoiceCard
              description={`${hall.tables.length} ${t.tables}`}
              icon="business-outline"
              key={hall.id}
              onPress={() => setSelectedHallId(hall.id)}
              selected={hall.id === selectedHall?.id}
              title={hall.name}
            />
          ))}
        </View>

        <ServiceSectionHeader title={t.selectTableForOrder} />
        <ServiceSurface padding="none">
          {selectedHall?.tables.length ? (
            <ServiceRowGroup>
              {selectedHall.tables.map((table, index) => (
                <ServiceListRow
                  accessory="chevron"
                  icon="grid-outline"
                  iconTone={table.available ? 'success' : 'neutral'}
                  key={table.id}
                  last={index === selectedHall.tables.length - 1}
                  onPress={() => navigation.navigate('TableDetail', { tableId: table.id })}
                  subtitle={
                    table.available && table.capacity
                      ? `${table.capacity} ${t.seatsCount}`
                      : undefined
                  }
                  title={table.label}
                  value={table.available ? undefined : t.openState}
                />
              ))}
            </ServiceRowGroup>
          ) : (
            <ServiceEmptyState
              body={t.noTablesInSelectedHall}
              icon="grid-outline"
              title={t.noTables}
            />
          )}
        </ServiceSurface>

        {availableCount === 0 ? (
          <View style={{ marginTop: tokens.space.md }}>
            <ServiceStatusPill
              icon="information-circle-outline"
              label={t.noAvailableTables}
              tone="warning"
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function legacyTable(table: Table): NewOrderTable {
  return {
    id: table.id,
    label: table.label || `Table ${table.seq}`,
    sequenceNumber: table.seq,
    available: !table.isOpen,
  };
}
