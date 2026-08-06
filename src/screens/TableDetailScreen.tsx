import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import LegacyTableDetailScreen from './LegacyTableDetailScreen';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useOrderiaData } from '../data/runtime';
import {
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
  ModifierOptionId,
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
  backdrop,
  CancellationModal,
  CenteredState,
  CheckSplitPlan,
  CheckSplitSheet,
  CheckStrip,
  clientMutationUuid,
  countOrderViews,
  DraftBar,
  DraftOrderLine,
  DraftSheet,
  draftLineTotal,
  filterOrderItems,
  formatMoney,
  getFulfillmentGroup,
  ItemNoteModal,
  loadTableWorkspace,
  loadWorkspacePreferences,
  LocationNoteModal,
  markOrderItemsServed,
  ModalActions,
  NameCheckModal,
  OrderPane,
  type OrderView,
  type PaletteScope,
  PalettePane,
  ProductConfigurationModal,
  resolveOrderItemNoteConflict,
  saveWorkspacePreferences,
  sendOrderBatch,
  TableWorkspaceSnapshot,
  updateOrderItemNote,
  updateOrderItemQuantity,
  updateTableSessionNote,
  voidOrderItemQuantity,
  WorkspaceHeader,
  WorkspaceModal,
  workspaceCopy,
  WorkspaceProduct,
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
import { createTextMatcher } from '../utils/searchUtils';

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
    resolveActiveParticipants,
    resolveProfileNames,
    revision,
    scope,
    setCatalogAvailability,
    sync,
    transferOrMergeTableSession,
  } = useOrderiaData();
  const [snapshot, setSnapshot] = useState<TableWorkspaceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selectedCheckId, setSelectedCheckId] = useState<CheckId>();
  const [pendingCheckName, setPendingCheckName] = useState('');
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [checkNameInput, setCheckNameInput] = useState('');
  const [draft, setDraft] = useState<readonly DraftOrderLine[]>([]);
  const [undoStack, setUndoStack] = useState<readonly (readonly DraftOrderLine[])[]>([]);
  const [paletteScope, setPaletteScope] = useState<PaletteScope>('all');
  const [orderView, setOrderView] = useState<OrderView>('all');
  const [query, setQuery] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<readonly string[]>([]);
  const [configuring, setConfiguring] = useState<WorkspaceProduct>();
  const [configuration, setConfiguration] = useState<readonly ModifierOptionId[]>([]);
  const [configurationNote, setConfigurationNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancellingItem, setCancellingItem] = useState<OrderItem>();
  const [editingNoteItem, setEditingNoteItem] = useState<OrderItem>();
  const [editingNote, setEditingNote] = useState('');
  const [editingLocationNote, setEditingLocationNote] = useState(false);
  const [locationNote, setLocationNote] = useState('');
  const [showDraftSheet, setShowDraftSheet] = useState(false);
  const [payingCheck, setPayingCheck] = useState<Check>();
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [splittingCheck, setSplittingCheck] = useState<Check>();
  const [splitBusy, setSplitBusy] = useState(false);
  const [showTableOperation, setShowTableOperation] = useState(false);
  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const [showCartSheet, setShowCartSheet] = useState(false);
  const [tableOperationBusy, setTableOperationBusy] = useState(false);
  const [readyReceipt, setReadyReceipt] = useState<Receipt>();
  const [preparedReceiptPdf, setPreparedReceiptPdf] = useState<PreparedReceiptPdf>();
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [waiterNames, setWaiterNames] = useState<Readonly<Record<string, string>>>({});
  const [participantNames, setParticipantNames] = useState<readonly string[]>([]);
  const [incomingMessage, setIncomingMessage] = useState<string>();
  const [notice, setNotice] = useState<WorkspaceNotice>();
  const [availabilityTarget, setAvailabilityTarget] = useState<WorkspaceProduct>();
  const snapshotRef = useRef<TableWorkspaceSnapshot | null>(null);
  const reloadRequestRevisionRef = useRef(0);
  const submitLockRef = useRef(false);
  const actionsSheetRef = useRef<React.ElementRef<typeof BottomSheetModal>>(null);
  const cartSheetRef = useRef<React.ElementRef<typeof BottomSheetModal>>(null);
  const tableId = toDomainId<RestaurantTableId>(route.params.tableId);

  const hapticLight = () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const hapticSuccess = () => {
    if (Platform.OS !== 'web')
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };
  const hapticWarning = () => {
    if (Platform.OS !== 'web')
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  useEffect(() => {
    if (showActionsSheet) {
      actionsSheetRef.current?.present();
    } else {
      actionsSheetRef.current?.dismiss();
    }
  }, [showActionsSheet]);

  useEffect(() => {
    if (showCartSheet) {
      cartSheetRef.current?.present();
    } else {
      cartSheetRef.current?.dismiss();
    }
  }, [showCartSheet]);

  /**
   * Uyarilari ekranin kendi seridinde gosteririz. react-native-web'de
   * Alert.alert sessizce hicbir sey yapmaz; PWA'da calisan bir garsonun
   * "gonderilemedi" uyarisini kacirmasi kabul edilemez.
   */
  const notify = useCallback((title: string, body?: string, tone: NoticeTone = 'error') => {
    setNotice({ title, ...(body ? { body } : {}), tone });
  }, []);

  const reload = useCallback(async () => {
    if (!database || !scope) return;
    const requestRevision = ++reloadRequestRevisionRef.current;
    const isCurrentRequest = () => requestRevision === reloadRequestRevisionRef.current;
    try {
      const next = await loadTableWorkspace(database, scope, tableId);
      if (!isCurrentRequest()) return;
      const previous = snapshotRef.current;
      if (previous && next) {
        const previousItemIds = new Set(previous.orderItems.map((item) => item.id));
        const incoming = next.orderItems.filter(
          (item) => !previousItemIds.has(item.id) && item.createdBy !== actorUserId,
        );
        if (incoming.length > 0) {
          const actorIds = [...new Set(incoming.map((item) => item.createdBy))];
          const names: Readonly<Record<string, string>> = await resolveProfileNames(actorIds).catch(
            () => ({}),
          );
          if (!isCurrentRequest()) return;
          const actorNames = actorIds.map((id) => names[id] ?? copy.unknownWaiter);
          setIncomingMessage(`${actorNames.join(', ')} · ${incoming.length} ${copy.incomingItems}`);
        }
      }
      if (!isCurrentRequest()) return;
      snapshotRef.current = next;
      setSnapshot(next);
      setLoadError(next ? undefined : copy.tableNotFound);
    } catch {
      if (isCurrentRequest()) setLoadError(copy.loadFailed);
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  }, [
    actorUserId,
    copy.incomingItems,
    copy.loadFailed,
    copy.tableNotFound,
    copy.unknownWaiter,
    database,
    resolveProfileNames,
    scope,
    tableId,
  ]);

  useEffect(() => {
    reloadRequestRevisionRef.current += 1;
    snapshotRef.current = null;
    setSnapshot(null);
    setLoadError(undefined);
    setIncomingMessage(undefined);
    setWaiterNames({});
    setParticipantNames([]);
    setLoading(true);

    return () => {
      reloadRequestRevisionRef.current += 1;
    };
  }, [scope?.branchId, scope?.organizationId, tableId]);

  useEffect(() => {
    void reload();
  }, [reload, revision]);

  useEffect(() => {
    void loadWorkspacePreferences(preferencesKey).then((preferences) => {
      setFavoriteIds(preferences.favoriteProductIds);
      if (preferences.selectedCategoryId) {
        setPaletteScope(preferences.selectedCategoryId);
      }
    });
  }, [preferencesKey]);

  useEffect(() => {
    if (!snapshot) return;
    const ids = [...new Set(snapshot.orderItems.map((item) => item.createdBy))];
    let active = true;
    void resolveProfileNames(ids)
      .then((names) => {
        if (active) setWaiterNames(names);
      })
      .catch(() => {
        if (active) setWaiterNames({});
      });
    return () => {
      active = false;
    };
  }, [resolveProfileNames, snapshot]);

  useEffect(() => {
    if (!snapshot?.session) {
      setParticipantNames([]);
      return;
    }
    let active = true;
    void resolveActiveParticipants(snapshot.session.id)
      .then((participants) => {
        if (active)
          setParticipantNames(participants.map((participant) => participant.display_name));
      })
      .catch(() => {
        if (!active) return;
        const cutoff = Date.now() - 15 * 60_000;
        const userIds = [
          ...new Set(
            snapshot.orderItems
              .filter((item) => Date.parse(item.updatedAt) >= cutoff)
              .map((item) => item.createdBy),
          ),
        ];
        setParticipantNames(userIds.map((id) => waiterNames[id] ?? copy.unknownWaiter));
      });
    return () => {
      active = false;
    };
  }, [copy.unknownWaiter, resolveActiveParticipants, revision, snapshot, waiterNames]);

  useEffect(() => {
    if (!incomingMessage) return;
    const timer = setTimeout(() => setIncomingMessage(undefined), 4_000);
    return () => clearTimeout(timer);
  }, [incomingMessage]);

  // Basarili islem bildirimi kendiliginden kaybolur; hata garson kapatana
  // kadar ekranda kalir.
  useEffect(() => {
    if (notice?.tone !== 'success') return;
    const timer = setTimeout(() => setNotice(undefined), 5_000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!snapshot || pendingCheckName) return;
    if (selectedCheckId && snapshot.checks.some((check) => check.id === selectedCheckId)) return;
    setSelectedCheckId(snapshot.checks[0]?.id);
  }, [pendingCheckName, selectedCheckId, snapshot]);

  const recentProductIds = useMemo(
    () =>
      snapshot
        ? [
            ...new Set(
              [...snapshot.orderItems]
                .reverse()
                .map((item) => item.menuItemId)
                .filter((id): id is NonNullable<typeof id> => Boolean(id)),
            ),
          ].slice(0, 12)
        : [],
    [snapshot],
  );
  const filteredProducts = useMemo(() => {
    if (!snapshot) return [];
    const matcher = createTextMatcher(query);
    return snapshot.products.filter((product) => {
      if (paletteScope === 'favorites' && !favoriteIds.includes(product.id)) return false;
      if (paletteScope === 'recent' && !recentProductIds.includes(product.id)) return false;
      if (
        paletteScope !== 'all' &&
        paletteScope !== 'favorites' &&
        paletteScope !== 'recent' &&
        product.categoryId !== paletteScope
      ) {
        return false;
      }
      return matcher(`${product.name} ${product.categoryName} ${product.description ?? ''}`);
    });
  }, [favoriteIds, paletteScope, query, recentProductIds, snapshot]);
  const selectedCheck = snapshot?.checks.find((check) => check.id === selectedCheckId);
  const selectedCheckItems = useMemo(
    () => snapshot?.orderItems.filter((item) => item.checkId === selectedCheckId) ?? [],
    [selectedCheckId, snapshot?.orderItems],
  );
  const fulfillmentByItemId = useMemo<Readonly<Record<string, FulfillmentGroup>>>(
    () =>
      Object.fromEntries(
        selectedCheckItems.map((item) => [
          item.id,
          getFulfillmentGroup(snapshot?.products.find((product) => product.id === item.menuItemId)),
        ]),
      ),
    [selectedCheckItems, snapshot?.products],
  );
  const visibleItems = filterOrderItems(selectedCheckItems, orderView, fulfillmentByItemId);
  const orderViewCounts = countOrderViews(selectedCheckItems, fulfillmentByItemId);
  const draftTotal = draft.reduce((total, line) => total + draftLineTotal(line), 0);
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

  const rememberDraft = (next: readonly DraftOrderLine[]) => {
    setUndoStack((history) => [...history.slice(-19), draft]);
    setDraft(next);
  };

  /**
   * Masadan tek dokunusla "bugun bitti" / "geri geldi". Mutfaktan haber gelen
   * garson menu ekranina gitmek zorunda kalmasin.
   */
  const applyAvailability = async (product: WorkspaceProduct) => {
    setAvailabilityTarget(undefined);
    try {
      await setCatalogAvailability([product.id], !product.isAvailable);
      await reload();
      void refresh();
    } catch (error) {
      notify(copy.availabilityFailed, error instanceof Error ? error.message : copy.tryAgain);
    }
  };

  const addProduct = (product: WorkspaceProduct, configure = false) => {
    if (!product.isAvailable) {
      setAvailabilityTarget(product);
      return;
    }
    const defaults = product.modifierGroups.flatMap((group) =>
      group.options.filter((option) => option.isDefault).map((option) => option.id),
    );
    const needsChoice = product.modifierGroups.some((group) => {
      const selectedCount = defaults.filter((id) =>
        group.options.some((option) => option.id === id),
      ).length;
      return selectedCount < Math.max(group.minimumChoices, group.isRequired ? 1 : 0);
    });
    if (configure || needsChoice) {
      setConfiguring(product);
      setConfiguration(defaults);
      setConfigurationNote('');
      return;
    }
    appendDraft(product, defaults, '');
    hapticLight();
  };

  const appendDraft = (
    product: WorkspaceProduct,
    optionIds: readonly ModifierOptionId[],
    note: string,
  ) => {
    const normalizedNote = note.trim();
    const signature = [...optionIds].sort().join(':');
    const existingIndex = draft.findIndex(
      (line) =>
        line.product.id === product.id &&
        [...line.selectedOptionIds].sort().join(':') === signature &&
        (line.note ?? '') === normalizedNote,
    );
    if (existingIndex >= 0) {
      rememberDraft(
        draft.map((line, index) =>
          index === existingIndex ? { ...line, quantity: line.quantity + 1 } : line,
        ),
      );
    } else {
      rememberDraft([
        ...draft,
        {
          id: `${product.id}.${Date.now()}.${draft.length}`,
          product,
          quantity: 1,
          ...(normalizedNote ? { note: normalizedNote } : {}),
          selectedOptionIds: optionIds,
        },
      ]);
    }
  };

  const undo = () => {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setDraft(previous);
    setUndoStack((history) => history.slice(0, -1));
  };

  const changeDraftQuantity = (lineId: string, delta: number) => {
    rememberDraft(
      draft
        .map((line) => (line.id === lineId ? { ...line, quantity: line.quantity + delta } : line))
        .filter((line) => line.quantity > 0),
    );
  };

  const removeDraftLine = (lineId: string) => {
    rememberDraft(draft.filter((line) => line.id !== lineId));
  };

  const decrementDraftProduct = (product: WorkspaceProduct) => {
    // Önce modifiersüz/notsuz düz satırı azalt, yoksa son eşleşen satırı
    const plainIndex = draft.findLastIndex(
      (line) =>
        line.product.id === product.id &&
        line.selectedOptionIds.length === 0 &&
        !(line.note ?? '').trim(),
    );
    const fallbackIndex = draft.reduce(
      (found, line, index) => (line.product.id === product.id ? index : found),
      -1,
    );
    const index = plainIndex >= 0 ? plainIndex : fallbackIndex;
    if (index >= 0) {
      changeDraftQuantity(draft[index].id, -1);
    }
  };

  const repeatLastBatch = () => {
    if (!snapshot) return;
    const activeItems = snapshot.orderItems.filter((item) => item.status !== 'cancelled');
    if (activeItems.length === 0) return;
    // En yeni batch: en son oluşturulan aktif ürünün batch'i
    const newestItem = activeItems.reduce((latest, item) =>
      Date.parse(item.createdAt) > Date.parse(latest.createdAt) ? item : latest,
    );
    const latestBatchId = newestItem.orderBatchId;
    const batchItems = activeItems.filter((item) => item.orderBatchId === latestBatchId);
    const additions: DraftOrderLine[] = batchItems.flatMap((item, index) => {
      const product = snapshot.products.find((candidate) => candidate.id === item.menuItemId);
      if (!product || !product.isAvailable) return [];
      const optionIds = snapshot.orderItemModifiers
        .filter((modifier) => modifier.orderItemId === item.id)
        .flatMap((modifier) => {
          const option = product.modifierGroups
            .flatMap((group) => group.options)
            .find((candidate) => candidate.name === modifier.modifierOptionNameSnapshot);
          return option ? [option.id] : [];
        });
      return [
        {
          id: `${product.id}.repeat.${Date.now()}.${index}`,
          product,
          quantity: item.quantity,
          ...(item.note?.trim() ? { note: item.note.trim() } : {}),
          selectedOptionIds: optionIds,
        },
      ];
    });
    if (additions.length > 0) {
      rememberDraft([...draft, ...additions]);
    }
  };

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

  const submit = async () => {
    if (submitLockRef.current || !database || !scope || !snapshot || draft.length === 0) return;
    submitLockRef.current = true;
    setSubmitting(true);
    try {
      const result = await sendOrderBatch({
        database,
        scope,
        actorUserId,
        deviceId,
        tableId,
        session: snapshot.session,
        ...(selectedCheck ? { check: selectedCheck } : {}),
        checkName:
          selectedCheck?.name || pendingCheckName || `${copy.check} ${snapshot.checks.length + 1}`,
        lines: draft,
      });
      setSelectedCheckId(result.check.id);
      setPendingCheckName('');
      setDraft([]);
      setUndoStack([]);
      setOrderView('new');
      await reload();
      void refresh();
      hapticSuccess();
      notify(copy.sendDone, undefined, 'success');
    } catch (error) {
      notify(copy.sendFailed, error instanceof Error ? error.message : copy.tryAgain);
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
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
      hapticWarning();
    } catch (error) {
      notify(copy.cancelFailed, error instanceof Error ? error.message : copy.tryAgain);
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
      hapticSuccess();
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

  const toggleFavorite = (productId: string) => {
    const next = favoriteIds.includes(productId)
      ? favoriteIds.filter((id) => id !== productId)
      : [...favoriteIds, productId];
    setFavoriteIds(next);
    void saveWorkspacePreferences(preferencesKey, {
      favoriteProductIds: next,
      ...(paletteScope !== 'all' && paletteScope !== 'favorites' && paletteScope !== 'recent'
        ? { selectedCategoryId: paletteScope }
        : {}),
    });
  };

  const selectPaletteScope = (next: PaletteScope) => {
    setPaletteScope(next);
    void saveWorkspacePreferences(preferencesKey, {
      favoriteProductIds: favoriteIds,
      ...(next !== 'all' && next !== 'favorites' && next !== 'recent'
        ? { selectedCategoryId: next }
        : {}),
    });
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

  // Adisyon görünümü: tablet/desktop'ta inline, telefonda CartSheet içinde.
  const orderPane = (
    <OrderPane
      checkName={selectedCheck?.name || pendingCheckName || copy.newCheck}
      checkTotal={checkTotal}
      copy={copy}
      currencyCode={snapshot.products[0]?.currencyCode ?? 'EUR'}
      items={visibleItems}
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
          <ServiceIconButton
            icon="close"
            label={copy.close}
            onPress={() => setIncomingMessage(undefined)}
          />
        </View>
      ) : null}

      <CheckStrip
        checks={snapshot.checks}
        copy={copy}
        pendingCheckName={pendingCheckName}
        selectedCheckId={selectedCheckId}
        onAdd={() => {
          setPendingCheckName('');
          setSelectedCheckId(undefined);
          if (namedOrdersEnabled) {
            setCheckNameInput('');
            setShowCheckModal(true);
          }
        }}
        onSelect={(checkId) => {
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
        {!compact ? orderPane : null}
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
      </View>

      <DraftBar
        copy={copy}
        currencyCode={snapshot.products[0]?.currencyCode ?? 'EUR'}
        draft={draft}
        language={language}
        onClear={() => rememberDraft([])}
        onOpenDraft={() => setShowDraftSheet(true)}
        onRepeat={repeatLastBatch}
        onSend={() => void submit()}
        onUndo={undo}
        repeatAvailable={
          orderBatchesEnabled && snapshot.orderItems.some((item) => item.status !== 'cancelled')
        }
        submitting={submitting}
        totalMinor={draftTotal}
        undoAvailable={undoStack.length > 0}
      />

      <DraftSheet
        copy={copy}
        currencyCode={snapshot.products[0]?.currencyCode ?? 'EUR'}
        draft={draft}
        language={language}
        onChangeQuantity={changeDraftQuantity}
        onClose={() => setShowDraftSheet(false)}
        onRemove={removeDraftLine}
        visible={showDraftSheet}
      />

      <BottomSheetModal
        backdropComponent={backdrop}
        handleIndicatorStyle={{ backgroundColor: tokens.colors.border }}
        onDismiss={() => setShowActionsSheet(false)}
        ref={actionsSheetRef}
        snapPoints={['58%']}
      >
        <BottomSheetScrollView
          contentContainerStyle={{
            backgroundColor: tokens.colors.surface,
            gap: tokens.space.xs,
            paddingHorizontal: tokens.space.md,
            paddingBottom: tokens.space.xl,
          }}
        >
          <Text
            style={[
              tokens.typography.subtitle,
              { color: tokens.colors.text, paddingVertical: tokens.space.sm },
            ]}
          >
            {snapshot.table.label}
          </Text>
          <ServiceListRow
            accessory="chevron"
            icon="add-circle-outline"
            onPress={() => {
              setShowActionsSheet(false);
              setPendingCheckName('');
              setSelectedCheckId(undefined);
              if (namedOrdersEnabled) {
                setCheckNameInput('');
                setShowCheckModal(true);
              }
            }}
            title={copy.newCheck}
          />
          {compact ? (
            <ServiceListRow
              accessory="chevron"
              icon="receipt-outline"
              onPress={() => {
                setShowActionsSheet(false);
                setShowCartSheet(true);
              }}
              title={copy.order}
            />
          ) : null}
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
        </BottomSheetScrollView>
      </BottomSheetModal>

      <BottomSheetModal
        backdropComponent={backdrop}
        handleIndicatorStyle={{ backgroundColor: tokens.colors.border }}
        onDismiss={() => setShowCartSheet(false)}
        ref={cartSheetRef}
        snapPoints={['82%']}
      >
        <BottomSheetScrollView
          contentContainerStyle={{
            backgroundColor: tokens.colors.surface,
            paddingBottom: tokens.space.xl,
          }}
        >
          {compact ? orderPane : null}
        </BottomSheetScrollView>
      </BottomSheetModal>

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
