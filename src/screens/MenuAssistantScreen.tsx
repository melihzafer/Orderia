import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
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
import { CurrencyCode } from '../domain';
import {
  AllergenPresence,
  EditableCatalogItem,
  MenuAiDraft,
  editableItemFromSuggestion,
} from '../features/menu-management';
import { useLocalization } from '../i18n';
import { RootStackParamList } from '../navigation/AppNavigator';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function MenuAssistantScreen() {
  const navigation = useNavigation<Navigation>();
  const auth = useAuth();
  const { tokens } = useTheme();
  const { language } = useLocalization();
  const layout = useAdaptiveLayout();
  const { generateMenuAiDraft, mode, publishMenuAiDraft, sync } = useOrderiaData();
  const copy = assistantCopy(language);
  const [prompt, setPrompt] = useState('');
  const [draft, setDraft] = useState<MenuAiDraft>();
  const [item, setItem] = useState<EditableCatalogItem>();
  const [allergens, setAllergens] = useState<Record<string, AllergenPresence | undefined>>({});
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string>();
  const isManager = auth.activeMembership?.role === 'manager';
  const cloudReady = mode === 'cloud' && sync.online;
  const currencyCode = (auth.activeBranch?.currency_code ?? 'EUR') as CurrencyCode;

  const confirmedAllergens = useMemo(
    () =>
      Object.entries(allergens)
        .filter((entry): entry is [string, AllergenPresence] => Boolean(entry[1]))
        .map(([code, presence]) => ({ code, presence })),
    [allergens],
  );

  const generate = async () => {
    if (!isManager) {
      setError(copy.managerOnly);
      return;
    }
    if (!cloudReady) {
      setError(copy.onlineOnly);
      return;
    }
    if (prompt.trim().length < 3) {
      setError(copy.promptRequired);
      return;
    }
    setGenerating(true);
    setError(undefined);
    try {
      const next = await generateMenuAiDraft(prompt.trim(), currencyCode, language);
      setDraft(next);
      setItem(editableItemFromSuggestion(next.suggestion));
      setAllergens({});
      setReviewConfirmed(false);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : copy.unavailable);
    } finally {
      setGenerating(false);
    }
  };

  const publish = async () => {
    if (!draft || !item || !reviewConfirmed) return;
    setPublishing(true);
    setError(undefined);
    try {
      await publishMenuAiDraft(draft.id, draft.version, {
        ...item,
        confirmedAllergens,
      });
      Alert.alert(copy.published, copy.publishedBody, [
        { text: copy.done, onPress: () => navigation.goBack() },
      ]);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : copy.publishFailed);
    } finally {
      setPublishing(false);
    }
  };

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
              justifyContent: 'space-between',
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
              <Text style={[tokens.typography.title, { color: tokens.colors.text }]}>
                {copy.title}
              </Text>
              <Text style={[tokens.typography.body, { color: tokens.colors.textSubtle }]}>
                {copy.subtitle}
              </Text>
            </View>
            <ServiceStatusPill
              label={draft ? copy.review : copy.draftOnly}
              tone={draft ? 'warning' : 'info'}
            />
          </View>

          <ServiceSurface style={{ gap: tokens.space.md }} variant="raised">
            <View style={{ flexDirection: 'row', gap: tokens.space.sm }}>
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
                <Ionicons name="sparkles" size={24} color={tokens.colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
                  {copy.oneLine}
                </Text>
                <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
                  {copy.example}
                </Text>
              </View>
            </View>
            <ServiceTextField
              label={copy.prompt}
              multiline
              onChangeText={setPrompt}
              placeholder={copy.placeholder}
              inputStyle={{ minHeight: 88, textAlignVertical: 'top' }}
              value={prompt}
            />
            <ServiceButton
              disabled={!cloudReady || !isManager || prompt.trim().length < 3}
              fullWidth
              icon="sparkles"
              label={copy.generate}
              loading={generating}
              onPress={() => void generate()}
              size="large"
              variant="accent"
            />
            {!cloudReady || !isManager ? (
              <Text style={[tokens.typography.caption, { color: tokens.colors.warning }]}>
                {isManager ? copy.onlineOnly : copy.managerOnly}
              </Text>
            ) : null}
          </ServiceSurface>

          {error ? (
            <ServiceSurface
              accessibilityLiveRegion="polite"
              style={{ borderColor: tokens.colors.error, gap: tokens.space.sm }}
              variant="outlined"
            >
              <Text style={[tokens.typography.bodyStrong, { color: tokens.colors.error }]}>
                {copy.unavailable}
              </Text>
              <Text style={[tokens.typography.body, { color: tokens.colors.text }]}>{error}</Text>
              <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
                {copy.manualUnaffected}
              </Text>
            </ServiceSurface>
          ) : null}

          {draft && item ? (
            <>
              <ServiceSurface style={{ gap: tokens.space.sm }} variant="outlined">
                <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
                  {copy.reviewChanges}
                </Text>
                <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
                  {copy.source}: “{prompt.trim()}”
                </Text>
                {draft.suggestion.warnings.map((warning) => (
                  <View key={warning} style={{ flexDirection: 'row', gap: tokens.space.xs }}>
                    <Ionicons name="warning-outline" size={18} color={tokens.colors.warning} />
                    <Text
                      style={[tokens.typography.caption, { color: tokens.colors.text, flex: 1 }]}
                    >
                      {warning}
                    </Text>
                  </View>
                ))}
              </ServiceSurface>

              <ServiceSurface style={{ gap: tokens.space.md }}>
                <SectionTitle title={copy.product} />
                <View
                  style={{
                    flexDirection: layout.mode === 'compact' ? 'column' : 'row',
                    gap: tokens.space.sm,
                  }}
                >
                  <ServiceTextField
                    containerStyle={{ flex: 2 }}
                    label={copy.name}
                    onChangeText={(name) => setItem((current) => current && { ...current, name })}
                    value={item.name}
                  />
                  <ServiceTextField
                    containerStyle={{ flex: 1 }}
                    keyboardType="decimal-pad"
                    label={`${copy.price} (${currencyCode})`}
                    onChangeText={(value) =>
                      setItem((current) =>
                        current
                          ? {
                              ...current,
                              priceMinor: Math.max(
                                0,
                                Math.round(Number(value.replace(',', '.')) * 100) || 0,
                              ),
                            }
                          : current,
                      )
                    }
                    value={(item.priceMinor / 100).toFixed(2)}
                  />
                </View>
                <ServiceTextField
                  label={copy.category}
                  onChangeText={(categoryName) =>
                    setItem((current) =>
                      current ? { ...current, categoryId: undefined, categoryName } : current,
                    )
                  }
                  value={item.categoryName ?? ''}
                />
                <ServiceTextField
                  inputStyle={{ minHeight: 72, textAlignVertical: 'top' }}
                  label={copy.description}
                  multiline
                  onChangeText={(description) =>
                    setItem((current) => current && { ...current, description })
                  }
                  value={item.description ?? ''}
                />
                <ServiceTextField
                  containerStyle={{ maxWidth: 240 }}
                  keyboardType="number-pad"
                  label={copy.prep}
                  onChangeText={(value) =>
                    setItem((current) =>
                      current
                        ? {
                            ...current,
                            prepTimeMinutes: value ? Math.min(1440, Number(value) || 0) : null,
                          }
                        : current,
                    )
                  }
                  value={item.prepTimeMinutes?.toString() ?? ''}
                />
              </ServiceSurface>

              <ServiceSurface style={{ gap: tokens.space.md }}>
                <SectionTitle title={copy.translations} />
                {item.translations.map((translation, index) => (
                  <View key={translation.locale} style={{ gap: tokens.space.xs }}>
                    <ServiceStatusPill label={translation.locale.toUpperCase()} tone="neutral" />
                    <ServiceTextField
                      label={copy.name}
                      onChangeText={(name) =>
                        setItem((current) =>
                          current
                            ? {
                                ...current,
                                translations: current.translations.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, name } : entry,
                                ),
                              }
                            : current,
                        )
                      }
                      value={translation.name}
                    />
                    <ServiceTextField
                      label={copy.description}
                      onChangeText={(description) =>
                        setItem((current) =>
                          current
                            ? {
                                ...current,
                                translations: current.translations.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, description } : entry,
                                ),
                              }
                            : current,
                        )
                      }
                      value={translation.description ?? ''}
                    />
                  </View>
                ))}
              </ServiceSurface>

              <ServiceSurface style={{ gap: tokens.space.md }}>
                <SectionTitle title={copy.modifiers} />
                {item.modifierGroups.length === 0 ? (
                  <Text style={[tokens.typography.body, { color: tokens.colors.textSubtle }]}>
                    {copy.noModifiers}
                  </Text>
                ) : (
                  item.modifierGroups.map((group, groupIndex) => (
                    <View
                      key={`${group.name}-${groupIndex}`}
                      style={{
                        borderColor: tokens.colors.borderLight,
                        borderTopWidth: groupIndex ? 1 : 0,
                        gap: tokens.space.xs,
                        paddingTop: groupIndex ? tokens.space.sm : 0,
                      }}
                    >
                      <View
                        style={{
                          alignItems: 'center',
                          flexDirection: 'row',
                          gap: tokens.space.sm,
                        }}
                      >
                        <Text
                          style={[
                            tokens.typography.bodyStrong,
                            { color: tokens.colors.text, flex: 1 },
                          ]}
                        >
                          {group.name}
                        </Text>
                        <Pressable
                          accessibilityLabel={`${copy.remove} ${group.name}`}
                          accessibilityRole="button"
                          onPress={() =>
                            setItem((current) =>
                              current
                                ? {
                                    ...current,
                                    modifierGroups: current.modifierGroups.filter(
                                      (_, index) => index !== groupIndex,
                                    ),
                                  }
                                : current,
                            )
                          }
                          style={{ padding: tokens.space.sm }}
                        >
                          <Ionicons name="trash-outline" size={20} color={tokens.colors.error} />
                        </Pressable>
                      </View>
                      <Text
                        style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}
                      >
                        {group.selectionType} · {group.isRequired ? copy.required : copy.optional}
                      </Text>
                      {group.options.map((option) => (
                        <Text
                          key={`${group.name}-${option.name}`}
                          style={[tokens.typography.body, { color: tokens.colors.text }]}
                        >
                          • {option.name}{' '}
                          {option.priceDeltaMinor
                            ? `(${option.priceDeltaMinor > 0 ? '+' : ''}${(
                                option.priceDeltaMinor / 100
                              ).toFixed(2)} ${currencyCode})`
                            : ''}
                        </Text>
                      ))}
                    </View>
                  ))
                )}
              </ServiceSurface>

              <ServiceSurface style={{ gap: tokens.space.md }} variant="outlined">
                <View style={{ flexDirection: 'row', gap: tokens.space.sm }}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={24}
                    color={tokens.colors.warning}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
                      {copy.allergens}
                    </Text>
                    <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
                      {copy.allergenWarning}
                    </Text>
                  </View>
                </View>
                {draft.suggestion.allergenSuggestions.length === 0 ? (
                  <Text style={[tokens.typography.body, { color: tokens.colors.textSubtle }]}>
                    {copy.noAllergenSuggestion}
                  </Text>
                ) : (
                  draft.suggestion.allergenSuggestions.map((suggestion) => (
                    <View
                      key={suggestion.code}
                      style={{
                        backgroundColor: tokens.colors.surfaceAlt,
                        borderRadius: tokens.radius.medium,
                        gap: tokens.space.xs,
                        padding: tokens.space.sm,
                      }}
                    >
                      <View
                        style={{
                          alignItems: 'center',
                          flexDirection: 'row',
                          gap: tokens.space.sm,
                        }}
                      >
                        <Text
                          style={[
                            tokens.typography.bodyStrong,
                            { color: tokens.colors.text, flex: 1 },
                          ]}
                        >
                          {suggestion.code}
                        </Text>
                        <ServiceStatusPill
                          label={
                            allergens[suggestion.code]
                              ? copy[allergens[suggestion.code] as AllergenPresence]
                              : copy.unknown
                          }
                          tone={allergens[suggestion.code] ? 'warning' : 'neutral'}
                        />
                      </View>
                      <Text
                        style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}
                      >
                        {suggestion.reason}
                      </Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          gap: tokens.space.xs,
                        }}
                      >
                        {(['contains', 'may_contain', 'free_from'] as const).map((presence) => (
                          <ChoiceChip
                            key={presence}
                            active={allergens[suggestion.code] === presence}
                            label={copy[presence]}
                            onPress={() =>
                              setAllergens((current) => ({
                                ...current,
                                [suggestion.code]:
                                  current[suggestion.code] === presence ? undefined : presence,
                              }))
                            }
                          />
                        ))}
                      </View>
                    </View>
                  ))
                )}
              </ServiceSurface>

              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: reviewConfirmed }}
                onPress={() => setReviewConfirmed((current) => !current)}
                style={{
                  alignItems: 'flex-start',
                  backgroundColor: tokens.colors.surface,
                  borderColor: reviewConfirmed ? tokens.colors.primary : tokens.colors.border,
                  borderRadius: tokens.radius.medium,
                  borderWidth: 2,
                  flexDirection: 'row',
                  gap: tokens.space.sm,
                  minHeight: tokens.sizing.minimumTarget,
                  padding: tokens.space.md,
                }}
              >
                <Ionicons
                  name={reviewConfirmed ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={reviewConfirmed ? tokens.colors.primary : tokens.colors.textMuted}
                />
                <Text style={[tokens.typography.body, { color: tokens.colors.text, flex: 1 }]}>
                  {copy.confirmReview}
                </Text>
              </Pressable>
              <ServiceButton
                disabled={
                  !reviewConfirmed ||
                  !item.name.trim() ||
                  !item.categoryName?.trim() ||
                  item.priceMinor < 0
                }
                fullWidth
                icon="checkmark-circle-outline"
                label={copy.publish}
                loading={publishing}
                onPress={() => void publish()}
                size="large"
              />
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SectionTitle({ title }: { readonly title: string }) {
  const { tokens } = useTheme();
  return (
    <Text style={[tokens.typography.sectionTitle, { color: tokens.colors.text }]}>{title}</Text>
  );
}

function ChoiceChip({
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

function assistantCopy(language: 'tr' | 'bg' | 'en') {
  if (language === 'tr') {
    return {
      title: 'Menü asistanı',
      subtitle: 'Bir cümleden düzenlenebilir taslak oluştur.',
      close: 'Kapat',
      draftOnly: 'Yalnız taslak',
      review: 'Onay bekliyor',
      oneLine: 'Ürünü doğal dille yaz',
      example: 'Örnek: “Patates kızartması - 4 euro, peynirli seçeneği +1 euro”',
      prompt: 'Ürün bilgisi',
      placeholder: 'Ürün, fiyat, seçenek ve kısa not…',
      generate: 'Taslak oluştur',
      managerOnly: 'AI menü asistanını yalnız yöneticiler kullanabilir.',
      onlineOnly: 'AI taslağı için internet bağlantısı gerekli.',
      promptRequired: 'En az 3 karakter yaz.',
      unavailable: 'AI şu anda kullanılamıyor',
      manualUnaffected: 'Normal menü düzenleme çalışmaya devam eder.',
      reviewChanges: 'Taslağı kontrol et ve düzenle',
      source: 'Kaynak',
      product: 'Ürün',
      name: 'Ad',
      price: 'Fiyat',
      category: 'Kategori',
      description: 'Açıklama',
      prep: 'Hazırlık süresi (dk)',
      translations: 'Çeviriler',
      modifiers: 'Seçenekler',
      noModifiers: 'AI bu ürün için seçenek önermedi.',
      remove: 'Kaldır',
      required: 'zorunlu',
      optional: 'isteğe bağlı',
      allergens: 'Alerjen doğrulaması',
      allergenWarning:
        'AI önerileri bilinmiyor durumundadır. Reçete veya tedarikçi belgesini görmeden işaretleme.',
      noAllergenSuggestion: 'Alerjen önerisi yok. Bu, alerjen içermediği anlamına gelmez.',
      unknown: 'Bilinmiyor',
      contains: 'İçerir',
      may_contain: 'İçerebilir',
      free_from: 'İçermez',
      confirmReview:
        'Ürün, fiyat ve seçenekleri kontrol ettim. İşaretlediğim alerjenler için güvenilir kaynağı doğruladım.',
      publish: 'Onayla ve yayınla',
      publishFailed: 'Menü ürünü yayınlanamadı.',
      published: 'Ürün yayınlandı',
      publishedBody: 'Onaylanan taslak aktif şube menüsüne eklendi.',
      done: 'Tamam',
    } as const;
  }
  if (language === 'bg') {
    return {
      title: 'Меню асистент',
      subtitle: 'Създайте редактируема чернова от едно изречение.',
      close: 'Затвори',
      draftOnly: 'Само чернова',
      review: 'Чака преглед',
      oneLine: 'Опишете артикула естествено',
      example: 'Пример: „Пържени картофи - 4 евро, сирене +1 евро“',
      prompt: 'Информация за артикула',
      placeholder: 'Артикул, цена, опции и кратка бележка…',
      generate: 'Създай чернова',
      managerOnly: 'Само мениджъри могат да използват AI асистента.',
      onlineOnly: 'За AI чернова е необходим интернет.',
      promptRequired: 'Въведете поне 3 знака.',
      unavailable: 'AI не е достъпен',
      manualUnaffected: 'Обикновеното редактиране на менюто остава достъпно.',
      reviewChanges: 'Прегледайте и редактирайте черновата',
      source: 'Източник',
      product: 'Артикул',
      name: 'Име',
      price: 'Цена',
      category: 'Категория',
      description: 'Описание',
      prep: 'Приготвяне (мин)',
      translations: 'Преводи',
      modifiers: 'Опции',
      noModifiers: 'AI не предложи опции.',
      remove: 'Премахни',
      required: 'задължително',
      optional: 'по избор',
      allergens: 'Проверка на алергени',
      allergenWarning:
        'AI предложенията са неизвестни. Не ги потвърждавайте без рецепта или документ от доставчик.',
      noAllergenSuggestion: 'Няма предложение. Това не означава, че няма алергени.',
      unknown: 'Неизвестно',
      contains: 'Съдържа',
      may_contain: 'Може да съдържа',
      free_from: 'Не съдържа',
      confirmReview:
        'Проверих артикула, цената и опциите. Потвърдих надежден източник за маркираните алергени.',
      publish: 'Потвърди и публикувай',
      publishFailed: 'Артикулът не можа да се публикува.',
      published: 'Артикулът е публикуван',
      publishedBody: 'Одобрената чернова е добавена към менюто на обекта.',
      done: 'Готово',
    } as const;
  }
  return {
    title: 'Menu assistant',
    subtitle: 'Turn one sentence into an editable draft.',
    close: 'Close',
    draftOnly: 'Draft only',
    review: 'Needs review',
    oneLine: 'Describe the item naturally',
    example: 'Example: “French fries - 4 euro, cheese option +1 euro”',
    prompt: 'Item details',
    placeholder: 'Item, price, options, and a short note…',
    generate: 'Generate draft',
    managerOnly: 'Only managers can use the AI menu assistant.',
    onlineOnly: 'An internet connection is required for an AI draft.',
    promptRequired: 'Enter at least 3 characters.',
    unavailable: 'AI is unavailable',
    manualUnaffected: 'Normal menu editing remains available.',
    reviewChanges: 'Review and edit the draft',
    source: 'Source',
    product: 'Item',
    name: 'Name',
    price: 'Price',
    category: 'Category',
    description: 'Description',
    prep: 'Prep time (min)',
    translations: 'Translations',
    modifiers: 'Options',
    noModifiers: 'AI did not suggest options for this item.',
    remove: 'Remove',
    required: 'required',
    optional: 'optional',
    allergens: 'Allergen verification',
    allergenWarning:
      'AI suggestions remain unknown. Do not confirm them without a recipe or supplier document.',
    noAllergenSuggestion: 'No suggestion. This does not mean the item is allergen-free.',
    unknown: 'Unknown',
    contains: 'Contains',
    may_contain: 'May contain',
    free_from: 'Free from',
    confirmReview:
      'I checked the item, price, and options. I verified a reliable source for every marked allergen.',
    publish: 'Approve and publish',
    publishFailed: 'The menu item could not be published.',
    published: 'Item published',
    publishedBody: 'The approved draft was added to the active branch menu.',
    done: 'Done',
  } as const;
}
