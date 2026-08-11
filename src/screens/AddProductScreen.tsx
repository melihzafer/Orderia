import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useOrderiaData } from '../data/runtime';
import { ServiceButton, ServiceEmptyState, ServiceIconButton } from '../design-system';
import { CheckId, DeviceId, RestaurantTableId, UserId, toDomainId } from '../domain';
import {
  CenteredState,
  CheckStrip,
  DraftBar,
  ModalActions,
  NameCheckModal,
  PalettePane,
  ProductConfigurationModal,
  useTableWorkspace,
  useWorkspaceDraft,
  workspaceCopy,
  WorkspaceModal,
} from '../features/table-workspace';
import { useLocalization } from '../i18n';
import { RootStackParamList } from '../navigation/routes';
import { useProductPhotoStore } from '../stores';
import { useSettingsStore } from '../stores/settingsStore';

/**
 * Mobilde masa akışının ikinci adımı: ürün ekleme. TableDetailScreen'in
 * adisyon görünümündeki "Ürün ekle" butonundan açılır. Taslak ve snapshot
 * aynı `useWorkspaceDraft` / `useTableWorkspace` hook'larıyla yönetilir,
 * dolayısıyla geri dönüldüğünde taslak korunur.
 */

type AddProductRoute = RouteProp<RootStackParamList, 'AddProduct'>;
type Navigation = NativeStackNavigationProp<RootStackParamList>;
type NoticeTone = 'error' | 'success';

interface AddProductNotice {
  readonly title: string;
  readonly body?: string;
  readonly tone: NoticeTone;
}

export default function AddProductScreen() {
  const data = useOrderiaData();
  const auth = useAuth();
  const navigation = useNavigation<Navigation>();
  const ready =
    data.mode === 'cloud' &&
    Boolean(data.database) &&
    Boolean(data.scope) &&
    Boolean(auth.session) &&
    Boolean(auth.currentDeviceId);

  useEffect(() => {
    if (!ready) navigation.goBack();
  }, [navigation, ready]);

  if (!ready || !data.scope || !auth.session || !auth.currentDeviceId) {
    return null;
  }

  return (
    <CloudAddProduct
      actorUserId={toDomainId<UserId>(auth.session.user.id)}
      deviceId={toDomainId<DeviceId>(auth.currentDeviceId)}
      preferencesKey={`${data.scope.organizationId}.${data.scope.branchId}.${auth.session.user.id}`}
    />
  );
}

function CloudAddProduct({
  actorUserId,
  deviceId,
  preferencesKey,
}: {
  readonly actorUserId: UserId;
  readonly deviceId: DeviceId;
  readonly preferencesKey: string;
}) {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<AddProductRoute>();
  const { language } = useLocalization();
  const copy = workspaceCopy(language);
  const { tokens } = useTheme();
  const showItemPhotos = useSettingsStore((state) => state.showItemPhotos);
  const orderBatchesEnabled = useSettingsStore((state) => state.orderBatches);
  const namedOrdersEnabled = useSettingsStore((state) => state.namedOrders);
  const photoUris = useProductPhotoStore((state) => state.photoUris);
  const tableId = toDomainId<RestaurantTableId>(route.params.tableId);

  const [selectedCheckId, setSelectedCheckId] = useState<CheckId | undefined>(
    route.params.checkId ? toDomainId<CheckId>(route.params.checkId) : undefined,
  );
  const [pendingCheckName, setPendingCheckName] = useState(route.params.pendingCheckName ?? '');
  // Bkz. TableDetailScreen'deki aynı not: otomatik seçim efekti, seçimi
  // temizlemekle "yeni hesap" niyetini ayırt edemiyor.
  const [startingNewCheck, setStartingNewCheck] = useState(!route.params.checkId);
  const [checkNameInput, setCheckNameInput] = useState('');
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [notice, setNotice] = useState<AddProductNotice>();

  const { snapshot, loading, loadError } = useTableWorkspace({ tableId, actorUserId, copy });

  const notify = (title: string, body?: string, tone: NoticeTone = 'error') => {
    setNotice({ title, ...(body ? { body } : {}), tone });
  };

  useEffect(() => {
    if (notice?.tone !== 'success') return;
    const timer = setTimeout(() => setNotice(undefined), 5_000);
    return () => clearTimeout(timer);
  }, [notice]);

  const selectedCheck = snapshot?.checks.find((check) => check.id === selectedCheckId);

  useEffect(() => {
    if (!snapshot || startingNewCheck) return;
    if (selectedCheckId && snapshot.checks.some((check) => check.id === selectedCheckId)) return;
    setSelectedCheckId(snapshot.checks[0]?.id);
  }, [selectedCheckId, snapshot, startingNewCheck]);

  const {
    addProduct,
    appendDraft,
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
    totalMinor,
    undo,
    undoAvailable,
    applyAvailability,
    availabilityTarget,
    setAvailabilityTarget,
    clearDraft,
    setQuery,
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
      navigation.navigate('TableDetail', {
        tableId: route.params.tableId,
        selectCheckId: result.check.id,
      });
    },
  });

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

  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left', 'right']}
      style={{ flex: 1, backgroundColor: tokens.colors.bg }}
    >
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          minHeight: 64,
          paddingHorizontal: tokens.space.md,
        }}
      >
        <ServiceIconButton icon="arrow-back" label={copy.back} onPress={navigation.goBack} />
        <Text
          numberOfLines={1}
          style={[
            tokens.typography.subtitle,
            { color: tokens.colors.text, flex: 1, marginHorizontal: tokens.space.sm },
          ]}
        >
          {copy.addProductTo(snapshot.table.label)}
        </Text>
      </View>

      {notice ? (
        <View
          accessibilityLiveRegion="assertive"
          accessibilityRole="alert"
          style={{
            backgroundColor:
              notice.tone === 'success'
                ? tokens.colors.state.delivered.bg
                : tokens.colors.state.pending.bg,
            borderRadius: tokens.radius.medium,
            marginBottom: tokens.space.xs,
            marginHorizontal: tokens.space.md,
            padding: tokens.space.sm,
          }}
        >
          <Text style={[tokens.typography.bodyStrong, { color: tokens.colors.text }]}>
            {notice.title}
          </Text>
          {notice.body ? (
            <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
              {notice.body}
            </Text>
          ) : null}
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

      <View style={{ flex: 1, paddingHorizontal: tokens.space.md }}>
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
        onChangeQuantity={changeDraftQuantity}
        onClear={clearDraft}
        onRemove={removeDraftLine}
        onRepeat={repeatLastBatch}
        onSend={() => void submit()}
        onUndo={undo}
        repeatAvailable={repeatAvailable}
        submitting={submitting}
        totalMinor={totalMinor}
        undoAvailable={undoAvailable}
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
    </SafeAreaView>
  );
}
