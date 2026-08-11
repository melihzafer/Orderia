import { useEffect, useMemo, useRef, useState } from 'react';
import { haptic } from '../../design-system';
import { useOrderiaData } from '../../data/runtime';
import { Check, DeviceId, ModifierOptionId, UserId } from '../../domain';
import { createTextMatcher } from '../../utils/searchUtils';
import { useWorkspaceDraftStore } from './draftStore';
import { DraftOrderLine, SendOrderBatchResult, sendOrderBatch } from './orderCommands';
import type { PaletteScope } from './components/WorkspaceChrome';
import type { WorkspaceCopy } from './workspaceCopy';
import { draftLineTotal } from './workspaceFormat';
import { loadWorkspacePreferences, saveWorkspacePreferences } from './workspacePreferences';
import type { TableWorkspaceSnapshot, WorkspaceProduct } from './workspaceModel';

/**
 * Taslak sipariş satırları, ürün paleti filtreleri ve gönderim akışı.
 *
 * TableDetailScreen'den ayrıldı ki AddProductScreen aynı taslağı — masaya göre
 * `draftStore`'da tutulan aynı satırları — sıfırdan yazmadan kullanabilsin.
 * Davranış TableDetailScreen'deki karşılıklarıyla birebir aynıdır.
 */
export function useWorkspaceDraft({
  tableId,
  snapshot,
  selectedCheck,
  pendingCheckName,
  preferencesKey,
  actorUserId,
  deviceId,
  copy,
  orderBatchesEnabled,
  notify,
  onSent,
}: {
  readonly tableId: string;
  readonly snapshot: TableWorkspaceSnapshot | null;
  readonly selectedCheck?: Check;
  readonly pendingCheckName: string;
  readonly preferencesKey: string;
  readonly actorUserId: UserId;
  readonly deviceId: DeviceId;
  readonly copy: WorkspaceCopy;
  readonly orderBatchesEnabled: boolean;
  readonly notify: (title: string, body?: string, tone?: 'error' | 'success') => void;
  readonly onSent: (result: SendOrderBatchResult) => void;
}) {
  const { database, refresh, scope, setCatalogAvailability } = useOrderiaData();
  const draft = useWorkspaceDraftStore((state) => state.draftsByTable[tableId] ?? []);
  const undoDepth = useWorkspaceDraftStore((state) => (state.undoByTable[tableId] ?? []).length);
  const setDraftInStore = useWorkspaceDraftStore((state) => state.setDraft);
  const pushUndo = useWorkspaceDraftStore((state) => state.pushUndo);
  const popUndo = useWorkspaceDraftStore((state) => state.popUndo);
  const clearDraftInStore = useWorkspaceDraftStore((state) => state.clearDraft);

  const [paletteScope, setPaletteScopeState] = useState<PaletteScope>('all');
  const [query, setQuery] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<readonly string[]>([]);
  const [configuring, setConfiguring] = useState<WorkspaceProduct>();
  const [configuration, setConfiguration] = useState<readonly ModifierOptionId[]>([]);
  const [configurationNote, setConfigurationNote] = useState('');
  const [availabilityTarget, setAvailabilityTarget] = useState<WorkspaceProduct>();
  const [submitting, setSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  useEffect(() => {
    void loadWorkspacePreferences(preferencesKey).then((preferences) => {
      setFavoriteIds(preferences.favoriteProductIds);
      if (preferences.selectedCategoryId) {
        setPaletteScopeState(preferences.selectedCategoryId);
      }
    });
  }, [preferencesKey]);

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

  const rememberDraft = (next: readonly DraftOrderLine[]) => {
    pushUndo(tableId, draft);
    setDraftInStore(tableId, next);
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
    haptic('activate');
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
    const previous = popUndo(tableId);
    if (previous) setDraftInStore(tableId, previous);
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
        tableId: snapshot.table.id,
        session: snapshot.session,
        ...(selectedCheck ? { check: selectedCheck } : {}),
        checkName:
          selectedCheck?.name || pendingCheckName || `${copy.check} ${snapshot.checks.length + 1}`,
        lines: draft,
      });
      clearDraftInStore(tableId);
      haptic('success');
      notify(copy.sendDone, undefined, 'success');
      onSent(result);
      void refresh();
    } catch (error) {
      notify(copy.sendFailed, error instanceof Error ? error.message : copy.tryAgain);
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  const applyAvailability = async (product: WorkspaceProduct) => {
    setAvailabilityTarget(undefined);
    try {
      await setCatalogAvailability([product.id], !product.isAvailable);
      void refresh();
    } catch (error) {
      notify(copy.availabilityFailed, error instanceof Error ? error.message : copy.tryAgain);
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
    setPaletteScopeState(next);
    void saveWorkspacePreferences(preferencesKey, {
      favoriteProductIds: favoriteIds,
      ...(next !== 'all' && next !== 'favorites' && next !== 'recent'
        ? { selectedCategoryId: next }
        : {}),
    });
  };

  const totalMinor = draft.reduce((total, line) => total + draftLineTotal(line), 0);

  return {
    draft,
    totalMinor,
    submitting,
    undoAvailable: undoDepth > 0,
    repeatAvailable:
      orderBatchesEnabled &&
      Boolean(snapshot) &&
      (snapshot?.orderItems.some((item) => item.status !== 'cancelled') ?? false),
    paletteScope,
    query,
    favoriteIds,
    filteredProducts,
    configuring,
    configuration,
    configurationNote,
    availabilityTarget,
    addProduct,
    appendDraft,
    undo,
    changeDraftQuantity,
    removeDraftLine,
    decrementDraftProduct,
    repeatLastBatch,
    submit,
    applyAvailability,
    toggleFavorite,
    selectPaletteScope,
    setQuery,
    setConfiguring,
    setConfiguration,
    setConfigurationNote,
    setAvailabilityTarget,
    clearDraft: () => setDraftInStore(tableId, []),
  };
}
