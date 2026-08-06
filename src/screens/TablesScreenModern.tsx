import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useOrderiaData } from '../data/runtime';
import { useLocalization } from '../i18n';
import {
  haptic,
  ServiceButton,
  ServiceConfirmSheet,
  ServiceEmptyState,
  ServiceMetricTile,
  ServiceSkeleton,
  ServiceSurface,
  useAdaptiveLayout,
  useSnackbar,
} from '../design-system';
import { SupabaseLayoutGateway, toLegacyLayout } from '../features/layout-management';
import { RootStackParamList } from '../navigation/routes';
import { getSupabaseClient } from '../services/supabase';
import { useLayoutStore } from '../stores';
import { Hall, Table } from '../types';

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type HallWithTables = Hall & { tables: Table[] };

export default function TablesScreen() {
  const navigation = useNavigation<Navigation>();
  const auth = useAuth();
  const { tokens } = useTheme();
  const { t } = useLocalization();
  const layout = useAdaptiveLayout();
  const data = useOrderiaData();
  const client = getSupabaseClient();
  const cloudGateway = useMemo(() => (client ? new SupabaseLayoutGateway(client) : null), [client]);
  const halls = useLayoutStore((state) => state.halls);
  const tables = useLayoutStore((state) => state.tables);
  const deleteHall = useLayoutStore((state) => state.deleteHall);
  const [refreshing, setRefreshing] = useState(false);
  const [cloudLayout, setCloudLayout] = useState<Awaited<
    ReturnType<SupabaseLayoutGateway['load']>
  > | null>(null);
  const [cloudError, setCloudError] = useState<string>();
  const [pendingDeleteId, setPendingDeleteId] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const { show } = useSnackbar();
  const cloudMode = data.mode === 'cloud' && data.scope !== null;

  const loadCloudLayout = useCallback(async () => {
    if (!cloudGateway || !data.scope) return null;
    return cloudGateway.load(data.scope);
  }, [cloudGateway, data.scope]);

  useEffect(() => {
    if (!cloudMode) {
      setCloudLayout(null);
      setCloudError(undefined);
      return;
    }

    let active = true;
    void loadCloudLayout()
      .then((next) => {
        if (!active || !next) return;
        setCloudLayout(next);
        setCloudError(undefined);
      })
      .catch(() => {
        if (active) setCloudError(t.refreshFailed);
      });
    return () => {
      active = false;
    };
  }, [cloudMode, loadCloudLayout, data.revision, t.refreshFailed]);

  // Subscribe to the actual arrays as well as the actions. Without this,
  // adding a hall/table could succeed in storage while this screen stayed stale.
  const managedLayout = cloudMode && cloudLayout ? toLegacyLayout(cloudLayout) : { halls, tables };
  const hallsWithTables = useMemo<HallWithTables[]>(
    () =>
      managedLayout.halls.map((hall) => ({
        ...hall,
        tables: managedLayout.tables.filter((table) => table.hallId === hall.id),
      })),
    [managedLayout.halls, managedLayout.tables],
  );
  const openTables = managedLayout.tables.filter((table) => table.isOpen).length;

  const onRefresh = useCallback(() => {
    void (async () => {
      setRefreshing(true);
      try {
        if (cloudMode) {
          const next = await loadCloudLayout();
          if (next) setCloudLayout(next);
        }
        setCloudError(undefined);
      } catch {
        setCloudError(t.refreshFailed);
      } finally {
        setRefreshing(false);
      }
    })();
  }, [cloudMode, loadCloudLayout, t.refreshFailed]);

  const pendingDelete = hallsWithTables.find((hall) => hall.id === pendingDeleteId);

  const requestDeleteHall = (hall: HallWithTables) => {
    // Açık masası olan salon silinemez. Bunu bir hata diyaloğu yerine snackbar ile
    // söylüyoruz: engel bilgisi, ekranı kaplayan bir onay penceresi hak etmiyor.
    if (hall.tables.some((table) => table.isOpen)) {
      haptic('warning');
      show({ message: t.hallDeleteBlocked, tone: 'warning' });
      return;
    }
    setPendingDeleteId(hall.id);
  };

  const performDeleteHall = async (hall: HallWithTables) => {
    setDeleting(true);
    try {
      if (cloudMode && cloudGateway && data.scope) {
        await cloudGateway.archiveHall(data.scope, hall.id);
        await data.refresh().catch(() => undefined);
        const next = await loadCloudLayout();
        if (next) setCloudLayout(next);
      } else {
        deleteHall(hall.id);
      }
      setPendingDeleteId(undefined);
      haptic('success');
      show({ message: t.hallDeleted, tone: 'success' });
    } catch (error) {
      setPendingDeleteId(undefined);
      haptic('error');
      show({ message: error instanceof Error ? error.message : t.genericError, tone: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const isManager = auth.status === 'unconfigured' || auth.activeMembership?.role === 'manager';

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ backgroundColor: tokens.colors.bg, flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{
          alignSelf: 'center',
          gap: tokens.space.md,
          maxWidth: tokens.sizing.contentMaximumWidth,
          paddingBottom: tokens.space.md,
          paddingHorizontal: layout.horizontalPadding,
          paddingTop: tokens.space.lg,
          width: '100%',
        }}
        refreshControl={
          <RefreshControl
            onRefresh={onRefresh}
            refreshing={refreshing}
            tintColor={tokens.colors.primary}
          />
        }
      >
        {cloudError ? (
          <ServiceSurface accessibilityRole="alert" variant="outlined">
            <Text style={[tokens.typography.body, { color: tokens.colors.error }]}>
              {cloudError}
            </Text>
          </ServiceSurface>
        ) : null}
        {cloudMode && !cloudLayout ? <ServiceSkeleton height={112} label={t.loading} /> : null}
        <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: tokens.space.md }}>
          <View style={{ flex: 1 }}>
            <Text style={[tokens.typography.title, { color: tokens.colors.text }]}>
              {t.selectHall}
            </Text>
            <Text
              style={[tokens.typography.body, { color: tokens.colors.textSubtle, marginTop: 4 }]}
            >
              {t.newOrderSubtitle}
            </Text>
          </View>
          <ServiceButton
            icon="add"
            label={t.addHall}
            onPress={() => navigation.navigate('AddHall', {})}
            variant="primary"
          />
        </View>

        <View style={{ flexDirection: 'row', gap: tokens.space.xs }}>
          <ServiceMetricTile
            label={t.openTables}
            tone={openTables > 0 ? 'warning' : 'neutral'}
            value={String(openTables)}
          />
        </View>

        {hallsWithTables.length === 0 && (!cloudMode || cloudLayout) ? (
          <ServiceEmptyState
            action={
              isManager
                ? { label: t.addFirstHall, onPress: () => navigation.navigate('AddHall', {}) }
                : undefined
            }
            body={t.configureTablesDescription}
            icon="business-outline"
            title={t.noHalls}
          />
        ) : (
          <View style={{ gap: tokens.space.sm }}>
            {hallsWithTables.map((hall) => (
              <HallPickerCard
                hall={hall}
                key={hall.id}
                onDelete={() => requestDeleteHall(hall)}
                onEdit={() => navigation.navigate('AddHall', { hallId: hall.id })}
                onOpen={() => navigation.navigate('HallTables', { hallId: hall.id })}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <ServiceConfirmSheet
        body={t.deleteHallConfirm}
        busy={deleting}
        cancelLabel={t.cancel}
        confirmLabel={t.deleteHall}
        destructive
        onClose={() => setPendingDeleteId(undefined)}
        onConfirm={() => {
          if (pendingDelete) void performDeleteHall(pendingDelete);
        }}
        title={t.deleteHall}
        visible={pendingDelete !== undefined}
      />
    </SafeAreaView>
  );
}

function HallPickerCard({
  hall,
  onOpen,
  onEdit,
  onDelete,
}: {
  readonly hall: HallWithTables;
  readonly onOpen: () => void;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
}) {
  const { tokens } = useTheme();
  const { t } = useLocalization();
  const openCount = hall.tables.filter((table) => table.isOpen).length;

  return (
    <ServiceSurface padding="none" variant="raised">
      <Pressable
        accessibilityHint={t.selectTableForOrder}
        accessibilityLabel={hall.name}
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => ({
          borderRadius: tokens.radius.large,
          opacity: pressed ? 0.82 : 1,
          padding: tokens.space.md,
        })}
      >
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: tokens.space.sm }}>
          <View
            style={{
              alignItems: 'center',
              backgroundColor: tokens.colors.accentSoft,
              borderRadius: tokens.radius.medium,
              height: 48,
              justifyContent: 'center',
              width: 48,
            }}
          >
            <Ionicons color={tokens.colors.accent} name="business-outline" size={24} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
              {hall.name}
            </Text>
            <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
              {hall.tables.length} {t.tables}
              {openCount > 0 ? ` · ${openCount} ${t.openTablesSummary}` : ''}
            </Text>
          </View>
          <Text style={[tokens.typography.title, { color: tokens.colors.textSubtle }]}>›</Text>
        </View>
      </Pressable>
      <View
        style={{
          alignItems: 'stretch',
          borderTopColor: tokens.colors.borderLight,
          borderTopWidth: 1,
          flexDirection: 'row',
          gap: tokens.space.xs,
          minHeight: 56,
          paddingHorizontal: tokens.space.sm,
          paddingVertical: tokens.space.xs,
        }}
      >
        <ServiceButton
          icon="pencil-outline"
          label={t.editHall}
          onPress={onEdit}
          style={{ flex: 1 }}
          variant="outline"
        />
        <ServiceButton
          icon="trash-outline"
          label={t.deleteHall}
          onPress={onDelete}
          style={{ flex: 1 }}
          variant="ghost"
        />
      </View>
    </ServiceSurface>
  );
}
