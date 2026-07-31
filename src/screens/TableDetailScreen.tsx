import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LegacyTableDetailScreen from './LegacyTableDetailScreen';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useOrderiaData } from '../data/runtime';
import {
  ServiceButton,
  ServiceEmptyState,
  ServiceIconButton,
  ServiceStatusPill,
  ServiceSurface,
  ServiceTextField,
  useAdaptiveLayout,
} from '../design-system';
import {
  CancellationReason,
  Check,
  CheckId,
  DeviceId,
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
  CheckSplitPlan,
  CheckSplitSheet,
  DraftOrderLine,
  TableWorkspaceSnapshot,
  WorkspaceProduct,
  applyCheckSplit,
  loadTableWorkspace,
  loadWorkspacePreferences,
  saveWorkspacePreferences,
  sendOrderBatch,
  resolveOrderItemNoteConflict,
  updateOrderItemNote,
  updateOrderItemQuantity,
  voidOrderItemQuantity,
} from '../features/table-workspace';
import { ConfirmCheckPaymentsCommand, PaymentSheet } from '../features/payments';
import {
  TableOperationSheet,
  TableOperationTarget,
  TransferTableSessionCommand,
} from '../features/table-operations';
import { PreparedReceiptPdf, ReceiptReadySheet, presentReceiptPdf } from '../features/receipts';
import { QuantityStepper } from '../components/QuantityStepper';
import { Language, useLocalization } from '../i18n';
import { RootStackParamList } from '../navigation/AppNavigator';
import { createTextMatcher } from '../utils/searchUtils';

type TableDetailRoute = RouteProp<RootStackParamList, 'TableDetail'>;
type Navigation = NativeStackNavigationProp<RootStackParamList>;
type PaletteScope = 'all' | 'favorites' | 'recent' | string;
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
  const [query, setQuery] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<readonly string[]>([]);
  const [showPaletteOnCompact, setShowPaletteOnCompact] = useState(true);
  const [configuring, setConfiguring] = useState<WorkspaceProduct>();
  const [configuration, setConfiguration] = useState<readonly ModifierOptionId[]>([]);
  const [configurationNote, setConfigurationNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancellingItem, setCancellingItem] = useState<OrderItem>();
  const [editingNoteItem, setEditingNoteItem] = useState<OrderItem>();
  const [editingNote, setEditingNote] = useState('');
  const [showDraftSheet, setShowDraftSheet] = useState(false);
  const [payingCheck, setPayingCheck] = useState<Check>();
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [splittingCheck, setSplittingCheck] = useState<Check>();
  const [splitBusy, setSplitBusy] = useState(false);
  const [showTableOperation, setShowTableOperation] = useState(false);
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
  const tableId = toDomainId<RestaurantTableId>(route.params.tableId);

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
    try {
      const next = await loadTableWorkspace(database, scope, tableId);
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
          const actorNames = actorIds.map((id) => names[id] ?? copy.unknownWaiter);
          setIncomingMessage(`${actorNames.join(', ')} · ${incoming.length} ${copy.incomingItems}`);
        }
      }
      snapshotRef.current = next;
      setSnapshot(next);
      setLoadError(next ? undefined : copy.tableNotFound);
    } catch {
      setLoadError(copy.loadFailed);
    } finally {
      setLoading(false);
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
    void resolveProfileNames(ids)
      .then(setWaiterNames)
      .catch(() => setWaiterNames({}));
  }, [resolveProfileNames, snapshot]);

  useEffect(() => {
    if (!snapshot?.session) {
      setParticipantNames([]);
      return;
    }
    void resolveActiveParticipants(snapshot.session.id)
      .then((participants) =>
        setParticipantNames(participants.map((participant) => participant.display_name)),
      )
      .catch(() => {
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
  const visibleItems =
    snapshot?.orderItems.filter((item) => item.checkId === selectedCheckId) ?? [];
  const draftTotal = draft.reduce((total, line) => total + draftLineTotal(line), 0);
  const checkTotal = snapshot
    ? visibleItems.reduce(
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
      setShowPaletteOnCompact(true);
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

  const submit = async () => {
    if (!database || !scope || !snapshot || draft.length === 0) return;
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
      setShowPaletteOnCompact(false);
      await reload();
      void refresh();
    } catch (error) {
      notify(copy.sendFailed, error instanceof Error ? error.message : copy.tryAgain);
    } finally {
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
      const clientMutationId = toDomainId<MutationId>(secureUuid());
      const result = await confirmCheckPayments(deviceId, clientMutationId, command);
      setPayingCheck(undefined);
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
      const clientMutationId = toDomainId<MutationId>(secureUuid());
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
  const showOrderPane = !compact || !showPaletteOnCompact;
  const showPalette = !compact || showPaletteOnCompact;

  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left', 'right']}
      style={{ flex: 1, backgroundColor: tokens.colors.bg }}
    >
      <WorkspaceHeader
        moveLabel={copy.moveTable}
        onBack={navigation.goBack}
        onMove={snapshot.session ? () => setShowTableOperation(true) : undefined}
        participantNames={participantNames}
        syncLabel={
          sync.online
            ? sync.pendingCount > 0
              ? `${sync.pendingCount} ${copy.queued}`
              : copy.synced
            : copy.offline
        }
        syncTone={sync.hasError ? 'error' : sync.pendingCount > 0 ? 'warning' : 'success'}
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
          setCheckNameInput('');
          setShowCheckModal(true);
        }}
        onSelect={(checkId) => {
          setPendingCheckName('');
          setSelectedCheckId(checkId);
        }}
        onSelectPending={() => setSelectedCheckId(undefined)}
      />

      {compact ? (
        <View
          accessibilityRole="tablist"
          style={{
            flexDirection: 'row',
            paddingHorizontal: tokens.space.md,
            paddingBottom: tokens.space.xs,
          }}
        >
          <SegmentButton
            icon="receipt-outline"
            label={`${copy.order} (${visibleItems.length})`}
            selected={!showPaletteOnCompact}
            onPress={() => setShowPaletteOnCompact(false)}
          />
          <SegmentButton
            icon="fast-food-outline"
            label={`${copy.products} (${draft.reduce((sum, line) => sum + line.quantity, 0)})`}
            selected={showPaletteOnCompact}
            onPress={() => setShowPaletteOnCompact(true)}
          />
        </View>
      ) : null}

      <View
        style={{
          flex: 1,
          flexDirection: compact ? 'column' : 'row',
          gap: tokens.space.md,
          paddingHorizontal: layout.horizontalPadding,
        }}
      >
        {showOrderPane ? (
          <OrderPane
            checkName={selectedCheck?.name || pendingCheckName || copy.newCheck}
            checkTotal={checkTotal}
            copy={copy}
            currencyCode={snapshot.products[0]?.currencyCode ?? 'EUR'}
            items={visibleItems}
            language={language}
            modifiers={snapshot.orderItemModifiers}
            conflicts={snapshot.conflicts}
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
              if (selectedCheck) setSplittingCheck(selectedCheck);
            }}
            waiterNames={waiterNames}
          />
        ) : null}
        {showPalette ? (
          <PalettePane
            categories={snapshot.categories}
            copy={copy}
            currencyCode={snapshot.products[0]?.currencyCode ?? 'EUR'}
            draft={draft}
            favoriteIds={favoriteIds}
            language={language}
            onAdd={addProduct}
            onDecrement={decrementDraftProduct}
            onQuery={setQuery}
            onScope={selectPaletteScope}
            onToggleAvailability={setAvailabilityTarget}
            onToggleFavorite={toggleFavorite}
            products={filteredProducts}
            query={query}
            selectedScope={paletteScope}
          />
        ) : null}
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
        repeatAvailable={snapshot.orderItems.some((item) => item.status !== 'cancelled')}
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
          visible
        />
      ) : null}
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

