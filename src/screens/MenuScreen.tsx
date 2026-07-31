import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
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
import { CurrencyCode, MenuCategoryId, MenuItemId, toDomainId } from '../domain';
import { CatalogItem, CatalogSnapshot } from '../features/menu-management';
import { useLocalization } from '../i18n';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useMenuStore } from '../stores';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function MenuScreen() {
  const navigation = useNavigation<Navigation>();
  const auth = useAuth();
  const { tokens } = useTheme();
  const { language } = useLocalization();
  const layout = useAdaptiveLayout();
  const { loadCatalog, mode, revision, setCatalogAvailability, sync } = useOrderiaData();
  const legacy = useMenuStore();
  const copy = menuCopy(language);
  const [catalog, setCatalog] = useState<CatalogSnapshot>();
  const [selectedCategoryId, setSelectedCategoryId] = useState<MenuCategoryId>();
  const [selectedItemIds, setSelectedItemIds] = useState<readonly MenuItemId[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(mode === 'cloud');
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const isManager = auth.activeMembership?.role === 'manager' || auth.status === 'unconfigured';

  const localCatalog = useMemo(
    () =>
      legacySnapshot(
        legacy.categories,
        legacy.menuItems,
        auth.activeBranch?.organization_id,
        auth.activeBranch?.id,
        (auth.activeBranch?.currency_code ?? 'EUR') as CurrencyCode,
      ),
    [
      auth.activeBranch?.currency_code,
      auth.activeBranch?.id,
      auth.activeBranch?.organization_id,
      legacy.categories,
      legacy.menuItems,
    ],
  );
  const displayedCatalog = catalog ?? localCatalog;

  const refreshCatalog = useCallback(async () => {
    if (mode !== 'cloud') {
      setCatalog(undefined);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const next = await loadCatalog();
      setCatalog(next);
      setError(undefined);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : copy.loadFailed);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [copy.loadFailed, loadCatalog, mode]);

  useFocusEffect(
    useCallback(() => {
      void refreshCatalog();
    }, [refreshCatalog]),
  );
  useEffect(() => {
    if (revision > 0) void refreshCatalog();
  }, [refreshCatalog, revision]);

  const duplicateIds = useMemo(
    () => findDuplicateIds(displayedCatalog.items),
    [displayedCatalog.items],
  );
  const visibleItems = useMemo(() => {
    const normalizedQuery = normalize(query);
    return displayedCatalog.items.filter(
      (item) =>
        (!selectedCategoryId || item.categoryId === selectedCategoryId) &&
        (!normalizedQuery ||
          normalize(item.name).includes(normalizedQuery) ||
          normalize(item.description ?? '').includes(normalizedQuery)),
    );
  }, [displayedCatalog.items, query, selectedCategoryId]);

  const toggleSelection = (itemId: MenuItemId) => {
    if (!isManager || mode !== 'cloud') return;
    setSelectedItemIds((current) =>
      current.includes(itemId)
        ? current.filter((selectedId) => selectedId !== itemId)
        : [...current, itemId],
    );
  };

  const applyAvailability = async (isAvailable: boolean) => {
    if (!selectedItemIds.length) return;
    setSaving(true);
    try {
      await setCatalogAvailability(selectedItemIds, isAvailable);
      setSelectedItemIds([]);
      await refreshCatalog();
    } catch (saveError) {
      Alert.alert(
        copy.updateFailed,
        saveError instanceof Error ? saveError.message : copy.tryAgain,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ backgroundColor: tokens.colors.bg, flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{
          alignSelf: 'center',
          gap: tokens.space.lg,
          maxWidth: tokens.sizing.contentMaximumWidth,
          paddingBottom: tokens.space.xxl,
          paddingHorizontal: layout.horizontalPadding,
          paddingTop: tokens.space.lg,
          width: '100%',
        }}
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              setRefreshing(true);
              void refreshCatalog();
            }}
            refreshing={refreshing}
            tintColor={tokens.colors.primary}
          />
        }
      >
        <View
          style={{
            alignItems: layout.mode === 'compact' ? 'stretch' : 'center',
            flexDirection: layout.mode === 'compact' ? 'column' : 'row',
            gap: tokens.space.md,
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
              {isManager ? copy.managerSubtitle : copy.waiterSubtitle}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs }}>
            <ServiceStatusPill
              icon={sync.online ? 'cloud-done-outline' : 'cloud-offline-outline'}
              label={mode === 'cloud' ? copy.cloudCatalog : copy.deviceCatalog}
              tone={mode === 'cloud' && sync.online ? 'success' : 'neutral'}
            />
            {isManager ? (
              <ServiceButton
                disabled={mode !== 'cloud' || !sync.online}
                icon="sparkles"
                label={copy.aiAssistant}
                onPress={() => navigation.navigate('MenuAssistant')}
                variant="accent"
              />
            ) : null}
          </View>
        </View>

        <ServiceTextField
          label={copy.search}
          onChangeText={setQuery}
          placeholder={copy.searchPlaceholder}
          value={query}
        />

        <ScrollView
          horizontal
          accessibilityLabel={copy.all}
          accessibilityRole="tablist"
          contentContainerStyle={{ gap: tokens.space.xs }}
          showsHorizontalScrollIndicator={false}
        >
          <CategoryChip
            active={!selectedCategoryId}
            label={`${copy.all} · ${displayedCatalog.items.length}`}
            onPress={() => setSelectedCategoryId(undefined)}
          />
          {displayedCatalog.categories.map((category) => (
            <CategoryChip
              key={category.id}
              active={selectedCategoryId === category.id}
              label={`${category.name} · ${
                displayedCatalog.items.filter((item) => item.categoryId === category.id).length
              }`}
              onPress={() => setSelectedCategoryId(category.id)}
            />
          ))}
        </ScrollView>

        {selectedItemIds.length > 0 ? (
          <ServiceSurface
            style={{
              alignItems: layout.mode === 'compact' ? 'stretch' : 'center',
              flexDirection: layout.mode === 'compact' ? 'column' : 'row',
              gap: tokens.space.sm,
            }}
            variant="raised"
          >
            <Text style={[tokens.typography.bodyStrong, { color: tokens.colors.text, flex: 1 }]}>
              {selectedItemIds.length} {copy.selected}
            </Text>
            <ServiceButton
              disabled={saving}
              icon="eye-outline"
              label={copy.makeAvailable}
              onPress={() => void applyAvailability(true)}
              variant="outline"
            />
            <ServiceButton
              disabled={saving}
              icon="eye-off-outline"
              label={copy.markSoldOut}
              onPress={() => void applyAvailability(false)}
              variant="danger"
            />
          </ServiceSurface>
        ) : null}

        {error ? (
          <ServiceSurface
            style={{ borderColor: tokens.colors.warning, gap: tokens.space.xs }}
            variant="outlined"
          >
            <Text style={[tokens.typography.bodyStrong, { color: tokens.colors.warning }]}>
              {copy.cachedCatalog}
            </Text>
            <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
              {error}
            </Text>
          </ServiceSurface>
        ) : null}

        {loading && !catalog ? (
          <View style={{ gap: tokens.space.sm }}>
            {[0, 1, 2].map((index) => (
              <ServiceSkeleton key={index} height={112} />
            ))}
          </View>
        ) : visibleItems.length === 0 ? (
          <ServiceEmptyState
            action={
              isManager
                ? {
                    label: copy.addManually,
                    onPress: () => navigation.navigate('AddMenuItem', {}),
                  }
                : undefined
            }
            body={query ? copy.noSearchResult : copy.emptyBody}
            icon="restaurant-outline"
            title={query ? copy.noResult : copy.emptyTitle}
          />
        ) : (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: tokens.space.sm,
            }}
          >
            {visibleItems.map((item) => (
              <CatalogItemCard
                key={item.id}
                duplicate={duplicateIds.has(item.id)}
                editable={isManager && !item.isOrganizationWide}
                item={item}
                managerSelectable={isManager && mode === 'cloud' && !item.isOrganizationWide}
                onLongPress={() =>
                  navigation.navigate('AddMenuItem', {
                    categoryId: item.categoryId,
                    itemId: item.id,
                  })
                }
                onPress={() => toggleSelection(item.id)}
                selected={selectedItemIds.includes(item.id)}
                width={
                  layout.mode === 'expanded' ? '32%' : layout.mode === 'medium' ? '48%' : '100%'
                }
              />
            ))}
          </View>
        )}

        {isManager ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm }}>
            <ServiceButton
              icon="add-outline"
              label={copy.addManually}
              onPress={() => navigation.navigate('AddMenuItem', {})}
              size="large"
              variant="outline"
            />
            <Text
              style={[
                tokens.typography.caption,
                { color: tokens.colors.textSubtle, flexBasis: 260, flexGrow: 1 },
              ]}
            >
              {copy.aiBoundary}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function CatalogItemCard({
  duplicate,
  editable,
  item,
  managerSelectable,
  onLongPress,
  onPress,
  selected,
  width,
}: {
  readonly duplicate: boolean;
  readonly editable: boolean;
  readonly item: CatalogItem;
  readonly managerSelectable: boolean;
  readonly onLongPress: () => void;
  readonly onPress: () => void;
  readonly selected: boolean;
  readonly width: `${number}%`;
}) {
  const { tokens } = useTheme();
  const { language } = useLocalization();
  const copy = menuCopy(language);
  return (
    <Pressable
      accessibilityRole={managerSelectable ? 'checkbox' : editable ? 'button' : 'text'}
      accessibilityState={managerSelectable ? { checked: selected } : undefined}
      disabled={!managerSelectable && !editable}
      onLongPress={editable ? onLongPress : undefined}
      onPress={managerSelectable ? onPress : undefined}
      style={{ flexBasis: width, flexGrow: 1, minWidth: 280 }}
    >
      <ServiceSurface
        style={{
          borderColor: selected ? tokens.colors.primary : tokens.colors.border,
          borderWidth: selected ? 2 : 1,
          gap: tokens.space.sm,
          minHeight: tokens.sizing.tableCardMinimumHeight,
        }}
        variant="outlined"
      >
        <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: tokens.space.sm }}>
          <View style={{ flex: 1 }}>
            <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
              {item.name}
            </Text>
            {item.description ? (
              <Text
                numberOfLines={2}
                style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}
              >
                {item.description}
              </Text>
            ) : null}
          </View>
          <Text style={[tokens.typography.bodyStrong, { color: tokens.colors.text }]}>
            {(item.priceMinor / 100).toFixed(2)} {item.currencyCode}
          </Text>
          {managerSelectable ? (
            <Ionicons
              name={selected ? 'checkbox' : 'square-outline'}
              size={24}
              color={selected ? tokens.colors.primary : tokens.colors.textMuted}
            />
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs }}>
          <ServiceStatusPill
            label={item.isAvailable ? copy.available : copy.soldOut}
            tone={item.isAvailable ? 'success' : 'error'}
          />
          {item.modifierGroups.length > 0 ? (
            <ServiceStatusPill
              label={`${item.modifierGroups.length} ${copy.optionGroup}`}
              tone="info"
            />
          ) : null}
          {item.isOrganizationWide ? (
            <ServiceStatusPill label={copy.sharedItem} tone="neutral" />
          ) : null}
          {duplicate ? <ServiceStatusPill label={copy.possibleDuplicate} tone="warning" /> : null}
        </View>
      </ServiceSurface>
    </Pressable>
  );
}

