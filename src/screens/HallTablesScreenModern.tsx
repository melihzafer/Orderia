import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOrderiaData } from '../data/runtime';
import { useTheme } from '../contexts/ThemeContext';
import {
  haptic,
  ServiceAction,
  ServiceActionSheet,
  ServiceButton,
  ServiceConfirmSheet,
  ServiceEmptyState,
  ServiceIconButton,
  ServiceMetricTile,
  ServiceStatusPill,
  ServiceSurface,
  useAdaptiveLayout,
  useSnackbar,
} from '../design-system';
import { SupabaseLayoutGateway, toLegacyLayout } from '../features/layout-management';
import { useLocalization } from '../i18n';
import { RootStackParamList } from '../navigation/routes';
import { getSupabaseClient } from '../services/supabase';
import { useLayoutStore, useOrderStore } from '../stores';
import { Table, Ticket } from '../types';

type HallTablesRoute = RouteProp<RootStackParamList, 'HallTables'>;
type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function HallTablesScreenModern() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<HallTablesRoute>();
  const { tokens } = useTheme();
  const { t, formatPrice } = useLocalization();
  const layout = useAdaptiveLayout();
  const data = useOrderiaData();
  const client = getSupabaseClient();
  const cloudGateway = useMemo(() => (client ? new SupabaseLayoutGateway(client) : null), [client]);
  const cloudMode = data.mode === 'cloud' && data.scope !== null;
  const halls = useLayoutStore((state) => state.halls);
  const tables = useLayoutStore((state) => state.tables);
  const deleteTable = useLayoutStore((state) => state.deleteTable);
  const [cloudLayout, setCloudLayout] = useState<Awaited<
    ReturnType<SupabaseLayoutGateway['load']>
  > | null>(null);
  const [cloudError, setCloudError] = useState<string>();
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
  }, [cloudMode, data.revision, loadCloudLayout, t.refreshFailed]);

  const managedLayout = cloudMode && cloudLayout ? toLegacyLayout(cloudLayout) : { halls, tables };
  const hall = managedLayout.halls.find((candidate) => candidate.id === route.params.hallId);
  const hallTables = useMemo(
    () =>
      managedLayout.tables
        .filter((table) => table.hallId === route.params.hallId)
        .sort((left, right) => left.seq - right.seq),
    [managedLayout.tables, route.params.hallId],
  );
  const openTables = hallTables.filter((table) => table.isOpen).length;
  const { getTicketsByTable, getTicketTotal } = useOrderStore();

  const { show } = useSnackbar();
  // Bağlamsal eylem ve onay yüzeyleri hedef masayı kimlikle taşır: liste yenilenirken
  // elde tutulan bir nesne bayatlarsa yanlış masa silinebilirdi.
  const [actionTargetId, setActionTargetId] = useState<string>();
  const [pendingDeleteId, setPendingDeleteId] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const actionTarget = hallTables.find((table) => table.id === actionTargetId);
  const pendingDelete = hallTables.find((table) => table.id === pendingDeleteId);

  const openTableActions = (table: Table) => {
    haptic('activate');
    setActionTargetId(table.id);
  };

  const requestDelete = (table: Table) => {
    // Açık masa silinemez; bunu bir hata diyaloğu yerine eylem listesinde
    // devre dışı bir satır olarak göstermek daha erken anlatır, ama yine de
    // buraya doğrudan gelinirse sessizce geçmek yerine sebebi söylenir.
    if (table.isOpen) {
      haptic('warning');
      show({ message: t.tableDeleteBlocked, tone: 'warning' });
      return;
    }
    setPendingDeleteId(table.id);
  };

  const performDelete = async (table: Table) => {
    setDeleting(true);
    try {
      if (cloudMode && cloudGateway && data.scope) {
        await cloudGateway.archiveTable(data.scope, table.id);
        await data.refresh().catch(() => undefined);
        const next = await loadCloudLayout();
        if (next) setCloudLayout(next);
      } else {
        deleteTable(table.id);
      }
      setPendingDeleteId(undefined);
      haptic('success');
      show({ message: t.tableDeleted, tone: 'success' });
    } catch (error) {
      // Ham hata metni kullanıcıya gitmez; telemetriye zaten Sentry taşıyor.
      setPendingDeleteId(undefined);
      haptic('error');
      show({ message: error instanceof Error ? error.message : t.genericError, tone: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const tableActions = (table: Table): readonly ServiceAction[] => [
    {
      icon: 'open-outline',
      id: 'open',
      label: t.tableDetail,
      onPress: () => navigation.navigate('TableDetail', { tableId: table.id }),
    },
    {
      icon: 'pencil-outline',
      id: 'edit',
      label: t.editTable,
      onPress: () => navigation.navigate('EditTable', { tableId: table.id }),
    },
    {
      description: table.isOpen ? t.tableDeleteBlocked : undefined,
      destructive: true,
      disabled: table.isOpen,
      icon: 'trash-outline',
      id: 'delete',
      label: t.deleteTable,
      onPress: () => requestDelete(table),
    },
  ];

  if (!hall && cloudMode && !cloudLayout) {
    return (
      <SafeAreaView style={{ backgroundColor: tokens.colors.bg, flex: 1 }}>
        <ServiceSurface style={{ margin: tokens.space.lg }}>
          <Text style={[tokens.typography.body, { color: tokens.colors.textSubtle }]}>
            {t.loading}
          </Text>
        </ServiceSurface>
      </SafeAreaView>
    );
  }

  if (!hall) {
    return (
      <SafeAreaView style={{ backgroundColor: tokens.colors.bg, flex: 1 }}>
        <ServiceEmptyState
          action={{ label: t.close, onPress: navigation.goBack }}
          body={t.tableNotFound}
          icon="business-outline"
          title={t.tableNotFound}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
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
      >
        {cloudError ? (
          <ServiceSurface accessibilityRole="alert" variant="outlined">
            <Text style={[tokens.typography.body, { color: tokens.colors.error }]}>
              {cloudError}
            </Text>
          </ServiceSurface>
        ) : null}
        <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: tokens.space.md }}>
          <View style={{ flex: 1 }}>
            <Text style={[tokens.typography.title, { color: tokens.colors.text }]}>
              {hall.name}
            </Text>
            <Text
              style={[tokens.typography.body, { color: tokens.colors.textSubtle, marginTop: 4 }]}
            >
              {hallTables.length} {t.tables}
            </Text>
          </View>
          <ServiceButton
            icon="add"
            label={t.addTable}
            onPress={() => navigation.navigate('AddTable', { hallId: hall.id })}
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

        {hallTables.length === 0 ? (
          <ServiceEmptyState
            action={{
              label: t.addTable,
              onPress: () => navigation.navigate('AddTable', { hallId: hall.id }),
            }}
            body={t.noTablesConfigured}
            icon="grid-outline"
            title={t.noTables}
          />
        ) : (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: tokens.space.sm,
            }}
          >
            {hallTables.map((table) => (
              <TableStatusCard
                formatPrice={formatPrice}
                getTicketTotal={getTicketTotal}
                getTicketsByTable={getTicketsByTable}
                key={table.id}
                layoutMode={layout.mode}
                onOpen={() => navigation.navigate('TableDetail', { tableId: table.id })}
                onShowActions={() => openTableActions(table)}
                table={table}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <ServiceActionSheet
        actions={actionTarget ? tableActions(actionTarget) : []}
        cancelLabel={t.cancel}
        onClose={() => setActionTargetId(undefined)}
        title={actionTarget?.label || `${t.tableName} ${actionTarget?.seq ?? ''}`.trim()}
        visible={actionTarget !== undefined}
      />

      <ServiceConfirmSheet
        body={t.deleteTableConfirm}
        busy={deleting}
        cancelLabel={t.cancel}
        confirmLabel={t.deleteTable}
        destructive
        onClose={() => setPendingDeleteId(undefined)}
        onConfirm={() => {
          if (pendingDelete) void performDelete(pendingDelete);
        }}
        title={t.deleteTable}
        visible={pendingDelete !== undefined}
      />
    </SafeAreaView>
  );
}

/**
 * Kart yalnızca "masayı aç" işini taşır. Düzenleme ve silme, her kartın altında
 * duran kalıcı düğme çifti yerine bağlamsal eylem listesine taşındı: on iki masalı
 * bir salonda o düğmeler yirmi dört rakip hedef üretiyor ve silmeyi tek dokunuş
 * uzağa koyuyordu. Listeye iki yol çıkar — uzun basış ve görünür taşma düğmesi —
 * böylece hiçbir işlem yalnızca gizli bir harekete bağlı kalmaz.
 */
function TableStatusCard({
  table,
  layoutMode,
  formatPrice,
  getTicketsByTable,
  getTicketTotal,
  onOpen,
  onShowActions,
}: {
  readonly table: Table;
  readonly layoutMode: 'compact' | 'medium' | 'expanded';
  readonly formatPrice: (amount: number) => string;
  readonly getTicketsByTable: (tableId: string) => Ticket[];
  readonly getTicketTotal: (ticketId: string) => number;
  readonly onOpen: () => void;
  readonly onShowActions: () => void;
}) {
  const { tokens } = useTheme();
  const { t } = useLocalization();
  const tickets = getTicketsByTable(table.id) ?? [];
  const total = tickets.reduce((sum, ticket) => sum + getTicketTotal(ticket.id), 0);
  const label = table.label || `${t.tableName} ${table.seq}`;

  return (
    <View
      style={{
        flexBasis: layoutMode === 'expanded' ? '31%' : '48%',
        flexGrow: 1,
        minWidth: 148,
      }}
    >
      <Pressable
        accessibilityHint={t.tableDetail}
        accessibilityLabel={label}
        accessibilityRole="button"
        delayLongPress={350}
        onLongPress={onShowActions}
        onPress={onOpen}
        style={({ pressed }) => ({
          backgroundColor: table.isOpen ? tokens.colors.accentSoft : tokens.colors.surface,
          borderColor: table.isOpen ? tokens.colors.accent : tokens.colors.borderLight,
          borderRadius: tokens.radius.large,
          borderWidth: table.isOpen ? 2 : 1,
          minHeight: 142,
          opacity: pressed ? 0.82 : 1,
          padding: tokens.space.md,
        })}
      >
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', gap: tokens.space.xs }}>
            <View style={{ flex: 1, gap: tokens.space.xs }}>
              <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
                {label}
              </Text>
              <ServiceStatusPill
                dot
                label={table.isOpen ? t.open : t.availableState}
                size="small"
                tone={table.isOpen ? 'warning' : 'success'}
              />
            </View>
            <ServiceIconButton
              icon="ellipsis-horizontal"
              label={`${label} — ${t.moreActions}`}
              onPress={onShowActions}
              style={{ marginRight: -tokens.space.xs, marginTop: -tokens.space.xs }}
            />
          </View>
          {table.isOpen ? (
            <View>
              <Text style={[tokens.typography.title, { color: tokens.colors.accent }]}>
                {formatPrice(total)}
              </Text>
              <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
                {tickets.length} {t.orders}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}