function WorkspaceHeader({
  tableLabel,
  syncLabel,
  syncTone,
  participantNames,
  onBack,
  onMove,
  moveLabel,
}: {
  readonly tableLabel: string;
  readonly syncLabel: string;
  readonly syncTone: 'success' | 'warning' | 'error';
  readonly participantNames: readonly string[];
  readonly onBack: () => void;
  readonly onMove?: () => void;
  readonly moveLabel: string;
}) {
  const { tokens } = useTheme();
  return (
    <View style={{ paddingHorizontal: tokens.space.md, paddingBottom: tokens.space.xs }}>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          minHeight: 64,
        }}
      >
        <ServiceIconButton icon="arrow-back" label="Back" onPress={onBack} />
        <Text
          style={[
            tokens.typography.title,
            { color: tokens.colors.text, flex: 1, marginHorizontal: tokens.space.sm },
          ]}
          numberOfLines={1}
        >
          {tableLabel}
        </Text>
        {onMove ? (
          <ServiceIconButton icon="swap-horizontal-outline" label={moveLabel} onPress={onMove} />
        ) : null}
        <ServiceStatusPill label={syncLabel} tone={syncTone} />
      </View>
      {participantNames.length > 0 ? (
        <View
          accessibilityLabel={participantNames.join(', ')}
          style={{ alignItems: 'center', flexDirection: 'row', marginLeft: 48 }}
        >
          <Ionicons color={tokens.colors.primary} name="people" size={16} />
          <Text
            numberOfLines={1}
            style={[
              tokens.typography.caption,
              { color: tokens.colors.textSubtle, marginLeft: tokens.space.xs },
            ]}
          >
            {participantNames.join(' · ')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function CheckStrip({
  checks,
  selectedCheckId,
  pendingCheckName,
  copy,
  onSelect,
  onSelectPending,
  onAdd,
}: {
  readonly checks: readonly Check[];
  readonly selectedCheckId?: CheckId;
  readonly pendingCheckName: string;
  readonly copy: WorkspaceCopy;
  readonly onSelect: (id: CheckId) => void;
  readonly onSelectPending: () => void;
  readonly onAdd: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <ScrollView
      horizontal
      accessibilityRole="tablist"
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{
        alignItems: 'center',
        gap: tokens.space.xs,
        paddingHorizontal: tokens.space.md,
        paddingBottom: tokens.space.sm,
      }}
    >
      {checks.map((check) => (
        <Chip
          key={check.id}
          label={check.name}
          role="tab"
          selected={check.id === selectedCheckId}
          onPress={() => onSelect(check.id)}
        />
      ))}
      {pendingCheckName ? (
        <Chip
          label={pendingCheckName}
          role="tab"
          selected={!selectedCheckId}
          onPress={onSelectPending}
        />
      ) : null}
      <Chip icon="add" label={copy.newCheck} role="tab" selected={false} onPress={onAdd} />
    </ScrollView>
  );
}

function Chip({
  label,
  selected,
  onPress,
  icon,
  role = 'button',
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
  readonly icon?: keyof typeof Ionicons.glyphMap;
  readonly role?: 'button' | 'tab';
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: selected ? tokens.colors.primary : tokens.colors.surface,
        borderColor: selected ? tokens.colors.primary : tokens.colors.border,
        borderRadius: tokens.radius.full,
        borderWidth: 1,
        flexDirection: 'row',
        minHeight: tokens.sizing.minimumTarget,
        opacity: pressed ? 0.8 : 1,
        paddingHorizontal: tokens.space.md,
      })}
    >
      {icon ? (
        <Ionicons
          color={selected ? tokens.colors.primaryContrast : tokens.colors.text}
          name={icon}
          size={18}
        />
      ) : null}
      <Text
        style={[
          tokens.typography.label,
          {
            color: selected ? tokens.colors.primaryContrast : tokens.colors.text,
            marginLeft: icon ? tokens.space.xxs : 0,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SegmentButton({
  icon,
  label,
  selected,
  onPress,
}: {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        alignItems: 'center',
        borderBottomColor: selected ? tokens.colors.primary : tokens.colors.border,
        borderBottomWidth: selected ? 3 : 1,
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        minHeight: 48,
      }}
    >
      <Ionicons
        color={selected ? tokens.colors.primary : tokens.colors.textSubtle}
        name={icon}
        size={19}
      />
      <Text
        style={[
          tokens.typography.label,
          {
            color: selected ? tokens.colors.primary : tokens.colors.textSubtle,
            marginLeft: tokens.space.xs,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function OrderPane({
  checkName,
  checkTotal,
  items,
  modifiers,
  conflicts,
  waiterNames,
  copy,
  language,
  currencyCode,
  onCancel,
  onChangeQuantity,
  onEditNote,
  onPay,
  onResolveConflict,
  onSplit,
}: {
  readonly checkName: string;
  readonly checkTotal: number;
  readonly items: readonly OrderItem[];
  readonly modifiers: TableWorkspaceSnapshot['orderItemModifiers'];
  readonly conflicts: TableWorkspaceSnapshot['conflicts'];
  readonly waiterNames: Readonly<Record<string, string>>;
  readonly copy: WorkspaceCopy;
  readonly language: Language;
  readonly currencyCode: string;
  readonly onCancel: (item: OrderItem) => void;
  readonly onChangeQuantity: (item: OrderItem, nextQuantity: number) => void;
  readonly onEditNote: (item: OrderItem) => void;
  readonly onPay: () => void;
  readonly onResolveConflict: (
    item: OrderItem,
    conflict: TableWorkspaceSnapshot['conflicts'][number],
    resolution: 'server' | 'local',
  ) => void;
  readonly onSplit: () => void;
}) {
  const { tokens } = useTheme();
  const hasLiveItems = items.some((item) => item.status !== 'cancelled');
  return (
    <ServiceSurface padding="none" style={{ flex: 1, minWidth: 0 }}>
      <View
        style={{
          alignItems: 'center',
          borderBottomColor: tokens.colors.borderLight,
          borderBottomWidth: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
          padding: tokens.space.md,
        }}
      >
        <View>
          <Text style={[tokens.typography.sectionTitle, { color: tokens.colors.text }]}>
            {checkName}
          </Text>
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
            {items.length} {copy.lines}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: tokens.space.xs }}>
          <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
            {formatMoney(checkTotal, currencyCode, language)}
          </Text>
          {hasLiveItems ? (
            <View style={{ flexDirection: 'row', gap: tokens.space.xs }}>
              <ServiceButton
                icon="git-branch-outline"
                label={copy.splitCheck}
                onPress={onSplit}
                variant="outline"
              />
              <ServiceButton icon="card-outline" label={copy.takePayment} onPress={onPay} />
            </View>
          ) : null}
        </View>
      </View>
      {items.length === 0 ? (
        <ServiceEmptyState body={copy.tapProduct} icon="restaurant-outline" title={copy.noOrders} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: tokens.space.sm }}
          renderItem={({ item }) => {
            const itemModifiers = modifiers.filter((modifier) => modifier.orderItemId === item.id);
            const conflict = conflicts.find(
              (candidate) =>
                candidate.entityId === item.id &&
                candidate.repository === 'orderItems' &&
                candidate.status === 'unresolved',
            );
            return (
              <View
                style={{
                  borderBottomColor: tokens.colors.borderLight,
                  borderBottomWidth: 1,
                  opacity: item.status === 'cancelled' ? 0.58 : 1,
                  paddingVertical: tokens.space.sm,
                }}
              >
                <View style={{ alignItems: 'flex-start', flexDirection: 'row' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[tokens.typography.bodyStrong, { color: tokens.colors.text }]}>
                      {item.quantity}× {item.nameSnapshot}
                    </Text>
                    {itemModifiers.map((modifier) => (
                      <Text
                        key={modifier.id}
                        style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}
                      >
                        + {modifier.modifierOptionNameSnapshot}
                      </Text>
                    ))}
                    {item.note ? (
                      <Text style={[tokens.typography.caption, { color: tokens.colors.warning }]}>
                        {copy.note}: {item.note}
                      </Text>
                    ) : null}
                    <Text
                      style={[
                        tokens.typography.caption,
                        { color: tokens.colors.textMuted, marginTop: tokens.space.xxs },
                      ]}
                    >
                      {waiterNames[item.createdBy] ?? copy.unknownWaiter} ·{' '}
                      {timeOnly(item.createdAt, language)}
                    </Text>
                    {item.status === 'ordered' ? (
                      <QuantityStepper
                        decreaseDisabled={item.quantity <= 1}
                        decreaseLabel={`${copy.decrease}: ${item.nameSnapshot}`}
                        increaseLabel={`${copy.increase}: ${item.nameSnapshot}`}
                        onDecrease={() => onChangeQuantity(item, item.quantity - 1)}
                        onIncrease={() => onChangeQuantity(item, item.quantity + 1)}
                        quantity={item.quantity}
                      />
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[tokens.typography.label, { color: tokens.colors.text }]}>
                      {formatMoney(
                        calculateOrderItemTotal(item, itemModifiers),
                        item.currencyCode,
                        language,
                      )}
                    </Text>
                    {item.status !== 'cancelled' ? (
                      <View style={{ flexDirection: 'row' }}>
                        <ServiceIconButton
                          icon="create-outline"
                          label={`${copy.editNote}: ${item.nameSnapshot}`}
                          onPress={() => onEditNote(item)}
                        />
                        <ServiceIconButton
                          icon="close-circle-outline"
                          label={`${copy.cancelItem}: ${item.nameSnapshot}`}
                          onPress={() => onCancel(item)}
                        />
                      </View>
                    ) : (
                      <ServiceStatusPill label={copy.cancelled} tone="error" />
                    )}
                  </View>
                </View>
                {conflict ? (
                  <View
                    accessibilityRole="alert"
                    style={{
                      backgroundColor: tokens.colors.accentSoft,
                      borderColor: tokens.colors.warning,
                      borderRadius: tokens.radius.medium,
                      borderWidth: 1,
                      marginTop: tokens.space.sm,
                      padding: tokens.space.sm,
                    }}
                  >
                    <Text style={[tokens.typography.bodyStrong, { color: tokens.colors.text }]}>
                      {copy.noteConflict}
                    </Text>
                    <Text
                      style={[
                        tokens.typography.caption,
                        { color: tokens.colors.textSubtle, marginTop: tokens.space.xxs },
                      ]}
                    >
                      {copy.yourNote}: {conflictNote(conflict.localPayload) || copy.noNote}
                    </Text>
                    <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
                      {copy.cloudNote}: {conflictNote(conflict.serverPayload) || copy.noNote}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: tokens.space.xs,
                        marginTop: tokens.space.sm,
                      }}
                    >
                      <ServiceButton
                        label={copy.useCloudNote}
                        onPress={() => onResolveConflict(item, conflict, 'server')}
                        variant="outline"
                      />
                      <ServiceButton
                        label={copy.keepMyNote}
                        onPress={() => onResolveConflict(item, conflict, 'local')}
                      />
                    </View>
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </ServiceSurface>
  );
}

function PalettePane({
  categories,
  products,
  selectedScope,
  favoriteIds,
  query,
  draft,
  copy,
  language,
  currencyCode,
  onScope,
  onQuery,
  onAdd,
  onDecrement,
  onToggleFavorite,
  onToggleAvailability,
}: {
  readonly categories: TableWorkspaceSnapshot['categories'];
  readonly products: readonly WorkspaceProduct[];
  readonly selectedScope: PaletteScope;
  readonly favoriteIds: readonly string[];
  readonly query: string;
  readonly draft: readonly DraftOrderLine[];
  readonly copy: WorkspaceCopy;
  readonly language: Language;
  readonly currencyCode: string;
  readonly onScope: (scope: PaletteScope) => void;
  readonly onQuery: (query: string) => void;
  readonly onAdd: (product: WorkspaceProduct, configure?: boolean) => void;
  readonly onDecrement: (product: WorkspaceProduct) => void;
  readonly onToggleFavorite: (id: string) => void;
  readonly onToggleAvailability: (product: WorkspaceProduct) => void;
}) {
  const { tokens } = useTheme();
  return (
    <ServiceSurface padding="none" style={{ flex: 1.2, minWidth: 0 }}>
      <View style={{ padding: tokens.space.sm }}>
        <ServiceTextField
          label={copy.search}
          onChangeText={onQuery}
          returnKeyType="search"
          value={query}
        />
        <ScrollView
          horizontal
          accessibilityRole="tablist"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: tokens.space.xs, paddingTop: tokens.space.sm }}
        >
          <Chip
            label={copy.all}
            role="tab"
            selected={selectedScope === 'all'}
            onPress={() => onScope('all')}
          />
          <Chip
            icon="star"
            label={copy.favorites}
            role="tab"
            selected={selectedScope === 'favorites'}
            onPress={() => onScope('favorites')}
          />
          <Chip
            icon="time"
            label={copy.recents}
            role="tab"
            selected={selectedScope === 'recent'}
            onPress={() => onScope('recent')}
          />
          {categories.map((category) => (
            <Chip
              key={category.id}
              label={category.name}
              role="tab"
              selected={selectedScope === category.id}
              onPress={() => onScope(category.id)}
            />
          ))}
        </ScrollView>
      </View>
      {products.length === 0 ? (
        <ServiceEmptyState body={copy.changeFilter} icon="search-outline" title={copy.noProducts} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(product) => product.id}
          numColumns={2}
          contentContainerStyle={{ padding: tokens.space.xs }}
          renderItem={({ item }) => {
            const inDraft = draft
              .filter((line) => line.product.id === item.id)
              .reduce((total, line) => total + line.quantity, 0);
            const soldOut = !item.isAvailable;
            return (
              <View style={{ flex: 1, maxWidth: '50%', padding: tokens.space.xxs }}>
                <Pressable
                  accessibilityHint={soldOut ? copy.soldOutHint : copy.longPress}
                  accessibilityLabel={
                    soldOut
                      ? `${item.name}, ${copy.soldOut}`
                      : `${item.name}, ${formatMoney(item.priceMinor, currencyCode, language)}`
                  }
                  accessibilityRole="button"
                  accessibilityState={{ disabled: soldOut }}
                  onLongPress={() => (soldOut ? onToggleAvailability(item) : onAdd(item, true))}
                  onPress={() => (soldOut ? onToggleAvailability(item) : onAdd(item))}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? tokens.colors.accentSoft : tokens.colors.surfaceAlt,
                    borderColor: soldOut
                      ? tokens.colors.border
                      : inDraft > 0
                        ? tokens.colors.accent
                        : tokens.colors.border,
                    borderRadius: tokens.radius.medium,
                    borderStyle: soldOut ? 'dashed' : 'solid',
                    borderWidth: inDraft > 0 && !soldOut ? 2 : 1,
                    minHeight: 92,
                    opacity: soldOut ? 0.55 : 1,
                    padding: tokens.space.sm,
                  })}
                >
                  <View style={{ alignItems: 'flex-start', flexDirection: 'row' }}>
                    <Text
                      numberOfLines={2}
                      style={[tokens.typography.bodyStrong, { color: tokens.colors.text, flex: 1 }]}
                    >
                      {item.name}
                    </Text>
                    <Pressable
                      accessibilityLabel={`${copy.favorite}: ${item.name}`}
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={(event) => {
                        event.stopPropagation();
                        onToggleFavorite(item.id);
                      }}
                      style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 40,
                        minWidth: 40,
                      }}
                    >
                      <Ionicons
                        color={
                          favoriteIds.includes(item.id)
                            ? tokens.colors.warning
                            : tokens.colors.textMuted
                        }
                        name={favoriteIds.includes(item.id) ? 'star' : 'star-outline'}
                        size={21}
                      />
                    </Pressable>
                  </View>
                  <View
                    style={{
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginTop: 'auto',
                    }}
                  >
                    {soldOut ? (
                      <ServiceStatusPill label={copy.soldOut} tone="error" />
                    ) : (
                      <Text style={[tokens.typography.label, { color: tokens.colors.primary }]}>
                        {formatMoney(item.priceMinor, item.currencyCode, language)}
                      </Text>
                    )}
                    {inDraft > 0 && !soldOut ? (
                      <QuantityStepper
                        compact
                        decreaseLabel={`${copy.decrease}: ${item.name}`}
                        increaseLabel={`${copy.increase}: ${item.name}`}
                        onDecrease={() => onDecrement(item)}
                        onIncrease={() => onAdd(item)}
                        quantity={inDraft}
                      />
                    ) : null}
                  </View>
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </ServiceSurface>
  );
}

function DraftBar({
  draft,
  totalMinor,
  currencyCode,
  language,
  copy,
  submitting,
  undoAvailable,
  repeatAvailable,
  onUndo,
  onClear,
  onOpenDraft,
  onRepeat,
  onSend,
}: {
  readonly draft: readonly DraftOrderLine[];
  readonly totalMinor: number;
  readonly currencyCode: string;
  readonly language: Language;
  readonly copy: WorkspaceCopy;
  readonly submitting: boolean;
  readonly undoAvailable: boolean;
  readonly repeatAvailable: boolean;
  readonly onUndo: () => void;
  readonly onClear: () => void;
  readonly onOpenDraft: () => void;
  readonly onRepeat: () => void;
  readonly onSend: () => void;
}) {
  const { tokens } = useTheme();
  const count = draft.reduce((total, line) => total + line.quantity, 0);
  return (
    <View
      style={[
        tokens.elevation.sticky,
        {
          alignItems: 'center',
          backgroundColor: tokens.colors.surface,
          borderTopColor: tokens.colors.border,
          borderTopWidth: 1,
          flexDirection: 'row',
          gap: tokens.space.xs,
          padding: tokens.space.sm,
        },
      ]}
    >
      <ServiceIconButton
        disabled={!undoAvailable}
        icon="arrow-undo"
        label={copy.undo}
        onPress={onUndo}
      />
      <ServiceIconButton
        disabled={!repeatAvailable}
        icon="repeat"
        label={copy.repeatLastOrder}
        onPress={onRepeat}
      />
      <ServiceIconButton
        disabled={draft.length === 0}
        icon="trash-outline"
        label={copy.clearDraft}
        onPress={onClear}
      />
      <Pressable
        accessibilityHint={copy.editDraft}
        accessibilityRole="button"
        disabled={draft.length === 0}
        onPress={onOpenDraft}
        style={{ flex: 1, justifyContent: 'center', minHeight: 48 }}
      >
        <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
          {count} {copy.products}
        </Text>
        <Text style={[tokens.typography.bodyStrong, { color: tokens.colors.text }]}>
          {formatMoney(totalMinor, currencyCode, language)}
        </Text>
      </Pressable>
      <ServiceButton
        disabled={draft.length === 0}
        icon="paper-plane"
        label={copy.sendOrder}
        loading={submitting}
        onPress={onSend}
        size="large"
        variant="accent"
      />
    </View>
  );
}

function DraftSheet({
  draft,
  visible,
  currencyCode,
  language,
  copy,
  onChangeQuantity,
  onRemove,
  onClose,
}: {
  readonly draft: readonly DraftOrderLine[];
  readonly visible: boolean;
  readonly currencyCode: string;
  readonly language: Language;
  readonly copy: WorkspaceCopy;
  readonly onChangeQuantity: (lineId: string, delta: number) => void;
  readonly onRemove: (lineId: string) => void;
  readonly onClose: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <WorkspaceModal title={copy.editDraft} visible={visible} onClose={onClose}>
      {draft.length === 0 ? (
        <Text
          style={[
            tokens.typography.body,
            { color: tokens.colors.textSubtle, marginBottom: tokens.space.sm },
          ]}
        >
          {copy.draftEmpty}
        </Text>
      ) : (
        <ScrollView style={{ maxHeight: 420 }}>
          {draft.map((line) => {
            const selectedOptions = line.product.modifierGroups
              .flatMap((group) => group.options)
              .filter((option) => line.selectedOptionIds.includes(option.id));
            return (
              <View
                key={line.id}
                style={{
                  alignItems: 'center',
                  borderBottomColor: tokens.colors.borderLight,
                  borderBottomWidth: 1,
                  flexDirection: 'row',
                  gap: tokens.space.sm,
                  paddingVertical: tokens.space.sm,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[tokens.typography.bodyStrong, { color: tokens.colors.text }]}>
                    {line.product.name}
                  </Text>
                  {selectedOptions.map((option) => (
                    <Text
                      key={option.id}
                      style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}
                    >
                      + {option.name}
                    </Text>
                  ))}
                  {line.note ? (
                    <Text style={[tokens.typography.caption, { color: tokens.colors.warning }]}>
                      {copy.note}: {line.note}
                    </Text>
                  ) : null}
                  <Text style={[tokens.typography.caption, { color: tokens.colors.textMuted }]}>
                    {formatMoney(draftLineTotal(line), currencyCode, language)}
                  </Text>
                </View>
                <QuantityStepper
                  decreaseLabel={`${copy.decrease}: ${line.product.name}`}
                  increaseLabel={`${copy.increase}: ${line.product.name}`}
                  onDecrease={() => onChangeQuantity(line.id, -1)}
                  onIncrease={() => onChangeQuantity(line.id, 1)}
                  quantity={line.quantity}
                />
                <ServiceIconButton
                  icon="trash-outline"
                  label={`${copy.clearDraft}: ${line.product.name}`}
                  onPress={() => onRemove(line.id)}
                />
              </View>
            );
          })}
        </ScrollView>
      )}
      <ModalActions cancel={copy.close} onCancel={onClose} />
    </WorkspaceModal>
  );
}

function NameCheckModal({
  visible,
  name,
  copy,
  onChange,
  onClose,
  onConfirm,
}: {
  readonly visible: boolean;
  readonly name: string;
  readonly copy: WorkspaceCopy;
  readonly onChange: (value: string) => void;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}) {
  return (
    <WorkspaceModal title={copy.newCheck} visible={visible} onClose={onClose}>
      <ServiceTextField
        autoFocus
        label={copy.checkName}
        maxLength={80}
        onChangeText={onChange}
        placeholder={copy.checkExample}
        value={name}
      />
      <ModalActions
        cancel={copy.close}
        confirm={copy.create}
        confirmDisabled={!name.trim()}
        onCancel={onClose}
        onConfirm={onConfirm}
      />
    </WorkspaceModal>
  );
}

function ItemNoteModal({
  item,
  note,
  copy,
  onChange,
  onClose,
  onConfirm,
}: {
  readonly item?: OrderItem;
  readonly note: string;
  readonly copy: WorkspaceCopy;
  readonly onChange: (value: string) => void;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}) {
  return (
    <WorkspaceModal
      title={`${copy.editNote}: ${item?.nameSnapshot ?? ''}`}
      visible={Boolean(item)}
      onClose={onClose}
    >
      <ServiceTextField
        autoFocus
        label={copy.note}
        maxLength={500}
        multiline
        onChangeText={onChange}
        placeholder={copy.noteExample}
        value={note}
      />
      <NotePresetChips copy={copy} note={note} onChange={onChange} />
      <ModalActions
        cancel={copy.close}
        confirm={copy.saveNote}
        onCancel={onClose}
        onConfirm={onConfirm}
      />
    </WorkspaceModal>
  );
}

function NotePresetChips({
  copy,
  note,
  onChange,
}: {
  readonly copy: WorkspaceCopy;
  readonly note: string;
  readonly onChange: (note: string) => void;
}) {
  const { tokens } = useTheme();
  return (
    <View style={{ marginTop: tokens.space.xs }}>
      <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
        {copy.quickNotes}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: tokens.space.xs,
          marginTop: tokens.space.xs,
        }}
      >
        {copy.notePresets.map((preset) => (
          <Chip
            key={preset}
            label={preset}
            selected={false}
            onPress={() => {
              const trimmed = note.trim();
              if (!trimmed) {
                onChange(preset);
                return;
              }
              if (trimmed.toLocaleLowerCase().includes(preset.toLocaleLowerCase())) return;
              onChange(`${trimmed}, ${preset}`);
            }}
          />
        ))}
      </View>
    </View>
  );
}

function ProductConfigurationModal({
  product,
  selected,
  note,
  copy,
  onToggle,
  onChangeNote,
  onClose,
  onConfirm,
}: {
  readonly product?: WorkspaceProduct;
  readonly selected: readonly ModifierOptionId[];
  readonly note: string;
  readonly copy: WorkspaceCopy;
  readonly onToggle: (groupId: string, optionId: ModifierOptionId) => void;
  readonly onChangeNote: (note: string) => void;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}) {
  const { tokens } = useTheme();
  const valid =
    product?.modifierGroups.every((group) => {
      const count = selected.filter((id) =>
        group.options.some((option) => option.id === id),
      ).length;
      return (
        count >= Math.max(group.minimumChoices, group.isRequired ? 1 : 0) &&
        count <= (group.selectionType === 'single' ? 1 : (group.maximumChoices ?? 999))
      );
    }) ?? false;

  return (
    <WorkspaceModal title={product?.name ?? ''} visible={Boolean(product)} onClose={onClose}>
      <ScrollView style={{ maxHeight: 420 }}>
        {product?.modifierGroups.map((group) => (
          <View key={group.id} style={{ marginBottom: tokens.space.md }}>
            <Text style={[tokens.typography.bodyStrong, { color: tokens.colors.text }]}>
              {group.name} {group.isRequired ? `· ${copy.required}` : ''}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: tokens.space.xs,
                marginTop: tokens.space.xs,
              }}
            >
              {group.options.map((option) => (
                <Chip
                  key={option.id}
                  label={`${option.name}${option.priceDeltaMinor ? ` +${option.priceDeltaMinor / 100}` : ''}`}
                  selected={selected.includes(option.id)}
                  onPress={() => onToggle(group.id, option.id)}
                />
              ))}
            </View>
          </View>
        ))}
        <ServiceTextField
          label={copy.note}
          maxLength={500}
          multiline
          onChangeText={onChangeNote}
          placeholder={copy.noteExample}
          value={note}
        />
        <NotePresetChips copy={copy} note={note} onChange={onChangeNote} />
      </ScrollView>
      <ModalActions
        cancel={copy.close}
        confirm={copy.addToDraft}
        confirmDisabled={!valid}
        onCancel={onClose}
        onConfirm={onConfirm}
      />
    </WorkspaceModal>
  );
}

function CancellationModal({
  item,
  reasons,
  isManager,
  copy,
  onClose,
  onCancel,
}: {
  readonly item?: OrderItem;
  readonly reasons: readonly CancellationReason[];
  readonly isManager: boolean;
  readonly copy: WorkspaceCopy;
  readonly onClose: () => void;
  readonly onCancel: (reason: CancellationReason, quantity: number) => void;
}) {
  const { tokens } = useTheme();
  const maximum = item?.quantity ?? 1;
  const [quantity, setQuantity] = useState(maximum);

  // Satir degistiginde adet, o satirin tamamina doner: yarim kalmis bir
  // secim yanlislikla baska bir urune tasinmasin.
  useEffect(() => {
    setQuantity(maximum);
  }, [item?.id, maximum]);

  return (
    <WorkspaceModal
      title={`${copy.cancelItem}: ${item?.nameSnapshot ?? ''}`}
      visible={Boolean(item)}
      onClose={onClose}
    >
      <Text
        style={[
          tokens.typography.body,
          { color: tokens.colors.textSubtle, marginBottom: tokens.space.sm },
        ]}
      >
        {copy.chooseReason}
      </Text>
      {maximum > 1 ? (
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            gap: tokens.space.md,
            marginBottom: tokens.space.md,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={[tokens.typography.bodyStrong, { color: tokens.colors.text }]}>
              {copy.voidQuantityTitle}
            </Text>
            <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
              {copy.voidQuantityLabel}: {quantity} / {maximum}
            </Text>
          </View>
          <QuantityStepper
            decreaseDisabled={quantity <= 1}
            decreaseLabel={copy.decrease}
            increaseDisabled={quantity >= maximum}
            increaseLabel={copy.increase}
            onDecrease={() => setQuantity((current) => Math.max(1, current - 1))}
            onIncrease={() => setQuantity((current) => Math.min(maximum, current + 1))}
            quantity={quantity}
          />
        </View>
      ) : null}
      {reasons.length === 0 ? (
        <ServiceEmptyState
          body={copy.askManagerReasons}
          icon="alert-circle-outline"
          title={copy.noReasons}
        />
      ) : (
        <View style={{ gap: tokens.space.xs }}>
          {reasons.map((reason) => (
            <ServiceButton
              key={reason.id}
              disabled={reason.requiresManager && !isManager}
              fullWidth
              icon={reason.requiresManager ? 'shield-checkmark-outline' : 'close-circle-outline'}
              label={`${reason.name}${reason.requiresManager ? ` · ${copy.manager}` : ''}`}
              onPress={() => onCancel(reason, quantity)}
              variant="outline"
            />
          ))}
        </View>
      )}
      <ModalActions cancel={copy.close} onCancel={onClose} />
    </WorkspaceModal>
  );
}

function WorkspaceModal({
  visible,
  title,
  children,
  onClose,
}: {
  readonly visible: boolean;
  readonly title: string;
  readonly children: React.ReactNode;
  readonly onClose: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable
        onPress={onClose}
        style={{
          alignItems: 'center',
          backgroundColor: tokens.colors.overlay,
          flex: 1,
          justifyContent: 'center',
          padding: tokens.space.md,
        }}
      >
        <Pressable
          accessibilityViewIsModal
          onPress={(event) => event.stopPropagation()}
          style={[
            tokens.elevation.overlay,
            {
              backgroundColor: tokens.colors.surface,
              borderRadius: tokens.radius.large,
              maxWidth: 560,
              padding: tokens.space.lg,
              width: '100%',
            },
          ]}
        >
          <Text
            style={[
              tokens.typography.sectionTitle,
              { color: tokens.colors.text, marginBottom: tokens.space.md },
            ]}
          >
            {title}
          </Text>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ModalActions({
  cancel,
  confirm,
  confirmDisabled,
  onCancel,
  onConfirm,
}: {
  readonly cancel: string;
  readonly confirm?: string;
  readonly confirmDisabled?: boolean;
  readonly onCancel: () => void;
  readonly onConfirm?: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: tokens.space.xs,
        justifyContent: 'flex-end',
        marginTop: tokens.space.lg,
      }}
    >
      <ServiceButton label={cancel} onPress={onCancel} variant="ghost" />
      {confirm && onConfirm ? (
        <ServiceButton disabled={confirmDisabled} label={confirm} onPress={onConfirm} />
      ) : null}
    </View>
  );
}

function CenteredState({ children }: { readonly children: React.ReactNode }) {
  const { tokens } = useTheme();
  return (
    <SafeAreaView
      style={{
        alignItems: 'center',
        backgroundColor: tokens.colors.bg,
        flex: 1,
        gap: tokens.space.sm,
        justifyContent: 'center',
        padding: tokens.space.lg,
      }}
    >
      {children}
    </SafeAreaView>
  );
}

function draftLineTotal(line: DraftOrderLine): number {
  const optionIds = new Set(line.selectedOptionIds);
  const modifierMinor = line.product.modifierGroups
    .flatMap((group) => group.options)
    .filter((option) => optionIds.has(option.id))
    .reduce((total, option) => total + option.priceDeltaMinor, 0);
  return (line.product.priceMinor + modifierMinor) * line.quantity;
}

function formatMoney(amountMinor: number, currencyCode: string, language: Language): string {
  return new Intl.NumberFormat(
    language === 'tr' ? 'tr-TR' : language === 'bg' ? 'bg-BG' : 'en-GB',
    {
      style: 'currency',
      currency: currencyCode,
    },
  ).format(amountMinor / 100);
}

function secureUuid(): string {
  const value = globalThis.crypto?.randomUUID?.();
  if (!value) throw new Error('Secure UUID generation is unavailable');
  return value;
}

function timeOnly(timestamp: string, language: Language): string {
  return new Intl.DateTimeFormat(
    language === 'tr' ? 'tr-TR' : language === 'bg' ? 'bg-BG' : 'en-GB',
    {
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(new Date(timestamp));
}

function conflictNote(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const note = (value as { readonly note?: unknown }).note;
  return typeof note === 'string' && note.trim() ? note.trim() : undefined;
}

interface WorkspaceCopy {
  readonly loading: string;
  readonly loadFailed: string;
  readonly tableNotFound: string;
  readonly back: string;
  readonly couldNotOpen: string;
  readonly queued: string;
  readonly synced: string;
  readonly offline: string;
  readonly check: string;
  readonly newCheck: string;
  readonly checkName: string;
  readonly checkExample: string;
  readonly create: string;
  readonly close: string;
  readonly order: string;
  readonly products: string;
  readonly lines: string;
  readonly noOrders: string;
  readonly tapProduct: string;
  readonly unknownWaiter: string;
  readonly note: string;
  readonly cancelled: string;
  readonly cancelItem: string;
  readonly search: string;
  readonly all: string;
  readonly favorites: string;
  readonly recents: string;
  readonly favorite: string;
  readonly longPress: string;
  readonly noProducts: string;
  readonly changeFilter: string;
  readonly undo: string;
  readonly clearDraft: string;
  readonly sendOrder: string;
  readonly sendFailed: string;
  readonly cancelFailed: string;
  readonly tryAgain: string;
  readonly required: string;
  readonly noteExample: string;
  readonly addToDraft: string;
  readonly chooseReason: string;
  readonly noReasons: string;
  readonly askManagerReasons: string;
  readonly manager: string;
  readonly localSafe: string;
  readonly incomingItems: string;
  readonly editNote: string;
  readonly saveNote: string;
  readonly noteSaveFailed: string;
  readonly noteConflict: string;
  readonly yourNote: string;
  readonly cloudNote: string;
  readonly noNote: string;
  readonly useCloudNote: string;
  readonly keepMyNote: string;
  readonly conflictFailed: string;
  readonly takePayment: string;
  readonly paymentConfirmed: string;
  readonly paymentFailed: string;
  readonly paymentChanged: string;
  readonly remaining: string;
  readonly moveTable: string;
  readonly tableMoved: string;
  readonly tablesMerged: string;
  readonly tableChanged: string;
  readonly receiptSyncing: string;
  readonly pdfFailed: string;
  readonly decrease: string;
  readonly increase: string;
  readonly editDraft: string;
  readonly draftEmpty: string;
  readonly repeatLastOrder: string;
  readonly quickNotes: string;
  readonly quantityChangeFailed: string;
  readonly cancel: string;
  readonly soldOut: string;
  readonly soldOutHint: string;
  readonly soldOutTitle: string;
  readonly markSoldOut: string;
  readonly restoreProductTitle: string;
  readonly restoreProduct: string;
  readonly availabilityFailed: string;
  readonly splitCheck: string;
  readonly splitFailed: string;
  readonly splitDone: string;
  readonly voidQuantityTitle: string;
  readonly voidQuantityLabel: string;
  readonly notePresets: readonly string[];
}

function workspaceCopy(language: Language): WorkspaceCopy {
  if (language === 'tr') {
    return {
      loading: 'Masa hazırlanıyor…',
      loadFailed: 'Masa verileri okunamadı.',
      tableNotFound: 'Bu masa bu şubede bulunamadı.',
      back: 'Geri dön',
      couldNotOpen: 'Masa açılamadı',
      queued: 'değişiklik sırada',
      synced: 'Senkron',
      offline: 'Çevrimdışı',
      check: 'Hesap',
      newCheck: 'Yeni hesap',
      checkName: 'Hesap adı',
      checkExample: 'Örn. Pencere tarafı',
      create: 'Oluştur',
      close: 'Kapat',
      order: 'Sipariş',
      products: 'Ürün',
      lines: 'satır',
      noOrders: 'Bu hesapta sipariş yok',
      tapProduct: 'Sağdaki paletten ürüne dokun. Ürün taslağa anında eklenir.',
      unknownWaiter: 'Bilinmeyen garson',
      note: 'Not',
      cancelled: 'İptal',
      cancelItem: 'Satırı iptal et',
      search: 'Ürün ara',
      all: 'Tümü',
      favorites: 'Favoriler',
      recents: 'Son kullanılan',
      favorite: 'Favori',
      longPress: 'Modifier ve not için basılı tut',
      noProducts: 'Ürün bulunamadı',
      changeFilter: 'Aramayı veya kategoriyi değiştir.',
      undo: 'Son işlemi geri al',
      clearDraft: 'Taslağı temizle',
      sendOrder: 'Siparişi gönder',
      sendFailed: 'Sipariş gönderilemedi',
      cancelFailed: 'Satır iptal edilemedi',
      tryAgain: 'Tekrar deneyin.',
      required: 'zorunlu',
      noteExample: 'Örn. az tuzlu, sos ayrı',
      addToDraft: 'Taslağa ekle',
      chooseReason: 'Gönderilmiş sipariş silinmez. Bir iptal nedeni seçin.',
      noReasons: 'İptal nedeni tanımlı değil',
      askManagerReasons: 'Yöneticiden şube için iptal nedenlerini tanımlamasını isteyin.',
      manager: 'Yönetici',
      localSafe: 'Bulut yenilenemedi. Yerel siparişler cihazda güvende.',
      incomingItems: 'yeni ürün ekledi',
      editNote: 'Notu düzenle',
      saveNote: 'Notu kaydet',
      noteSaveFailed: 'Not kaydedilemedi',
      noteConflict: 'Not başka bir cihazda değişti',
      yourNote: 'Senin notun',
      cloudNote: 'Buluttaki not',
      noNote: 'Not yok',
      useCloudNote: 'Buluttakini kullan',
      keepMyNote: 'Benim notumu uygula',
      conflictFailed: 'Çakışma çözülemedi',
      takePayment: 'Ödeme al',
      paymentConfirmed: 'Ödeme kesinleşti',
      paymentFailed: 'Ödeme kesinleştirilemedi',
      paymentChanged: 'Hesap başka bir cihazda değişti. Güncel kalan tutarı kontrol edin.',
      remaining: 'Kalan',
      moveTable: 'Masayı taşı veya birleştir',
      tableMoved: 'Masa taşındı',
      tablesMerged: 'Masalar birleştirildi',
      tableChanged: 'Kaynak veya hedef masa başka bir cihazda değişti. Güncel durumu kontrol edin.',
      receiptSyncing: 'Fiş oluşturuldu ve arşive senkronize ediliyor.',
      pdfFailed: 'Fiş PDF’i hazırlanamadı',
      decrease: 'Azalt',
      increase: 'Artır',
      editDraft: 'Taslağı düzenle',
      draftEmpty: 'Taslak boş',
      repeatLastOrder: 'Son siparişi tekrarla',
      quickNotes: 'Hızlı notlar',
      quantityChangeFailed: 'Adet değiştirilemedi',
      cancel: 'Vazgeç',
      soldOut: 'Tükendi',
      soldOutHint: 'Stoğa geri almak için dokun',
      soldOutTitle: 'Bugünlük tükendi mi?',
      markSoldOut: 'Tükendi olarak işaretle',
      restoreProductTitle: 'Tekrar satışa açılsın mı?',
      restoreProduct: 'Satışa aç',
      availabilityFailed: 'Ürün durumu değiştirilemedi',
      splitCheck: 'Hesabı böl',
      splitFailed: 'Hesap bölünemedi',
      splitDone: 'Hesap bölündü',
      voidQuantityTitle: 'Kaç adet iptal edilsin?',
      voidQuantityLabel: 'İptal edilecek adet',
      notePresets: ['Acil', 'Soğansız', 'Az pişmiş', 'İyi pişmiş', 'Acılı', 'Sos ayrıda'],
    };
  }
  if (language === 'bg') {
    return {
      loading: 'Масата се зарежда…',
      loadFailed: 'Данните за масата не могат да се прочетат.',
      tableNotFound: 'Масата не е намерена в този обект.',
      back: 'Назад',
      couldNotOpen: 'Масата не може да се отвори',
      queued: 'промени на опашка',
      synced: 'Синхронизирано',
      offline: 'Офлайн',
      check: 'Сметка',
      newCheck: 'Нова сметка',
      checkName: 'Име на сметката',
      checkExample: 'Напр. До прозореца',
      create: 'Създай',
      close: 'Затвори',
      order: 'Поръчка',
      products: 'продукта',
      lines: 'реда',
      noOrders: 'Няма поръчки в тази сметка',
      tapProduct: 'Докоснете продукт от палитрата, за да го добавите веднага.',
      unknownWaiter: 'Неизвестен сервитьор',
      note: 'Бележка',
      cancelled: 'Отказано',
      cancelItem: 'Откажи реда',
      search: 'Търси продукт',
      all: 'Всички',
      favorites: 'Любими',
      recents: 'Последни',
      favorite: 'Любим',
      longPress: 'Задръжте за опции и бележка',
      noProducts: 'Няма продукти',
      changeFilter: 'Променете търсенето или категорията.',
      undo: 'Отмени последното',
      clearDraft: 'Изчисти черновата',
      sendOrder: 'Изпрати поръчката',
      sendFailed: 'Поръчката не е изпратена',
      cancelFailed: 'Редът не е отказан',
      tryAgain: 'Опитайте отново.',
      required: 'задължително',
      noteExample: 'Напр. по-малко сол, сос отделно',
      addToDraft: 'Добави',
      chooseReason: 'Изпратена поръчка не се изтрива. Изберете причина.',
      noReasons: 'Няма причини за отказ',
      askManagerReasons: 'Помолете управителя да добави причини за този обект.',
      manager: 'Управител',
      localSafe: 'Облакът не се обнови. Локалните поръчки са запазени.',
      incomingItems: 'добави нови продукта',
      editNote: 'Редактирай бележката',
      saveNote: 'Запази бележката',
      noteSaveFailed: 'Бележката не е запазена',
      noteConflict: 'Бележката е променена на друго устройство',
      yourNote: 'Вашата бележка',
      cloudNote: 'Бележката в облака',
      noNote: 'Няма бележка',
      useCloudNote: 'Използвай облачната',
      keepMyNote: 'Запази моята',
      conflictFailed: 'Конфликтът не е разрешен',
      takePayment: 'Плащане',
      paymentConfirmed: 'Плащането е потвърдено',
      paymentFailed: 'Плащането не бе потвърдено',
      paymentChanged: 'Сметката е променена на друго устройство. Проверете остатъка.',
      remaining: 'Остава',
      moveTable: 'Премести или обедини маса',
      tableMoved: 'Масата е преместена',
      tablesMerged: 'Масите са обединени',
      tableChanged: 'Източникът или целта са променени. Проверете текущото състояние.',
      receiptSyncing: 'Разписката е създадена и се синхронизира с архива.',
      pdfFailed: 'PDF файлът не бе подготвен',
      decrease: 'Намали',
      increase: 'Увеличи',
      editDraft: 'Редакция на черновата',
      draftEmpty: 'Черновата е празна',
      repeatLastOrder: 'Повтори последната поръчка',
      quickNotes: 'Бързи бележки',
      quantityChangeFailed: 'Количеството не е променено',
      cancel: 'Отказ',
      soldOut: 'Изчерпан',
      soldOutHint: 'Докоснете, за да го върнете в наличност',
      soldOutTitle: 'Изчерпан ли е за днес?',
      markSoldOut: 'Отбележи като изчерпан',
      restoreProductTitle: 'Да се върне ли в продажба?',
      restoreProduct: 'Върни в продажба',
      availabilityFailed: 'Наличността не беше променена',
      splitCheck: 'Раздели сметката',
      splitFailed: 'Сметката не беше разделена',
      splitDone: 'Сметката е разделена',
      voidQuantityTitle: 'Колко бройки да се откажат?',
      voidQuantityLabel: 'Бройки за отказ',
      notePresets: [
        'Спешно',
        'Без лук',
        'По-малко печено',
        'Добре изпечено',
        'Пикантно',
        'Сосът отделно',
      ],
    };
  }
  return {
    loading: 'Loading table…',
    loadFailed: 'Table data could not be read.',
    tableNotFound: 'This table was not found in the branch.',
    back: 'Go back',
    couldNotOpen: 'Could not open table',
    queued: 'changes queued',
    synced: 'Synced',
    offline: 'Offline',
    check: 'Check',
    newCheck: 'New check',
    checkName: 'Check name',
    checkExample: 'E.g. Window side',
    create: 'Create',
    close: 'Close',
    order: 'Order',
    products: 'items',
    lines: 'lines',
    noOrders: 'No orders on this check',
    tapProduct: 'Tap a product in the palette to add it to the draft immediately.',
    unknownWaiter: 'Unknown waiter',
    note: 'Note',
    cancelled: 'Cancelled',
    cancelItem: 'Cancel line',
    search: 'Search products',
    all: 'All',
    favorites: 'Favorites',
    recents: 'Recent',
    favorite: 'Favorite',
    longPress: 'Long press for modifiers and notes',
    noProducts: 'No products found',
    changeFilter: 'Change the search or category.',
    undo: 'Undo last action',
    clearDraft: 'Clear draft',
    sendOrder: 'Send order',
    sendFailed: 'Order could not be sent',
    cancelFailed: 'Line could not be cancelled',
    tryAgain: 'Try again.',
    required: 'required',
    noteExample: 'E.g. less salt, sauce on side',
    addToDraft: 'Add to draft',
    chooseReason: 'A sent order is never deleted. Choose a cancellation reason.',
    noReasons: 'No cancellation reasons',
    askManagerReasons: 'Ask a manager to configure cancellation reasons for this branch.',
    manager: 'Manager',
    localSafe: 'Cloud refresh failed. Local orders remain safe on this device.',
    incomingItems: 'added new items',
    editNote: 'Edit note',
    saveNote: 'Save note',
    noteSaveFailed: 'Note could not be saved',
    noteConflict: 'The note changed on another device',
    yourNote: 'Your note',
    cloudNote: 'Cloud note',
    noNote: 'No note',
    useCloudNote: 'Use cloud note',
    keepMyNote: 'Keep my note',
    conflictFailed: 'Conflict could not be resolved',
    takePayment: 'Take payment',
    paymentConfirmed: 'Payment confirmed',
    paymentFailed: 'Payment could not be confirmed',
    paymentChanged: 'The check changed on another device. Review the current balance.',
    remaining: 'Remaining',
    moveTable: 'Move or merge table',
    tableMoved: 'Table moved',
    tablesMerged: 'Tables merged',
    tableChanged: 'The source or target changed on another device. Review the current state.',
    receiptSyncing: 'The receipt was issued and is syncing to the archive.',
    pdfFailed: 'Receipt PDF could not be prepared',
    decrease: 'Decrease',
    increase: 'Increase',
    editDraft: 'Edit draft',
    draftEmpty: 'Draft is empty',
    repeatLastOrder: 'Repeat last order',
    quickNotes: 'Quick notes',
    quantityChangeFailed: 'Quantity could not be changed',
    cancel: 'Cancel',
    soldOut: 'Sold out',
    soldOutHint: 'Tap to put it back in stock',
    soldOutTitle: 'Sold out for today?',
    markSoldOut: 'Mark sold out',
    restoreProductTitle: 'Put it back on sale?',
    restoreProduct: 'Back on sale',
    availabilityFailed: 'Availability could not be changed',
    splitCheck: 'Split check',
    splitFailed: 'The check could not be split',
    splitDone: 'Check split',
    voidQuantityTitle: 'How many should be voided?',
    voidQuantityLabel: 'Units to void',
    notePresets: ['Rush', 'No onion', 'Rare', 'Well done', 'Spicy', 'Sauce on the side'],
  };
}
