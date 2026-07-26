import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useOrderiaData } from '../data/runtime';
import {
  ServiceButton,
  ServiceStatusPill,
  ServiceSurface,
  ServiceTextField,
  useAdaptiveLayout,
} from '../design-system';
import { CurrencyCode, MenuCategoryId, MenuItemId, toDomainId } from '../domain';
import {
  CatalogSnapshot,
  EditableCatalogItem,
  MenuModifierGroupDraft,
  MenuTranslationDraft,
} from '../features/menu-management';
import { useLocalization } from '../i18n';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useMenuStore } from '../stores';

type ScreenRoute = RouteProp<RootStackParamList, 'AddMenuItem'>;
type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function AddMenuItemScreen() {
  const route = useRoute<ScreenRoute>();
  const navigation = useNavigation<Navigation>();
  const auth = useAuth();
  const { tokens } = useTheme();
  const { language } = useLocalization();
  const layout = useAdaptiveLayout();
  const { loadCatalog, mode, saveCatalogItem, sync } = useOrderiaData();
  const legacy = useMenuStore();
  const copy = editorCopy(language);
  const [catalog, setCatalog] = useState<CatalogSnapshot>();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [categoryId, setCategoryId] = useState<MenuCategoryId | undefined>(
    route.params?.categoryId ? toDomainId<MenuCategoryId>(route.params.categoryId) : undefined,
  );
  const [newCategoryName, setNewCategoryName] = useState('');
  const [translations, setTranslations] = useState<MenuTranslationDraft[]>([
    { locale: 'tr', name: '', description: null },
    { locale: 'bg', name: '', description: null },
    { locale: 'en', name: '', description: null },
  ]);
  const [modifierGroups, setModifierGroups] = useState<MenuModifierGroupDraft[]>([]);
  const [loading, setLoading] = useState(mode === 'cloud');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [initializedItemId, setInitializedItemId] = useState<string>();
  const itemId = route.params?.itemId ? toDomainId<MenuItemId>(route.params.itemId) : undefined;
  const existingCloudItem = catalog?.items.find((item) => item.id === itemId);
  const existingLegacyItem = legacy.menuItems.find((item) => item.id === itemId);
  const currencyCode = (auth.activeBranch?.currency_code ?? 'EUR') as CurrencyCode;
  const isManager = auth.activeMembership?.role === 'manager' || auth.status === 'unconfigured';

  const categories = useMemo(
    () =>
      catalog?.categories ??
      legacy.categories.map((category) => ({
        id: toDomainId<MenuCategoryId>(category.id),
        name: category.name,
        sortOrder: category.order,
        isActive: true,
      })),
    [catalog?.categories, legacy.categories],
  );

  useEffect(() => {
    if (mode !== 'cloud') {
      setLoading(false);
      return;
    }
    let active = true;
    void loadCatalog()
      .then((next) => {
        if (active) setCatalog(next);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : copy.loadFailed);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [copy.loadFailed, loadCatalog, mode]);

  useEffect(() => {
    const existing = existingCloudItem;
    if (!existing || initializedItemId === existing.id) return;
    setName(existing.name);
    setPrice((existing.priceMinor / 100).toFixed(2));
    setDescription(existing.description ?? '');
    setPrepTime(existing.prepTimeMinutes?.toString() ?? '');
    setCategoryId(existing.categoryId);
    setTranslations(
      (['tr', 'bg', 'en'] as const).map(
        (locale) =>
          existing.translations.find((translation) => translation.locale === locale) ?? {
            locale,
            name: '',
            description: null,
          },
      ),
    );
    setModifierGroups(
      existing.modifierGroups.map((group) => ({
        name: group.name,
        selectionType: group.selectionType,
        minimumChoices: group.minimumChoices,
        maximumChoices: group.maximumChoices,
        isRequired: group.isRequired,
        sortOrder: group.sortOrder,
        options: group.options.map((option) => ({
          name: option.name,
          priceDeltaMinor: option.priceDeltaMinor,
          isDefault: option.isDefault,
          sortOrder: option.sortOrder,
        })),
      })),
    );
    setInitializedItemId(existing.id);
  }, [existingCloudItem, initializedItemId]);

  useEffect(() => {
    const existing = existingLegacyItem;
    if (mode === 'cloud' || !existing || initializedItemId === existing.id) return;
    setName(existing.name);
    setPrice((existing.price / 100).toFixed(2));
    setDescription(existing.description ?? '');
    setCategoryId(toDomainId<MenuCategoryId>(existing.categoryId));
    setInitializedItemId(existing.id);
  }, [existingLegacyItem, initializedItemId, mode]);

  const save = async () => {
    const priceMinor = Math.round(Number(price.replace(',', '.')) * 100);
    if (!name.trim() || !Number.isFinite(priceMinor) || priceMinor < 0) {
      setError(copy.namePriceRequired);
      return;
    }
    if (!categoryId && !newCategoryName.trim()) {
      setError(copy.categoryRequired);
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      if (mode === 'cloud') {
        if (!sync.online) throw new Error(copy.onlineRequired);
        const payload: EditableCatalogItem = {
          ...(categoryId ? { categoryId } : { categoryName: newCategoryName.trim() }),
          name: name.trim(),
          description: description.trim() || null,
          priceMinor,
          currencyCode,
          taxRateBasisPoints: 0,
          isActive: existingCloudItem?.isActive ?? true,
          isAvailable: existingCloudItem?.isAvailable ?? true,
          prepTimeMinutes: prepTime ? Math.min(1440, Number(prepTime) || 0) : null,
          translations: translations.filter((translation) => translation.name.trim()),
          modifierGroups,
          confirmedAllergens: [],
        };
        await saveCatalogItem(
          payload,
          existingCloudItem
            ? { id: existingCloudItem.id, version: existingCloudItem.version }
            : undefined,
        );
      } else if (existingLegacyItem) {
        legacy.updateMenuItem(existingLegacyItem.id, {
          categoryId: categoryId as string,
          name: name.trim(),
          description: description.trim() || undefined,
          price: priceMinor,
        });
      } else {
        let resolvedCategoryId = categoryId as string | undefined;
        if (!resolvedCategoryId) {
          resolvedCategoryId = legacy.addCategory({ name: newCategoryName.trim() }).id;
        }
        legacy.addMenuItem({
          categoryId: resolvedCategoryId,
          name: name.trim(),
          description: description.trim() || undefined,
          price: priceMinor,
        });
      }
      Alert.alert(copy.saved, copy.savedBody, [
        { text: copy.done, onPress: () => navigation.goBack() },
      ]);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : copy.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  if (!isManager) {
    return (
      <SafeAreaView style={{ backgroundColor: tokens.colors.bg, flex: 1 }}>
        <ServiceEmptyEditor
          body={copy.managerOnly}
          close={() => navigation.goBack()}
          title={copy.unavailable}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={{ backgroundColor: tokens.colors.bg, flex: 1 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            alignSelf: 'center',
            gap: tokens.space.lg,
            maxWidth: 960,
            padding: layout.horizontalPadding,
            paddingBottom: tokens.space.xxl,
            width: '100%',
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              gap: tokens.space.sm,
            }}
          >
            <Pressable
              accessibilityLabel={copy.close}
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => navigation.goBack()}
              style={{ padding: tokens.space.xs }}
            >
              <Ionicons name="close" size={28} color={tokens.colors.text} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text
                accessibilityRole="header"
                style={[tokens.typography.title, { color: tokens.colors.text }]}
              >
                {itemId ? copy.editTitle : copy.addTitle}
              </Text>
              <Text style={[tokens.typography.body, { color: tokens.colors.textSubtle }]}>
                {copy.subtitle}
              </Text>
            </View>
            <ServiceStatusPill
              label={mode === 'cloud' ? copy.cloud : copy.deviceOnly}
              tone={mode === 'cloud' ? 'success' : 'neutral'}
            />
          </View>

          {error ? (
            <ServiceSurface
              accessibilityLiveRegion="polite"
              style={{ borderColor: tokens.colors.error }}
              variant="outlined"
            >
              <Text style={[tokens.typography.body, { color: tokens.colors.error }]}>{error}</Text>
            </ServiceSurface>
          ) : null}

          <ServiceSurface style={{ gap: tokens.space.md }} variant="raised">
            <Text style={[tokens.typography.sectionTitle, { color: tokens.colors.text }]}>
              {copy.basics}
            </Text>
            <ServiceTextField
              autoFocus={!itemId}
              editable={!loading}
              label={copy.name}
              onChangeText={setName}
              value={name}
            />
            <View
              style={{
                flexDirection: layout.mode === 'compact' ? 'column' : 'row',
                gap: tokens.space.sm,
              }}
            >
              <ServiceTextField
                containerStyle={{ flex: 1 }}
                keyboardType="decimal-pad"
                label={`${copy.price} (${currencyCode})`}
                onChangeText={setPrice}
                value={price}
              />
              <ServiceTextField
                containerStyle={{ flex: 1 }}
                keyboardType="number-pad"
                label={copy.prep}
                onChangeText={setPrepTime}
                value={prepTime}
              />
            </View>
            <ServiceTextField
              inputStyle={{ minHeight: 84, textAlignVertical: 'top' }}
              label={copy.description}
              multiline
              onChangeText={setDescription}
              value={description}
            />
          </ServiceSurface>

          <ServiceSurface style={{ gap: tokens.space.md }}>
            <Text style={[tokens.typography.sectionTitle, { color: tokens.colors.text }]}>
              {copy.category}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs }}>
              {categories.map((category) => (
                <EditorChip
                  key={category.id}
                  active={categoryId === category.id}
                  label={category.name}
                  onPress={() => {
                    setCategoryId(category.id);
                    setNewCategoryName('');
                  }}
                />
              ))}
            </View>
            <ServiceTextField
              helperText={copy.newCategoryHelp}
              label={copy.newCategory}
              onChangeText={(value) => {
                setNewCategoryName(value);
                if (value) setCategoryId(undefined);
              }}
              value={newCategoryName}
            />
          </ServiceSurface>

          <ServiceSurface style={{ gap: tokens.space.md }}>
            <Text style={[tokens.typography.sectionTitle, { color: tokens.colors.text }]}>
              {copy.translations}
            </Text>
            {translations.map((translation, index) => (
              <View key={translation.locale} style={{ gap: tokens.space.xs }}>
                <ServiceStatusPill label={translation.locale.toUpperCase()} />
                <ServiceTextField
                  label={copy.localizedName}
                  onChangeText={(value) =>
                    setTranslations((current) =>
                      current.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, name: value } : entry,
                      ),
                    )
                  }
                  value={translation.name}
                />
                <ServiceTextField
                  label={copy.localizedDescription}
                  onChangeText={(value) =>
                    setTranslations((current) =>
                      current.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, description: value || null } : entry,
                      ),
                    )
                  }
                  value={translation.description ?? ''}
                />
              </View>
            ))}
          </ServiceSurface>

          <ServiceSurface style={{ gap: tokens.space.md }}>
            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                gap: tokens.space.sm,
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[tokens.typography.sectionTitle, { color: tokens.colors.text }]}>
                  {copy.options}
                </Text>
                <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
                  {copy.optionsHelp}
                </Text>
              </View>
              <ServiceButton
                icon="add-outline"
                label={copy.addGroup}
                onPress={() =>
                  setModifierGroups((current) => [
                    ...current,
                    {
                      name: '',
                      selectionType: 'single',
                      minimumChoices: 0,
                      maximumChoices: 1,
                      isRequired: false,
                      sortOrder: current.length,
                      options: [],
                    },
                  ])
                }
                variant="outline"
              />
            </View>
            {modifierGroups.map((group, groupIndex) => (
              <ServiceSurface key={groupIndex} style={{ gap: tokens.space.sm }} variant="muted">
                <View style={{ flexDirection: 'row', gap: tokens.space.sm }}>
                  <ServiceTextField
                    containerStyle={{ flex: 1 }}
                    label={copy.groupName}
                    onChangeText={(value) =>
                      setModifierGroups((current) =>
                        current.map((entry, index) =>
                          index === groupIndex ? { ...entry, name: value } : entry,
                        ),
                      )
                    }
                    value={group.name}
                  />
                  <Pressable
                    accessibilityLabel={copy.removeGroup}
                    accessibilityRole="button"
                    onPress={() =>
                      setModifierGroups((current) =>
                        current.filter((_, index) => index !== groupIndex),
                      )
                    }
                    style={{ alignSelf: 'flex-end', padding: tokens.space.sm }}
                  >
                    <Ionicons name="trash-outline" size={22} color={tokens.colors.error} />
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs }}>
                  <EditorChip
                    active={group.selectionType === 'single'}
                    label={copy.single}
                    onPress={() =>
                      updateGroup(setModifierGroups, groupIndex, {
                        selectionType: 'single',
                        maximumChoices: 1,
                      })
                    }
                  />
                  <EditorChip
                    active={group.selectionType === 'multiple'}
                    label={copy.multiple}
                    onPress={() =>
                      updateGroup(setModifierGroups, groupIndex, {
                        selectionType: 'multiple',
                        maximumChoices: null,
                      })
                    }
                  />
                  <EditorChip
                    active={group.isRequired}
                    label={copy.required}
                    onPress={() =>
                      updateGroup(setModifierGroups, groupIndex, {
                        isRequired: !group.isRequired,
                        minimumChoices: group.isRequired ? 0 : 1,
                      })
                    }
                  />
                </View>
                {group.options.map((option, optionIndex) => (
                  <View key={optionIndex} style={{ flexDirection: 'row', gap: tokens.space.xs }}>
                    <ServiceTextField
                      containerStyle={{ flex: 2 }}
                      label={copy.optionName}
                      onChangeText={(value) =>
                        updateOption(setModifierGroups, groupIndex, optionIndex, { name: value })
                      }
                      value={option.name}
                    />
                    <ServiceTextField
                      containerStyle={{ flex: 1 }}
                      keyboardType="decimal-pad"
                      label={copy.extraPrice}
                      onChangeText={(value) =>
                        updateOption(setModifierGroups, groupIndex, optionIndex, {
                          priceDeltaMinor: Math.round(Number(value.replace(',', '.')) * 100) || 0,
                        })
                      }
                      value={(option.priceDeltaMinor / 100).toFixed(2)}
                    />
                    <Pressable
                      accessibilityLabel={copy.removeOption}
                      accessibilityRole="button"
                      onPress={() =>
                        setModifierGroups((current) =>
                          current.map((entry, index) =>
                            index === groupIndex
                              ? {
                                  ...entry,
                                  options: entry.options.filter(
                                    (_, currentOptionIndex) => currentOptionIndex !== optionIndex,
                                  ),
                                }
                              : entry,
                          ),
                        )
                      }
                      style={{ alignSelf: 'flex-end', padding: tokens.space.sm }}
                    >
                      <Ionicons name="close-circle-outline" size={24} color={tokens.colors.error} />
                    </Pressable>
                  </View>
                ))}
                <ServiceButton
                  icon="add-outline"
                  label={copy.addOption}
                  onPress={() =>
                    setModifierGroups((current) =>
                      current.map((entry, index) =>
                        index === groupIndex
                          ? {
                              ...entry,
                              options: [
                                ...entry.options,
                                {
                                  name: '',
                                  priceDeltaMinor: 0,
                                  isDefault: false,
                                  sortOrder: entry.options.length,
                                },
                              ],
                            }
                          : entry,
                      ),
                    )
                  }
                  variant="ghost"
                />
              </ServiceSurface>
            ))}
          </ServiceSurface>

          <View
            style={{
              flexDirection: layout.mode === 'compact' ? 'column-reverse' : 'row',
              gap: tokens.space.sm,
              justifyContent: 'flex-end',
            }}
          >
            <ServiceButton
              label={copy.cancel}
              onPress={() => navigation.goBack()}
              size="large"
              variant="ghost"
            />
            <ServiceButton
              disabled={
                !name.trim() ||
                !price.trim() ||
                (!categoryId && !newCategoryName.trim()) ||
                modifierGroups.some(
                  (group) =>
                    !group.name.trim() || group.options.some((option) => !option.name.trim()),
                )
              }
              icon="checkmark-outline"
              label={itemId ? copy.update : copy.save}
              loading={saving}
              onPress={() => void save()}
              size="large"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function updateGroup(
  setGroups: React.Dispatch<React.SetStateAction<MenuModifierGroupDraft[]>>,
  index: number,
  patch: Partial<MenuModifierGroupDraft>,
) {
  setGroups((current) =>
    current.map((group, groupIndex) => (groupIndex === index ? { ...group, ...patch } : group)),
  );
}

