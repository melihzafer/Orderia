import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LegacyTableDetailScreen from './LegacyTableDetailScreen';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useOrderiaData } from '../data/runtime';
import {
  haptic,
  ServiceButton,
  ServiceEmptyState,
  ServiceIconButton,
  ServiceListRow,
  ServiceStatusPill,
  useAdaptiveLayout,
} from '../design-system';
import {
  CancellationReason,
  Check,
  CheckId,
  DeviceId,
  FulfillmentGroup,
  MutationId,
  OrderItem,
  Receipt,
  RestaurantTableId,
  UserId,
  calculateOrderItemTotal,
  toDomainId,
} from '../domain';
import {
  applyCheckSplit,
  CancellationModal,
  CenteredState,
  CheckSplitPlan,
  CheckSplitSheet,
  CheckStrip,
  clientMutationUuid,
  countOrderViews,
  DeleteCheckModal,
  DraftBar,
  filterOrderItems,
  formatMoney,
  getFulfillmentGroup,
  ItemNoteModal,
  LocationNoteModal,
  markOrderItemsServed,
  ModalActions,
  NameCheckModal,
  OrderPane,
  type OrderView,
  PalettePane,
  ProductConfigurationModal,
  renameCheck,
  resolveOrderItemNoteConflict,
  TableWorkspaceSnapshot,
  updateOrderItemNote,
  updateOrderItemQuantity,
  updateTableSessionNote,
  useTableWorkspace,
  useWorkspaceDraft,
  voidCheck,
  voidOrderItemQuantity,
  WorkspaceHeader,
  WorkspaceModal,
  workspaceCopy,
} from '../features/table-workspace';
import { ConfirmCheckPaymentsCommand, PaymentSheet } from '../features/payments';
import {
  TableOperationSheet,
  TableOperationTarget,
  TransferTableSessionCommand,
} from '../features/table-operations';
import { PreparedReceiptPdf, ReceiptReadySheet, presentReceiptPdf } from '../features/receipts';
import { useLocalization } from '../i18n';
import { RootStackParamList } from '../navigation/routes';
import { useProductPhotoStore } from '../stores';
import { useSettingsStore } from '../stores/settingsStore';

type TableDetailRoute = RouteProp<RootStackParamList, 'TableDetail'>;
type Navigation = NativeStackNavigationProp<RootStackParamList>;
type NoticeTone = 'error' | 'success';

interface WorkspaceNotice {
  readonly title: string;
  readonly body?: string;
  readonly tone: NoticeTone;
}

export default function TableDetailScreen() {
  const data = useOrderiaData();
  const auth = useAuth();

  if (
    data.mode !== 'cloud' ||
    !data.database ||
    !data.scope ||
    !auth.session ||
    !auth.currentDeviceId
  ) {
    return <LegacyTableDetailScreen />;
  }

  return (
    <CloudTableWorkspace
      actorUserId={toDomainId<UserId>(auth.session.user.id)}
      deviceId={toDomainId<DeviceId>(auth.currentDeviceId)}
      isManager={auth.activeMembership?.role === 'manager'}
      preferencesKey={`${data.scope.organizationId}.${data.scope.branchId}.${auth.session.user.id}`}
    />
  );
}