function CategoryChip({
  active,
  label,
  onPress,
}: {
  readonly active: boolean;
  readonly label: string;
  readonly onPress: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{
        backgroundColor: active ? tokens.colors.primary : tokens.colors.surface,
        borderColor: active ? tokens.colors.primary : tokens.colors.border,
        borderRadius: tokens.radius.full,
        borderWidth: 1,
        justifyContent: 'center',
        minHeight: tokens.sizing.minimumTarget,
        paddingHorizontal: tokens.space.md,
      }}
    >
      <Text
        style={[
          tokens.typography.label,
          { color: active ? tokens.colors.primaryContrast : tokens.colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function legacySnapshot(
  categories: readonly { id: string; name: string; order: number }[],
  items: readonly {
    id: string;
    categoryId: string;
    name: string;
    description?: string;
    price: number;
    isActive: boolean;
  }[],
  organizationId?: string,
  branchId?: string,
  currencyCode: CurrencyCode = 'EUR' as CurrencyCode,
): CatalogSnapshot {
  return {
    organizationId: toDomainId(organizationId ?? 'local-organization'),
    branchId: toDomainId(branchId ?? 'local-branch'),
    categories: categories.map((category) => ({
      id: toDomainId<MenuCategoryId>(category.id),
      name: category.name,
      sortOrder: category.order,
      isActive: true,
    })),
    items: items.map((item) => ({
      id: toDomainId<MenuItemId>(item.id),
      categoryId: toDomainId<MenuCategoryId>(item.categoryId),
      name: item.name,
      ...(item.description ? { description: item.description } : {}),
      priceMinor: item.price,
      currencyCode,
      taxRateBasisPoints: 0,
      isActive: item.isActive,
      isAvailable: item.isActive,
      isOrganizationWide: false,
      version: 1,
      translations: [],
      modifierGroups: [],
    })),
  };
}

function findDuplicateIds(items: readonly CatalogItem[]): ReadonlySet<MenuItemId> {
  const groups = new Map<string, MenuItemId[]>();
  for (const item of items) {
    const key = `${item.categoryId}:${normalize(item.name)}`;
    groups.set(key, [...(groups.get(key) ?? []), item.id]);
  }
  return new Set(
    [...groups.values()].filter((group) => group.length > 1).flatMap((group) => group),
  );
}

function normalize(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function menuCopy(language: 'tr' | 'bg' | 'en') {
  if (language === 'tr') {
    return {
      title: 'Menü merkezi',
      managerSubtitle: 'Ürünleri, seçenekleri ve şube müsaitliğini tek yerden yönet.',
      waiterSubtitle: 'Serviste kullanılabilen ürünleri ve seçenekleri gör.',
      cloudCatalog: 'Bulut menü',
      deviceCatalog: 'Cihaz menüsü',
      aiAssistant: 'AI ile ürün ekle',
      search: 'Menüde ara',
      searchPlaceholder: 'Ürün veya açıklama…',
      all: 'Tümü',
      selected: 'ürün seçili',
      makeAvailable: 'Satışa aç',
      markSoldOut: 'Tükendi yap',
      cachedCatalog: 'Son menü gösteriliyor',
      loadFailed: 'Bulut menü yüklenemedi.',
      updateFailed: 'Menü güncellenemedi',
      tryAgain: 'Tekrar deneyin.',
      addManually: 'Elle ürün ekle',
      noSearchResult: 'Aramana uyan ürün bulunamadı.',
      emptyBody: 'İlk ürünü elle veya AI taslağıyla ekleyebilirsin.',
      noResult: 'Sonuç yok',
      emptyTitle: 'Menü henüz boş',
      available: 'Satışta',
      soldOut: 'Tükendi',
      optionGroup: 'seçenek grubu',
      possibleDuplicate: 'Olası tekrar',
      sharedItem: 'Tüm şubeler',
      aiBoundary:
        'AI yalnız taslak hazırlar. Yönetici kontrol edip onaylamadan hiçbir ürün yayınlanmaz.',
    } as const;
  }
  if (language === 'bg') {
    return {
      title: 'Меню център',
      managerSubtitle: 'Управлявайте артикули, опции и наличност на обекта.',
      waiterSubtitle: 'Вижте наличните артикули и опции за обслужване.',
      cloudCatalog: 'Облачно меню',
      deviceCatalog: 'Меню на устройството',
      aiAssistant: 'Добави с AI',
      search: 'Търсене в менюто',
      searchPlaceholder: 'Артикул или описание…',
      all: 'Всички',
      selected: 'избрани',
      makeAvailable: 'В продажба',
      markSoldOut: 'Изчерпано',
      cachedCatalog: 'Показва се последното меню',
      loadFailed: 'Облачното меню не се зареди.',
      updateFailed: 'Менюто не се обнови',
      tryAgain: 'Опитайте отново.',
      addManually: 'Добави ръчно',
      noSearchResult: 'Няма съвпадащи артикули.',
      emptyBody: 'Добавете първия артикул ръчно или с AI чернова.',
      noResult: 'Няма резултат',
      emptyTitle: 'Менюто е празно',
      available: 'Налично',
      soldOut: 'Изчерпано',
      optionGroup: 'групи опции',
      possibleDuplicate: 'Възможен дубликат',
      sharedItem: 'Всички обекти',
      aiBoundary: 'AI създава само чернова. Нищо не се публикува без преглед от мениджър.',
    } as const;
  }
  return {
    title: 'Menu hub',
    managerSubtitle: 'Manage items, options, and branch availability in one place.',
    waiterSubtitle: 'See the items and options available during service.',
    cloudCatalog: 'Cloud catalog',
    deviceCatalog: 'Device catalog',
    aiAssistant: 'Add with AI',
    search: 'Search menu',
    searchPlaceholder: 'Item or description…',
    all: 'All',
    selected: 'items selected',
    makeAvailable: 'Make available',
    markSoldOut: 'Mark sold out',
    cachedCatalog: 'Showing the last menu',
    loadFailed: 'The cloud catalog could not be loaded.',
    updateFailed: 'Menu update failed',
    tryAgain: 'Try again.',
    addManually: 'Add manually',
    noSearchResult: 'No items match your search.',
    emptyBody: 'Add the first item manually or with an AI draft.',
    noResult: 'No results',
    emptyTitle: 'The menu is empty',
    available: 'Available',
    soldOut: 'Sold out',
    optionGroup: 'option groups',
    possibleDuplicate: 'Possible duplicate',
    sharedItem: 'All branches',
    aiBoundary: 'AI creates a draft only. Nothing is published without manager review.',
  } as const;
}