function updateOption(
  setGroups: React.Dispatch<React.SetStateAction<MenuModifierGroupDraft[]>>,
  groupIndex: number,
  optionIndex: number,
  patch: Partial<MenuModifierGroupDraft['options'][number]>,
) {
  setGroups((current) =>
    current.map((group, currentGroupIndex) =>
      currentGroupIndex === groupIndex
        ? {
            ...group,
            options: group.options.map((option, currentOptionIndex) =>
              currentOptionIndex === optionIndex ? { ...option, ...patch } : option,
            ),
          }
        : group,
    ),
  );
}

function EditorChip({
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
      accessibilityRole="button"
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

function ServiceEmptyEditor({
  body,
  close,
  title,
}: {
  readonly body: string;
  readonly close: () => void;
  readonly title: string;
}) {
  const { tokens } = useTheme();
  return (
    <View style={{ gap: tokens.space.md, padding: tokens.space.lg }}>
      <Text style={[tokens.typography.title, { color: tokens.colors.text }]}>{title}</Text>
      <Text style={[tokens.typography.body, { color: tokens.colors.textSubtle }]}>{body}</Text>
      <ServiceButton label="OK" onPress={close} />
    </View>
  );
}

function editorCopy(language: 'tr' | 'bg' | 'en') {
  if (language === 'tr') {
    return {
      addTitle: 'Ürün ekle',
      editTitle: 'Ürünü düzenle',
      subtitle: 'Serviste gereken bütün seçenekleri tek ekranda hazırla.',
      close: 'Kapat',
      cloud: 'Buluta kaydolur',
      deviceOnly: 'Yalnız cihaz',
      loadFailed: 'Menü yüklenemedi.',
      basics: 'Temel bilgiler',
      name: 'Ürün adı',
      price: 'Fiyat',
      prep: 'Hazırlık (dk)',
      description: 'Açıklama',
      category: 'Kategori',
      newCategory: 'Yeni kategori',
      newCategoryHelp: 'Mevcut kategori seçmek yerine yeni bir ad yazabilirsin.',
      translations: 'Çeviriler',
      localizedName: 'Çevrilmiş ad',
      localizedDescription: 'Çevrilmiş açıklama',
      options: 'Seçenek grupları',
      optionsHelp: 'Örn. peynirli/peynirsiz veya pişirme derecesi.',
      addGroup: 'Grup ekle',
      groupName: 'Grup adı',
      removeGroup: 'Grubu kaldır',
      single: 'Tek seçim',
      multiple: 'Çoklu seçim',
      required: 'Zorunlu',
      optionName: 'Seçenek',
      extraPrice: 'Ek fiyat',
      removeOption: 'Seçeneği kaldır',
      addOption: 'Seçenek ekle',
      cancel: 'Vazgeç',
      save: 'Ürünü kaydet',
      update: 'Değişiklikleri kaydet',
      namePriceRequired: 'Geçerli ürün adı ve fiyat gir.',
      categoryRequired: 'Bir kategori seç veya yeni kategori yaz.',
      onlineRequired: 'Bulut menüyü kaydetmek için internete bağlan.',
      saved: 'Menü güncellendi',
      savedBody: 'Ürün ve seçenekleri kaydedildi.',
      done: 'Tamam',
      saveFailed: 'Ürün kaydedilemedi.',
      managerOnly: 'Menüyü yalnız yöneticiler değiştirebilir.',
      unavailable: 'Düzenleme kullanılamıyor',
    } as const;
  }
  if (language === 'bg') {
    return {
      addTitle: 'Добави артикул',
      editTitle: 'Редактирай артикул',
      subtitle: 'Подгответе всички опции за бързо обслужване.',
      close: 'Затвори',
      cloud: 'Запис в облака',
      deviceOnly: 'Само устройство',
      loadFailed: 'Менюто не се зареди.',
      basics: 'Основни данни',
      name: 'Име',
      price: 'Цена',
      prep: 'Приготвяне (мин)',
      description: 'Описание',
      category: 'Категория',
      newCategory: 'Нова категория',
      newCategoryHelp: 'Може да въведете нова вместо да изберете съществуваща.',
      translations: 'Преводи',
      localizedName: 'Преведено име',
      localizedDescription: 'Преведено описание',
      options: 'Групи опции',
      optionsHelp: 'Напр. със/без сирене или степен на изпичане.',
      addGroup: 'Добави група',
      groupName: 'Име на група',
      removeGroup: 'Премахни групата',
      single: 'Един избор',
      multiple: 'Много избори',
      required: 'Задължително',
      optionName: 'Опция',
      extraPrice: 'Доплащане',
      removeOption: 'Премахни опцията',
      addOption: 'Добави опция',
      cancel: 'Отказ',
      save: 'Запази артикула',
      update: 'Запази промените',
      namePriceRequired: 'Въведете валидни име и цена.',
      categoryRequired: 'Изберете или въведете категория.',
      onlineRequired: 'Свържете се с интернет за запис в облака.',
      saved: 'Менюто е обновено',
      savedBody: 'Артикулът и опциите са записани.',
      done: 'Готово',
      saveFailed: 'Артикулът не се запази.',
      managerOnly: 'Само мениджъри могат да променят менюто.',
      unavailable: 'Редакцията не е достъпна',
    } as const;
  }
  return {
    addTitle: 'Add item',
    editTitle: 'Edit item',
    subtitle: 'Prepare every option needed for fast service.',
    close: 'Close',
    cloud: 'Saved to cloud',
    deviceOnly: 'Device only',
    loadFailed: 'The menu could not be loaded.',
    basics: 'Basics',
    name: 'Item name',
    price: 'Price',
    prep: 'Prep time (min)',
    description: 'Description',
    category: 'Category',
    newCategory: 'New category',
    newCategoryHelp: 'Enter a new name instead of selecting an existing category.',
    translations: 'Translations',
    localizedName: 'Localized name',
    localizedDescription: 'Localized description',
    options: 'Option groups',
    optionsHelp: 'For example, with/without cheese or cooking preference.',
    addGroup: 'Add group',
    groupName: 'Group name',
    removeGroup: 'Remove group',
    single: 'Single choice',
    multiple: 'Multiple choices',
    required: 'Required',
    optionName: 'Option',
    extraPrice: 'Extra price',
    removeOption: 'Remove option',
    addOption: 'Add option',
    cancel: 'Cancel',
    save: 'Save item',
    update: 'Save changes',
    namePriceRequired: 'Enter a valid item name and price.',
    categoryRequired: 'Select or enter a category.',
    onlineRequired: 'Connect to the internet to save the cloud menu.',
    saved: 'Menu updated',
    savedBody: 'The item and its options were saved.',
    done: 'Done',
    saveFailed: 'The item could not be saved.',
    managerOnly: 'Only managers can change the menu.',
    unavailable: 'Editing unavailable',
  } as const;
}
