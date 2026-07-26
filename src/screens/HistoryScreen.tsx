import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { accessibleBranches } from '../contexts/authTypes';
import { useTheme } from '../contexts/ThemeContext';
import { useOrderiaData } from '../data/runtime';
import {
  ServiceButton,
  ServiceEmptyState,
  ServiceSkeleton,
  ServiceStatusPill,
  ServiceSurface,
  ServiceTextField,
  useAdaptiveLayout,
} from '../design-system';
import {
  ReceiptArchiveCard,
  ReceiptArchiveCursor,
  ReceiptArchiveEntry,
  ReceiptArchiveFilterDraft,
  ReceiptArchiveFilterSheet,
  ReceiptArchiveFilters,
  ReceiptDetailSheet,
  activeReceiptFilterCount,
  buildReceiptArchiveFilters,
  defaultReceiptArchiveFilters,
  withDateRange,
} from '../features/receipt-archive';
import { presentReceiptPdf } from '../features/receipts';
import { useLocalization } from '../i18n';

const archivePageSize = 30;

export default function HistoryScreen() {
  const auth = useAuth();
  const { tokens } = useTheme();
  const { language } = useLocalization();
  const layout = useAdaptiveLayout();
  const { mode, prepareReceiptPdf, searchReceiptArchive, sync } = useOrderiaData();
  const copy = archiveCopy(language);
  const timezone = auth.activeBranch?.timezone ?? 'UTC';
  const currency = auth.activeBranch?.currency_code ?? 'EUR';
  const [draft, setDraft] = useState<ReceiptArchiveFilterDraft>(() =>
    defaultReceiptArchiveFilters(timezone),
  );
  const [filters, setFilters] = useState<ReceiptArchiveFilters>(() =>
    buildReceiptArchiveFilters(defaultReceiptArchiveFilters(timezone), currency),
  );
  const [entries, setEntries] = useState<readonly ReceiptArchiveEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<ReceiptArchiveCursor>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [showFilters, setShowFilters] = useState(false);
  const [detailEntry, setDetailEntry] = useState<ReceiptArchiveEntry>();
  const [busyReceiptId, setBusyReceiptId] = useState<string>();
  const requestRevision = useRef(0);
  const activeFilterCount = activeReceiptFilterCount(draft);
  const cloudReady = mode === 'cloud';

  const branches = useMemo(
    () =>
      auth.workspace
        ? accessibleBranches(auth.workspace).filter(
            (branch) => branch.organization_id === auth.activeBranch?.organization_id,
          )
        : [],
    [auth.activeBranch?.organization_id, auth.workspace],
  );

  const load = useCallback(
    async (cursor?: ReceiptArchiveCursor, append = false) => {
      const revision = requestRevision.current + 1;
      requestRevision.current = revision;
      if (!cloudReady || !sync.online) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        setErrorMessage(copy.onlineRequired);
        return;
      }
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      try {
        const page = await searchReceiptArchive(filters, cursor, archivePageSize);
        if (requestRevision.current !== revision) return;
        setEntries((current) => (append ? [...current, ...page.items] : page.items));
        setNextCursor(page.nextCursor);
        setErrorMessage(undefined);
      } catch (error) {
        if (requestRevision.current !== revision) return;
        setErrorMessage(error instanceof Error ? error.message : copy.loadFailed);
      } finally {
        if (requestRevision.current === revision) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [cloudReady, copy.loadFailed, copy.onlineRequired, filters, searchReceiptArchive, sync.online],
  );

  useEffect(() => {
    void load();
    return () => {
      requestRevision.current += 1;
    };
  }, [auth.activeBranch?.id, load]);

  const applyDraft = () => {
    try {
      setFilters(buildReceiptArchiveFilters(draft, currency));
      setShowFilters(false);
    } catch (error) {
      Alert.alert(copy.invalidFilters, error instanceof Error ? error.message : copy.tryAgain);
    }
  };

  const applyDatePreset = (days: number) => {
    const next = withDateRange(draft, timezone, days);
    setDraft(next);
    setFilters(buildReceiptArchiveFilters(next, currency));
  };

  const resetFilters = () => {
    const next = defaultReceiptArchiveFilters(timezone);
    setDraft(next);
    setFilters(buildReceiptArchiveFilters(next, currency));
  };

  const presentPdf = async (entry: ReceiptArchiveEntry, mode: 'download' | 'share') => {
    setBusyReceiptId(entry.receipt.id);
    try {
      const prepared = await prepareReceiptPdf(entry.receipt);
      await presentReceiptPdf(prepared.signedUrl, entry.receipt.receiptNumber, mode);
    } catch (error) {
      Alert.alert(copy.pdfFailed, error instanceof Error ? error.message : copy.tryAgain);
    } finally {
      setBusyReceiptId(undefined);
    }
  };

  const switchBranch = async (branchId: string) => {
    if (branchId === auth.activeBranch?.id) return;
    try {
      await auth.switchBranch(branchId);
    } catch (error) {
      Alert.alert(copy.branchFailed, error instanceof Error ? error.message : copy.tryAgain);
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ backgroundColor: tokens.colors.bg, flex: 1 }}
    >
      <FlatList
        contentContainerStyle={{
          alignSelf: 'center',
          maxWidth: tokens.sizing.contentMaximumWidth,
          paddingBottom: tokens.space.xxl,
          paddingHorizontal: layout.horizontalPadding,
          width: '100%',
        }}
        data={entries}
        keyExtractor={(entry) => entry.receipt.id}
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: tokens.space.sm }}>
              {[0, 1, 2].map((value) => (
                <ServiceSkeleton key={value} height={180} label={copy.loading} />
              ))}
            </View>
          ) : (
            <ServiceEmptyState
              action={{ label: copy.resetFilters, onPress: resetFilters }}
              body={errorMessage ?? copy.emptyBody}
              icon={errorMessage ? 'cloud-offline-outline' : 'receipt-outline'}
              title={errorMessage ? copy.unavailable : copy.emptyTitle}
            />
          )
        }
        ListFooterComponent={
          nextCursor ? (
            <ServiceButton
              icon="chevron-down-outline"
              label={copy.loadMore}
              loading={loadingMore}
              onPress={() => void load(nextCursor, true)}
              style={{ marginTop: tokens.space.sm }}
              variant="outline"
            />
          ) : entries.length > 0 ? (
            <Text
              style={[
                tokens.typography.caption,
                {
                  color: tokens.colors.textMuted,
                  paddingVertical: tokens.space.lg,
                  textAlign: 'center',
                },
              ]}
            >
              {copy.end}
            </Text>
          ) : null
        }
        ListHeaderComponent={
          <View style={{ gap: tokens.space.md, paddingVertical: tokens.space.lg }}>
            <View
              style={{
                alignItems: 'flex-start',
                flexDirection: layout.mode === 'compact' ? 'column' : 'row',
                gap: tokens.space.sm,
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[tokens.typography.title, { color: tokens.colors.text }]}>
                  {copy.title}
                </Text>
                <Text
                  style={[
                    tokens.typography.body,
                    { color: tokens.colors.textSubtle, marginTop: tokens.space.xs },
                  ]}
                >
                  {copy.subtitle}
                </Text>
              </View>
              <ServiceStatusPill
                icon={sync.online ? 'cloud-done-outline' : 'cloud-offline-outline'}
                label={sync.online ? copy.cloudArchive : copy.offline}
                tone={sync.online ? 'success' : 'warning'}
              />
            </View>

            {errorMessage && entries.length > 0 ? (
              <ServiceSurface accessibilityRole="alert" variant="outlined">
                <Text style={[tokens.typography.body, { color: tokens.colors.error }]}>
                  {errorMessage}
                </Text>
              </ServiceSurface>
            ) : null}

            {branches.length > 1 ? (
              <View accessibilityRole="radiogroup">
                <Text
                  style={[
                    tokens.typography.label,
                    { color: tokens.colors.text, marginBottom: tokens.space.xs },
                  ]}
                >
                  {copy.branch}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs }}>
                  {branches.map((branch) => (
                    <FilterChip
                      key={branch.id}
                      active={branch.id === auth.activeBranch?.id}
                      label={branch.name}
                      onPress={() => void switchBranch(branch.id)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <ServiceTextField
              autoCapitalize="none"
              label={copy.search}
              onChangeText={(query) => setDraft((current) => ({ ...current, query }))}
              onSubmitEditing={applyDraft}
              placeholder={copy.searchPlaceholder}
              returnKeyType="search"
              value={draft.query}
            />

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs }}>
              <FilterChip label={copy.today} onPress={() => applyDatePreset(1)} />
              <FilterChip label={copy.sevenDays} onPress={() => applyDatePreset(7)} />
              <FilterChip label={copy.thirtyDays} onPress={() => applyDatePreset(30)} />
              <ServiceButton
                icon="options-outline"
                label={`${copy.filters} (${activeFilterCount})`}
                onPress={() => setShowFilters(true)}
                variant="outline"
              />
              <ServiceButton icon="search-outline" label={copy.searchAction} onPress={applyDraft} />
            </View>

            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
            >
              <Text style={[tokens.typography.label, { color: tokens.colors.textSubtle }]}>
                {loading ? copy.loading : `${entries.length} ${copy.results}`}
              </Text>
              <Text style={[tokens.typography.caption, { color: tokens.colors.textMuted }]}>
                {auth.activeBranch?.name}
              </Text>
            </View>
          </View>
        }
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            refreshing={refreshing}
            tintColor={tokens.colors.primary}
          />
        }
        renderItem={({ item }) => (
          <ReceiptArchiveCard
            busy={busyReceiptId === item.receipt.id}
            entry={item}
            language={language}
            onDetail={() => setDetailEntry(item)}
            onDownload={() => void presentPdf(item, 'download')}
            onShare={() => void presentPdf(item, 'share')}
          />
        )}
      />

      <ReceiptArchiveFilterSheet
        draft={draft}
        language={language}
        onApply={applyDraft}
        onChange={setDraft}
        onClose={() => setShowFilters(false)}
        onReset={resetFilters}
        visible={showFilters}
      />
      {detailEntry ? (
        <ReceiptDetailSheet
          entry={detailEntry}
          language={language}
          onClose={() => setDetailEntry(undefined)}
        />
      ) : null}
    </SafeAreaView>
  );
}