function CloudTableWorkspace({
  actorUserId,
  deviceId,
  isManager,
  preferencesKey,
}: {
  readonly actorUserId: UserId;
  readonly deviceId: DeviceId;
  readonly isManager: boolean;
  readonly preferencesKey: string;
}) {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<TableDetailRoute>();
  const { language } = useLocalization();
  const copy = workspaceCopy(language);
  const { tokens } = useTheme();
  const layout = useAdaptiveLayout();
  const showItemPhotos = useSettingsStore((state) => state.showItemPhotos);
  const orderBatchesEnabled = useSettingsStore((state) => state.orderBatches);
  const namedOrdersEnabled = useSettingsStore((state) => state.namedOrders);
  const locationNotesEnabled = useSettingsStore((state) => state.locationNotes);
  const personAccountsEnabled = useSettingsStore((state) => state.personAccounts);
  const quickCashEnabled = useSettingsStore((state) => state.quickCash);
  const confirmBeforeClose = useSettingsStore((state) => state.confirmBeforeClose);
  const fulfillmentSplitEnabled = useSettingsStore((state) => state.fulfillmentSplit);
  const drinksReminderEnabled = useSettingsStore((state) => state.drinksReminder);
  const photoUris = useProductPhotoStore((state) => state.photoUris);
  const {
    database,
    confirmCheckPayments,
    errorMessage: runtimeError,
    prepareReceiptPdf,
    refresh,
    scope,
    sync,
    transferOrMergeTableSession,
  } = useOrderiaData();
  const tableId = toDomainId<RestaurantTableId>(route.params.tableId);

  const {
    snapshot,
    loading,
    loadError,
    reload,
    waiterNames,
    participantNames,
    incomingMessage,
    dismissIncoming,
  } = useTableWorkspace({ tableId, actorUserId, copy });

  const [selectedCheckId, setSelectedCheckId] = useState<CheckId>();
  const [pendingCheckName, setPendingCheckName] = useState('');
  /**
   * "Yeni hesap"a basıldı, henüz gönderilmedi.
   *
   * Ayrı bir bayrak şart: bunu `selectedCheckId === undefined`'dan çıkarmak
   * işe yaramıyordu, çünkü aşağıdaki otomatik seçim efekti seçimi hemen ilk
   * hesaba geri alıyor ve garson hiçbir şey olmamış gibi görüyordu.
   */
  const [startingNewCheck, setStartingNewCheck] = useState(false);
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [checkNameInput, setCheckNameInput] = useState('');
  const [orderView, setOrderView] = useState<OrderView>('all');
  const [cancellingItem, setCancellingItem] = useState<OrderItem>();
  const [editingNoteItem, setEditingNoteItem] = useState<OrderItem>();
  const [editingNote, setEditingNote] = useState('');
  const [editingLocationNote, setEditingLocationNote] = useState(false);
  const [locationNote, setLocationNote] = useState('');
  const [payingCheck, setPayingCheck] = useState<Check>();
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [splittingCheck, setSplittingCheck] = useState<Check>();
  const [splitBusy, setSplitBusy] = useState(false);
  const [showTableOperation, setShowTableOperation] = useState(false);
  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const [tableOperationBusy, setTableOperationBusy] = useState(false);
  const [readyReceipt, setReadyReceipt] = useState<Receipt>();
  const [preparedReceiptPdf, setPreparedReceiptPdf] = useState<PreparedReceiptPdf>();
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [notice, setNotice] = useState<WorkspaceNotice>();
  const [renamingCheck, setRenamingCheck] = useState<Check>();
  const [renameCheckBusy, setRenameCheckBusy] = useState(false);
  const [deletingCheck, setDeletingCheck] = useState<Check>();
  const [deleteCheckBusy, setDeleteCheckBusy] = useState(false);

  /**
   * Uyarilari ekranin kendi seridinde gosteririz. react-native-web'de
   * Alert.alert sessizce hicbir sey yapmaz; PWA'da calisan bir garsonun
   * "gonderilemedi" uyarisini kacirmasi kabul edilemez.
   */
  const notify = useCallback((title: string, body?: string, tone: NoticeTone = 'error') => {
    setNotice({ title, ...(body ? { body } : {}), tone });
  }, []);

  // Basarili islem bildirimi kendiliginden kaybolur; hata garson kapatana
  // kadar ekranda kalir.
  useEffect(() => {
    if (notice?.tone !== 'success') return;
    const timer = setTimeout(() => setNotice(undefined), 5_000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!snapshot || startingNewCheck) return;
    if (selectedCheckId && snapshot.checks.some((check) => check.id === selectedCheckId)) return;
    setSelectedCheckId(snapshot.checks[0]?.id);
  }, [selectedCheckId, snapshot, startingNewCheck]);

  /**
   * Festival modunda ("namedOrders") sipariş adı ilk üründen ÖNCE istenmeli
   * ("Mehmet Ağa" gibi). Bu zaten "+ Yeni hesap" butonuna basınca oluyordu,
   * ama masaya ilk kez girildiğinde otomatik oluşan taslak hesap için hiç
   * tetiklenmiyordu — en sık senaryo (bir masanın İLK siparişi) isim sormadan
   * geçiyordu. Yalnızca bu ekran açıldığında, masada hiç hesap yokken, bir kez
   * sorulur.
   */
  const offeredInitialNamePrompt = useRef(false);
  useEffect(() => {
    if (!snapshot || !namedOrdersEnabled || offeredInitialNamePrompt.current) return;
    offeredInitialNamePrompt.current = true;
    if (snapshot.checks.length > 0) return;
    setStartingNewCheck(true);
    setPendingCheckName('');
    setCheckNameInput('');
    setShowCheckModal(true);
  }, [namedOrdersEnabled, snapshot]);

  // AddProductScreen'den "sipariş gönderildi" ile dönülünce ilgili hesap seçilir.
  useEffect(() => {
    if (!route.params.selectCheckId) return;
    setSelectedCheckId(toDomainId<CheckId>(route.params.selectCheckId));
    setStartingNewCheck(false);
    setPendingCheckName('');
    navigation.setParams({ selectCheckId: undefined });
  }, [navigation, route.params.selectCheckId]);

  const selectedCheck = snapshot?.checks.find((check) => check.id === selectedCheckId);
  const selectedCheckItems =
    snapshot?.orderItems.filter((item) => item.checkId === selectedCheckId) ?? [];
  const fulfillmentByItemId: Readonly<Record<string, FulfillmentGroup>> = Object.fromEntries(
    selectedCheckItems.map((item) => [
      item.id,
      getFulfillmentGroup(snapshot?.products.find((product) => product.id === item.menuItemId)),
    ]),
  );
  const visibleItems = filterOrderItems(selectedCheckItems, orderView, fulfillmentByItemId);
  const orderViewCounts = countOrderViews(selectedCheckItems, fulfillmentByItemId);
  const checkTotal = snapshot
    ? selectedCheckItems.reduce(
        (total, item) =>
          total +
          calculateOrderItemTotal(
            item,
            snapshot.orderItemModifiers.filter((modifier) => modifier.orderItemId === item.id),
          ),
        0,
      )
    : 0;
  const tableOperationTargets: readonly TableOperationTarget[] = snapshot
    ? snapshot.tables
        .filter((candidate) => candidate.id !== snapshot.table.id)
        .map((table) => ({
          table,
          ...(snapshot.activeSessions.find((session) => session.tableId === table.id)
            ? {
                session: snapshot.activeSessions.find((session) => session.tableId === table.id)!,
              }
            : {}),
        }))
    : [];

  const {
    addProduct,
    changeDraftQuantity,
    configuration,
    configurationNote,
    configuring,
    decrementDraftProduct,
    draft,
    favoriteIds,
    filteredProducts,
    paletteScope,
    query,
    removeDraftLine,
    repeatAvailable,
    repeatLastBatch,
    selectPaletteScope,
    setConfiguration,
    setConfigurationNote,
    setConfiguring,
    submit,
    submitting,
    toggleFavorite,
    totalMinor: draftTotal,
    undo,
    undoAvailable,
    applyAvailability,
    availabilityTarget,
    setAvailabilityTarget,
    setQuery,
    appendDraft,
    clearDraft,
  } = useWorkspaceDraft({
    tableId,
    snapshot,
    ...(selectedCheck ? { selectedCheck } : {}),
    pendingCheckName,
    preferencesKey,
    actorUserId,
    deviceId,
    copy,
    orderBatchesEnabled,
    notify,
    onSent: (result) => {
      setSelectedCheckId(result.check.id);
      setStartingNewCheck(false);
      setPendingCheckName('');
      setOrderView('new');
      void reload();
    },
  });

  const changeItemQuantity = async (item: OrderItem, nextQuantity: number) => {
    if (!database || !scope) return;
    try {
      await updateOrderItemQuantity({
        database,
        scope,
        actorUserId,
        deviceId,
        item,
        quantity: nextQuantity,
      });
      await reload();
      void refresh();
    } catch (error) {
      notify(copy.quantityChangeFailed, error instanceof Error ? error.message : copy.tryAgain);
    }
  };

  const markDrinksDelivered = async () => {
    if (!database || !scope || !snapshot) return;
    const drinks = snapshot.orderItems.filter(
      (item) =>
        item.status === 'ordered' &&
        getFulfillmentGroup(snapshot.products.find((product) => product.id === item.menuItemId)) ===
          'drinks',
    );
    if (drinks.length === 0) return;
    try {
      await markOrderItemsServed({ database, scope, actorUserId, deviceId, items: drinks });
      await reload();
      void refresh();
    } catch (error) {
      notify(copy.drinksDeliveryFailed, error instanceof Error ? error.message : copy.tryAgain);
    }
  };

  const cancelItem = async (reason: CancellationReason, quantity: number) => {
    if (!database || !scope || !cancellingItem || !snapshot) return;
    if (reason.requiresManager && !isManager) return;
    try {
      // Fazla gelen tek bir adet icin tum satiri silmek yerine yalnizca o
      // adet dusulur; kalanlar masada servise devam eder.
      const paidQuantity = snapshot.paymentAllocations
        .filter(
          (allocation) =>
            allocation.orderItemId === cancellingItem.id &&
            snapshot.payments.some(
              (payment) => payment.id === allocation.paymentId && payment.status === 'confirmed',
            ),
        )
        .reduce((total, allocation) => total + (allocation.quantity ?? cancellingItem.quantity), 0);
      await voidOrderItemQuantity({
        database,
        scope,
        actorUserId,
        deviceId,
        item: cancellingItem,
        modifiers: snapshot.orderItemModifiers,
        quantity,
        paidQuantity,
        reasonId: reason.id,
      });
      setCancellingItem(undefined);
      await reload();
      void refresh();
      haptic('warning');
    } catch (error) {
      notify(copy.cancelFailed, error instanceof Error ? error.message : copy.tryAgain);
    }
  };

  const renameSelectedCheck = async () => {
    if (!database || !scope || !renamingCheck || renameCheckBusy) return;
    const name = checkNameInput.trim();
    if (!name) return;
    setRenameCheckBusy(true);
    try {
      await renameCheck({ database, scope, actorUserId, deviceId, check: renamingCheck, name });
      setRenamingCheck(undefined);
      await reload();
      void refresh();
    } catch (error) {
      notify(copy.renameCheckFailed, error instanceof Error ? error.message : copy.tryAgain);
    } finally {
      setRenameCheckBusy(false);
    }
  };

  const deleteSelectedCheck = async (reason: CancellationReason) => {
    if (!database || !scope || !deletingCheck || !snapshot || deleteCheckBusy) return;
    if (reason.requiresManager && !isManager) return;
    // Ödemesi onaylanmış bir hesap silinemez — tek satır iptalindeki
    // paidQuantity kontrolüyle aynı desen, hesabın tamamı için.
    const hasConfirmedPayments = snapshot.paymentAllocations.some(
      (allocation) =>
        allocation.checkId === deletingCheck.id &&
        snapshot.payments.some(
          (payment) => payment.id === allocation.paymentId && payment.status === 'confirmed',
        ),
    );
    if (hasConfirmedPayments) {
      notify(copy.deleteCheckFailed, copy.deleteCheckHasPayments);
      return;
    }
    setDeleteCheckBusy(true);
    try {
      await voidCheck({
        database,
        scope,
        actorUserId,
        deviceId,
        check: deletingCheck,
        items: snapshot.orderItems,
        modifiers: snapshot.orderItemModifiers,
        reasonId: reason.id,
        hasConfirmedPayments,
      });
      setDeletingCheck(undefined);
      if (selectedCheckId === deletingCheck.id) setSelectedCheckId(undefined);
      await reload();
      void refresh();
      haptic('warning');
    } catch (error) {
      notify(copy.deleteCheckFailed, error instanceof Error ? error.message : copy.tryAgain);
    } finally {
      setDeleteCheckBusy(false);
    }
  };

  const saveItemNote = async () => {
    if (!database || !scope || !editingNoteItem) return;
    try {
      await updateOrderItemNote({
        database,
        scope,
        actorUserId,
        deviceId,
        item: editingNoteItem,
        note: editingNote,
      });
      setEditingNoteItem(undefined);
      await reload();
      void refresh();
    } catch (error) {
      notify(copy.noteSaveFailed, error instanceof Error ? error.message : copy.tryAgain);
    }
  };

  const saveLocationNote = async () => {
    if (!database || !scope || !snapshot?.session) return;
    try {
      await updateTableSessionNote({
        database,
        scope,
        actorUserId,
        deviceId,
        session: snapshot.session,
        note: locationNote,
      });
      setEditingLocationNote(false);
      await reload();
      void refresh();
    } catch (error) {
      notify(copy.locationNoteSaveFailed, error instanceof Error ? error.message : copy.tryAgain);
    }
  };

  const resolveNoteConflict = async (
    item: OrderItem,
    conflict: TableWorkspaceSnapshot['conflicts'][number],
    resolution: 'server' | 'local',
  ) => {
    if (!database || !scope) return;
    try {
      await resolveOrderItemNoteConflict({
        database,
        scope,
        actorUserId,
        deviceId,
        item,
        conflict,
        resolution,
      });
      await reload();
      void refresh();
    } catch (error) {
      notify(copy.conflictFailed, error instanceof Error ? error.message : copy.tryAgain);
    }
  };

  const confirmPayment = async (command: ConfirmCheckPaymentsCommand) => {
    if (!payingCheck) return;
    setPaymentBusy(true);
    try {
      const clientMutationId = toDomainId<MutationId>(clientMutationUuid());
      const result = await confirmCheckPayments(deviceId, clientMutationId, command);
      setPayingCheck(undefined);
      haptic('success');
      if (result.checkStatus === 'paid' && database && scope) {
        let after: string | undefined;
        let receipt: Receipt | undefined;
        do {
          const page = await database.repository('receipts').list(scope, {
            ...(after ? { after } : {}),
            limit: 200,
          });
          receipt = page.items.find((candidate) => candidate.checkId === result.checkId);
          after = receipt ? undefined : page.nextCursor;
        } while (after);
        if (receipt) {
          setPreparedReceiptPdf(undefined);
          setReadyReceipt(receipt);
        } else {
          notify(copy.paymentConfirmed, copy.receiptSyncing, 'success');
        }
      } else {
        notify(
          copy.paymentConfirmed,
          `${copy.remaining}: ${formatMoney(
            result.remainingMinor,
            command.currencyCode,
            language,
          )}`,
          'success',
        );
      }
      await reload();
    } catch (error) {
      const message =
        error instanceof Error && error.message === 'payment_check_version_conflict'
          ? copy.paymentChanged
          : error instanceof Error
            ? error.message
            : copy.tryAgain;
      await refresh().catch(() => undefined);
      await reload();
      throw new Error(message);
    } finally {
      setPaymentBusy(false);
    }
  };

  const confirmSplit = async (plan: CheckSplitPlan, targetCheck?: Check) => {
    if (!database || !scope || !splittingCheck) return;
    setSplitBusy(true);
    try {
      const result = await applyCheckSplit({
        database,
        scope,
        deviceId,
        actorUserId,
        sourceCheck: splittingCheck,
        ...(targetCheck ? { targetCheck } : {}),
        plan,
      });
      setSplittingCheck(undefined);
      // Garson bolmeden sonra dogal olarak yeni hesabi gormek ister.
      setSelectedCheckId(result.targetCheck.id);
      await reload();
      void refresh();
    } catch (error) {
      await reload();
      throw error instanceof Error ? error : new Error(copy.splitFailed);
    } finally {
      setSplitBusy(false);
    }
  };

  const openReceiptPdf = async (mode: 'download' | 'share') => {
    if (!readyReceipt) return;
    setReceiptBusy(true);
    try {
      const prepared = preparedReceiptPdf ?? (await prepareReceiptPdf(readyReceipt));
      setPreparedReceiptPdf(prepared);
      await presentReceiptPdf(prepared.signedUrl, readyReceipt.receiptNumber, mode);
    } catch (error) {
      notify(copy.pdfFailed, error instanceof Error ? error.message : copy.tryAgain);
    } finally {
      setReceiptBusy(false);
    }
  };

  const performTableOperation = async (
    command: TransferTableSessionCommand,
    target: TableOperationTarget,
  ) => {
    setTableOperationBusy(true);
    try {
      const clientMutationId = toDomainId<MutationId>(clientMutationUuid());
      const result = await transferOrMergeTableSession(deviceId, clientMutationId, command);
      setShowTableOperation(false);
      notify(
        result.mode === 'merged' ? copy.tablesMerged : copy.tableMoved,
        `${snapshot?.table.label ?? ''} → ${target.table.label}`,
      );
      navigation.replace('TableDetail', { tableId: target.table.id });
    } catch (error) {
      const message =
        error instanceof Error &&
        [
          'source_session_changed',
          'source_session_version_conflict',
          'target_session_changed',
          'target_session_version_conflict',
        ].includes(error.message)
          ? copy.tableChanged
          : error instanceof Error
            ? error.message
            : copy.tryAgain;
      await refresh().catch(() => undefined);
      await reload();
      throw new Error(message);
    } finally {
      setTableOperationBusy(false);
    }
  };

  if (loading) {
    return (
      <CenteredState>
        <ActivityIndicator color={tokens.colors.primary} size="large" />
        <Text style={[tokens.typography.body, { color: tokens.colors.textSubtle }]}>
          {copy.loading}
        </Text>
      </CenteredState>
    );
  }

  if (!snapshot || loadError) {
    return (
      <CenteredState>
        <ServiceEmptyState
          action={{ label: copy.back, onPress: navigation.goBack }}
          body={loadError ?? copy.tableNotFound}
          icon="alert-circle-outline"
          title={copy.couldNotOpen}
        />
      </CenteredState>
    );
  }

  const compact = layout.mode === 'compact';
  const draftCount = draft.reduce((total, line) => total + line.quantity, 0);

  // Adisyon görünümü: tablet/desktop'ta ürün paletinin yanında, telefonda
  // masanın tek görünümü — ürün eklemek ayrı bir ekrana (AddProduct) gider.
  const orderPane = (
    <OrderPane
      checkName={selectedCheck?.name || pendingCheckName || copy.newCheck}
      checkTotal={checkTotal}
      copy={copy}
      currencyCode={snapshot.products[0]?.currencyCode ?? 'EUR'}
      items={visibleItems}
      allItems={selectedCheckItems}
      itemGroups={fulfillmentByItemId}
      language={language}
      modifiers={snapshot.orderItemModifiers}
      conflicts={snapshot.conflicts}
      onOrderViewChange={setOrderView}
      onMarkDrinksDelivered={() => void markDrinksDelivered()}
      onCancel={setCancellingItem}
      onChangeQuantity={(item, nextQuantity) => void changeItemQuantity(item, nextQuantity)}
      onEditNote={(item) => {
        setEditingNote(item.note ?? '');
        setEditingNoteItem(item);
      }}
      onPay={() => {
        if (selectedCheck) setPayingCheck(selectedCheck);
      }}
      onResolveConflict={resolveNoteConflict}
      onSplit={() => {
        if (personAccountsEnabled && selectedCheck) setSplittingCheck(selectedCheck);
      }}
      splitEnabled={personAccountsEnabled}
      orderView={orderView}
      orderViewCounts={orderViewCounts}
      fulfillmentSplitEnabled={fulfillmentSplitEnabled}
      drinksReminderEnabled={drinksReminderEnabled}
      waiterNames={waiterNames}
    />
  );

  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left', 'right']}
      style={{ flex: 1, backgroundColor: tokens.colors.bg }}
    >
      <WorkspaceHeader
        actionsLabel={copy.workspaceActions}
        locationNote={locationNotesEnabled ? snapshot.session?.note : undefined}
        locationNoteLabel={copy.locationNote}
        onActions={() => setShowActionsSheet(true)}
        onBack={navigation.goBack}
        participantNames={participantNames}
        tableLabel={snapshot.table.label}
      />

      {notice ? (
        <View
          accessibilityLiveRegion="assertive"
          accessibilityRole="alert"
          style={{
            alignItems: 'flex-start',
            backgroundColor:
              notice.tone === 'success'
                ? tokens.colors.state.delivered.bg
                : tokens.colors.state.pending.bg,
            borderRadius: tokens.radius.medium,
            flexDirection: 'row',
            marginBottom: tokens.space.xs,
            marginHorizontal: tokens.space.md,
            padding: tokens.space.sm,
          }}
        >
          <Ionicons
            color={notice.tone === 'success' ? tokens.colors.success : tokens.colors.error}
            name={notice.tone === 'success' ? 'checkmark-circle' : 'alert-circle'}
            size={20}
          />
          <View style={{ flex: 1, marginLeft: tokens.space.xs }}>
            <Text style={[tokens.typography.bodyStrong, { color: tokens.colors.text }]}>
              {notice.title}
            </Text>
            {notice.body ? (
              <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
                {notice.body}
              </Text>
            ) : null}
          </View>
          <ServiceIconButton icon="close" label={copy.close} onPress={() => setNotice(undefined)} />
        </View>
      ) : null}

      {incomingMessage ? (
        <View
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={{
            alignItems: 'center',
            backgroundColor: tokens.colors.accentSoft,
            flexDirection: 'row',
            marginBottom: tokens.space.xs,
            marginHorizontal: tokens.space.md,
            padding: tokens.space.sm,
            borderRadius: tokens.radius.medium,
          }}
        >
          <Ionicons color={tokens.colors.accent} name="people-outline" size={20} />
          <Text
            style={[
              tokens.typography.label,
              { color: tokens.colors.text, flex: 1, marginLeft: tokens.space.xs },
            ]}
          >
            {incomingMessage}
          </Text>
          <ServiceIconButton icon="close" label={copy.close} onPress={dismissIncoming} />
        </View>
      ) : null}

      <CheckStrip
        checks={snapshot.checks}
        copy={copy}
        pendingCheck={startingNewCheck}
        pendingCheckName={pendingCheckName}
        selectedCheckId={selectedCheckId}
        onAdd={() => {
          setStartingNewCheck(true);
          setPendingCheckName('');
          setSelectedCheckId(undefined);
          if (namedOrdersEnabled) {
            setCheckNameInput('');
            setShowCheckModal(true);
          }
        }}
        onSelect={(checkId) => {
          setStartingNewCheck(false);
          setPendingCheckName('');
          setSelectedCheckId(checkId);
        }}
        onSelectPending={() => setSelectedCheckId(undefined)}
      />

      <View
        style={{
          flex: 1,
          flexDirection: compact ? 'column' : 'row',
          gap: tokens.space.md,
          paddingHorizontal: layout.horizontalPadding,
        }}
      >
        {orderPane}
        {!compact ? (
          <PalettePane
            categories={snapshot.categories}
            copy={copy}
            currencyCode={snapshot.products[0]?.currencyCode ?? 'EUR'}
            draft={draft}
            favoriteIds={favoriteIds}
            language={language}
            onAdd={addProduct}
            onConfigure={setConfiguring}
            onDecrement={decrementDraftProduct}
            onQuery={setQuery}
            onScope={selectPaletteScope}
            onToggleAvailability={setAvailabilityTarget}
            onToggleFavorite={toggleFavorite}
            photoUris={showItemPhotos ? photoUris : {}}
            products={filteredProducts}
            query={query}
            selectedScope={paletteScope}
          />
        ) : null}
      </View>

      {compact ? (
        <View style={{ padding: tokens.space.sm }}>
          <ServiceButton
            fullWidth
            icon="add"
            label={
              draftCount > 0
                ? `${copy.addProduct} · ${draftCount} ${copy.products}`
                : copy.addProduct
            }
            onPress={() =>
              navigation.navigate('AddProduct', {
                tableId: route.params.tableId,
                ...(selectedCheckId ? { checkId: selectedCheckId } : {}),
                ...(pendingCheckName ? { pendingCheckName } : {}),
              })
            }
            size="large"
            variant="accent"
          />
        </View>
      ) : (
        <DraftBar
          copy={copy}
          currencyCode={snapshot.products[0]?.currencyCode ?? 'EUR'}
          draft={draft}
          language={language}
          onChangeQuantity={changeDraftQuantity}
          onClear={clearDraft}
          onRemove={removeDraftLine}
          onRepeat={repeatLastBatch}
          onSend={() => void submit()}
          onUndo={undo}
          repeatAvailable={repeatAvailable}
          submitting={submitting}
          totalMinor={draftTotal}
          undoAvailable={undoAvailable}
        />
      )}

      <WorkspaceModal
        onClose={() => setShowActionsSheet(false)}
        title={snapshot.table.label}
        visible={showActionsSheet}
      >
        <ScrollView style={{ maxHeight: 420 }}>
          <ServiceListRow
            accessory="chevron"
            icon="add-circle-outline"
            onPress={() => {
              setShowActionsSheet(false);
              setStartingNewCheck(true);
              setPendingCheckName('');
              setSelectedCheckId(undefined);
              if (namedOrdersEnabled) {
                setCheckNameInput('');
                setShowCheckModal(true);
              }
            }}
            title={copy.newCheck}
          />
          <ServiceListRow
            accessory="chevron"
            disabled={!selectedCheck}
            icon="create-outline"
            onPress={() => {
              setShowActionsSheet(false);
              if (selectedCheck) {
                setCheckNameInput(selectedCheck.name);
                setRenamingCheck(selectedCheck);
              }
            }}
            title={copy.renameCheck}
          />
          <ServiceListRow
            accessory="chevron"
            disabled={!selectedCheck}
            icon="card-outline"
            onPress={() => {
              setShowActionsSheet(false);
              if (selectedCheck) setPayingCheck(selectedCheck);
            }}
            title={copy.takePayment}
          />
          <ServiceListRow
            accessory="chevron"
            disabled={!personAccountsEnabled || !selectedCheck}
            icon="pie-chart-outline"
            onPress={() => {
              setShowActionsSheet(false);
              if (selectedCheck) setSplittingCheck(selectedCheck);
            }}
            title={copy.splitCheck}
          />
          <ServiceListRow
            accessory="chevron"
            disabled={!snapshot.session}
            icon="swap-horizontal-outline"
            onPress={() => {
              setShowActionsSheet(false);
              setShowTableOperation(true);
            }}
            title={copy.moveTable}
          />
          <ServiceListRow
            accessory="chevron"
            disabled={!locationNotesEnabled || !snapshot.session}
            icon="location-outline"
            onPress={() => {
              setShowActionsSheet(false);
              setLocationNote(snapshot.session?.note ?? '');
              setEditingLocationNote(true);
            }}
            title={copy.locationNote}
          />
          <ServiceListRow
            accessory="chevron"
            destructive
            disabled={!selectedCheck}
            icon="trash-outline"
            onPress={() => {
              setShowActionsSheet(false);
              if (selectedCheck) setDeletingCheck(selectedCheck);
            }}
            title={copy.deleteCheck}
          />
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              gap: tokens.space.sm,
              minHeight: 56,
            }}
          >
            <Ionicons color={tokens.colors.textSubtle} name="cloud-outline" size={22} />
            <Text style={[tokens.typography.body, { color: tokens.colors.text, flex: 1 }]}>
              {sync.online ? copy.synced : copy.offline}
            </Text>
            <ServiceStatusPill
              label={
                sync.online
                  ? sync.pendingCount > 0
                    ? `${sync.pendingCount} ${copy.queued}`
                    : copy.synced
                  : copy.offline
              }
              tone={sync.hasError ? 'error' : sync.pendingCount > 0 ? 'warning' : 'success'}
            />
          </View>
        </ScrollView>
      </WorkspaceModal>

      <NameCheckModal
        copy={copy}
        name={checkNameInput}
        onChange={setCheckNameInput}
        onClose={() => setShowCheckModal(false)}
        onConfirm={() => {
          const name = checkNameInput.trim();
          if (!name) return;
          setPendingCheckName(name);
          setSelectedCheckId(undefined);
          setShowCheckModal(false);
        }}
        visible={showCheckModal}
      />
      <NameCheckModal
        confirmLabel={copy.renameCheckSave}
        copy={copy}
        name={checkNameInput}
        onChange={setCheckNameInput}
        onClose={() => {
          if (!renameCheckBusy) setRenamingCheck(undefined);
        }}
        onConfirm={() => void renameSelectedCheck()}
        title={copy.renameCheck}
        visible={Boolean(renamingCheck)}
      />
      <DeleteCheckModal
        check={deletingCheck}
        copy={copy}
        isManager={isManager}
        onClose={() => {
          if (!deleteCheckBusy) setDeletingCheck(undefined);
        }}
        onConfirm={(reason) => void deleteSelectedCheck(reason)}
        reasons={snapshot.cancellationReasons}
      />
      <ProductConfigurationModal
        copy={copy}
        note={configurationNote}
        onChangeNote={setConfigurationNote}
        onClose={() => setConfiguring(undefined)}
        onConfirm={() => {
          if (!configuring) return;
          appendDraft(configuring, configuration, configurationNote);
          setConfiguring(undefined);
        }}
        onToggle={(groupId, optionId) => {
          if (!configuring) return;
          const group = configuring.modifierGroups.find((candidate) => candidate.id === groupId);
          if (!group) return;
          setConfiguration((selected) => {
            const groupIds = new Set(group.options.map((option) => option.id));
            if (selected.includes(optionId)) {
              return selected.filter((id) => id !== optionId);
            }
            return group.selectionType === 'single'
              ? [...selected.filter((id) => !groupIds.has(id)), optionId]
              : [...selected, optionId];
          });
        }}
        product={configuring}
        selected={configuration}
      />
      <CancellationModal
        copy={copy}
        isManager={isManager}
        item={cancellingItem}
        onCancel={cancelItem}
        onClose={() => setCancellingItem(undefined)}
        reasons={snapshot.cancellationReasons}
      />
      <ItemNoteModal
        copy={copy}
        item={editingNoteItem}
        note={editingNote}
        onChange={setEditingNote}
        onClose={() => setEditingNoteItem(undefined)}
        onConfirm={() => void saveItemNote()}
      />
      {payingCheck ? (
        <PaymentSheet
          allocations={snapshot.paymentAllocations}
          busy={paymentBusy}
          check={payingCheck}
          language={language}
          modifiers={snapshot.orderItemModifiers}
          onClose={() => {
            if (!paymentBusy) setPayingCheck(undefined);
          }}
          onConfirm={confirmPayment}
          online={sync.online}
          orderItems={snapshot.orderItems.filter((item) => item.checkId === payingCheck.id)}
          payments={snapshot.payments}
          quickCash={quickCashEnabled}
          confirmBeforeClose={confirmBeforeClose}
          visible
        />
      ) : null}
      <LocationNoteModal
        copy={copy}
        note={locationNote}
        onChange={setLocationNote}
        onClose={() => setEditingLocationNote(false)}
        onConfirm={() => void saveLocationNote()}
        visible={editingLocationNote}
      />
      <WorkspaceModal
        onClose={() => setAvailabilityTarget(undefined)}
        title={availabilityTarget?.isAvailable ? copy.soldOutTitle : copy.restoreProductTitle}
        visible={Boolean(availabilityTarget)}
      >
        <Text
          style={[
            tokens.typography.body,
            { color: tokens.colors.textSubtle, marginBottom: tokens.space.md },
          ]}
        >
          {availabilityTarget?.name}
        </Text>
        <ServiceButton
          fullWidth
          icon={availabilityTarget?.isAvailable ? 'close-circle-outline' : 'refresh-outline'}
          label={availabilityTarget?.isAvailable ? copy.markSoldOut : copy.restoreProduct}
          onPress={() => {
            if (availabilityTarget) void applyAvailability(availabilityTarget);
          }}
        />
        <ModalActions cancel={copy.cancel} onCancel={() => setAvailabilityTarget(undefined)} />
      </WorkspaceModal>

      {splittingCheck ? (
        <CheckSplitSheet
          allocations={snapshot.paymentAllocations}
          busy={splitBusy}
          items={snapshot.orderItems}
          language={language}
          modifiers={snapshot.orderItemModifiers}
          onClose={() => {
            if (!splitBusy) setSplittingCheck(undefined);
          }}
          onConfirm={confirmSplit}
          openChecks={snapshot.checks}
          payments={snapshot.payments}
          sourceCheck={splittingCheck}
          visible
        />
      ) : null}
      {showTableOperation && snapshot.session ? (
        <TableOperationSheet
          busy={tableOperationBusy}
          language={language}
          onClose={() => {
            if (!tableOperationBusy) setShowTableOperation(false);
          }}
          onConfirm={performTableOperation}
          online={sync.online}
          sourceChecks={snapshot.sessionChecks}
          sourceSession={snapshot.session}
          sourceTable={snapshot.table}
          targets={tableOperationTargets}
          visible
        />
      ) : null}
      {readyReceipt ? (
        <ReceiptReadySheet
          busy={receiptBusy}
          language={language}
          onClose={() => {
            if (!receiptBusy) {
              setReadyReceipt(undefined);
              setPreparedReceiptPdf(undefined);
            }
          }}
          onDownload={() => void openReceiptPdf('download')}
          onShare={() => void openReceiptPdf('share')}
          receipt={readyReceipt}
        />
      ) : null}

      {runtimeError ? (
        <View
          accessibilityRole="alert"
          style={{ backgroundColor: tokens.colors.error, padding: tokens.space.xs }}
        >
          <Text
            style={[
              tokens.typography.caption,
              { color: tokens.colors.onError, textAlign: 'center' },
            ]}
          >
            {copy.localSafe}
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