function FilterChip({
  active = false,
  label,
  onPress,
}: {
  readonly active?: boolean;
  readonly label: string;
  readonly onPress: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole={active ? 'radio' : 'button'}
      accessibilityState={active ? { checked: true } : undefined}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: active ? tokens.colors.surfaceAlt : tokens.colors.surface,
        borderColor: active ? tokens.colors.primary : tokens.colors.border,
        borderRadius: tokens.radius.full,
        borderWidth: active ? 2 : 1,
        justifyContent: 'center',
        minHeight: tokens.sizing.minimumTarget,
        opacity: pressed ? 0.78 : 1,
        paddingHorizontal: tokens.space.md,
      })}
    >
      <Text
        style={[
          tokens.typography.label,
          { color: active ? tokens.colors.primary : tokens.colors.textSubtle },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function archiveCopy(language: 'tr' | 'bg' | 'en') {
  if (language === 'tr') {
    return {
      title: 'Fiş arşivi',
      subtitle: 'Tarih, saat, masa, hesap, garson veya tutarla geçmiş fişi saniyeler içinde bul.',
      cloudArchive: 'Bulut arşivi',
      offline: 'Çevrimdışı',
      onlineRequired: 'Tüm arşivde arama yapmak için internet bağlantısı gerekli.',
      loadFailed: 'Fiş arşivi yüklenemedi.',
      loading: 'Fişler yükleniyor',
      unavailable: 'Arşiv şu anda kullanılamıyor',
      emptyTitle: 'Bu filtrelerle fiş bulunamadı',
      emptyBody: 'Tarih aralığını genişlet veya filtreleri sıfırla.',
      resetFilters: 'Filtreleri sıfırla',
      branch: 'Şube',
      search: 'Hızlı arama',
      searchPlaceholder: 'Masa 4, Pencere, WB1-...',
      today: 'Bugün',
      sevenDays: '7 gün',
      thirtyDays: '30 gün',
      filters: 'Filtreler',
      searchAction: 'Ara',
      results: 'sonuç gösteriliyor',
      loadMore: 'Daha fazla göster',
      end: 'Arşivin bu bölümünün sonu',
      invalidFilters: 'Filtreleri kontrol et',
      tryAgain: 'Tekrar deneyin.',
      pdfFailed: 'Fiş PDF’i açılamadı',
      branchFailed: 'Şube değiştirilemedi',
    };
  }
  if (language === 'bg') {
    return {
      title: 'Архив на разписките',
      subtitle: 'Намерете разписка по дата, час, маса, сметка, сервитьор или сума.',
      cloudArchive: 'Облачен архив',
      offline: 'Офлайн',
      onlineRequired: 'За търсене в целия архив е необходим интернет.',
      loadFailed: 'Архивът не можа да се зареди.',
      loading: 'Зареждане на разписки',
      unavailable: 'Архивът не е достъпен',
      emptyTitle: 'Няма разписки с тези филтри',
      emptyBody: 'Разширете периода или изчистете филтрите.',
      resetFilters: 'Изчисти филтрите',
      branch: 'Обект',
      search: 'Бързо търсене',
      searchPlaceholder: 'Маса 4, Прозорец, WB1-...',
      today: 'Днес',
      sevenDays: '7 дни',
      thirtyDays: '30 дни',
      filters: 'Филтри',
      searchAction: 'Търси',
      results: 'резултата',
      loadMore: 'Покажи още',
      end: 'Край на тази част от архива',
      invalidFilters: 'Проверете филтрите',
      tryAgain: 'Опитайте отново.',
      pdfFailed: 'PDF файлът не можа да се отвори',
      branchFailed: 'Обектът не можа да се смени',
    };
  }
  return {
    title: 'Receipt archive',
    subtitle: 'Find a receipt by date, time, table, check, waiter, or amount in seconds.',
    cloudArchive: 'Cloud archive',
    offline: 'Offline',
    onlineRequired: 'An internet connection is required to search the complete archive.',
    loadFailed: 'The receipt archive could not be loaded.',
    loading: 'Loading receipts',
    unavailable: 'Archive unavailable',
    emptyTitle: 'No receipts match these filters',
    emptyBody: 'Widen the date range or reset the filters.',
    resetFilters: 'Reset filters',
    branch: 'Branch',
    search: 'Quick search',
    searchPlaceholder: 'Table 4, Window, WB1-...',
    today: 'Today',
    sevenDays: '7 days',
    thirtyDays: '30 days',
    filters: 'Filters',
    searchAction: 'Search',
    results: 'results shown',
    loadMore: 'Show more',
    end: 'End of this archive section',
    invalidFilters: 'Check the filters',
    tryAgain: 'Try again.',
    pdfFailed: 'Receipt PDF could not be opened',
    branchFailed: 'Branch could not be changed',
  };
}
