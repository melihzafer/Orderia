import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import {
  ServiceButton,
  ServiceStatusPill,
  ServiceSurface,
  ServiceTextField,
} from '../../design-system';
import {
  Check,
  CheckId,
  OrderItem,
  OrderItemId,
  OrderItemModifier,
  Payment,
  PaymentAllocation,
} from '../../domain';
import { Language } from '../../i18n';
// Aynı klasördeki paylaşılan biçimlendirici; buradaki özel kopya birebir aynıydı.
import { formatMoney } from './workspaceFormat';
import {
  CheckSplitPlan,
  CheckSplitValidationError,
  buildCheckSplitPlan,
  buildSplittableOrderItems,
} from './checkSplitPlanner';

export interface CheckSplitSheetProps {
  readonly visible: boolean;
  readonly sourceCheck: Check;
  /** Ayni oturumdaki diger acik hesaplar; bosluk varsa yeni hesap acilir. */
  readonly openChecks: readonly Check[];
  readonly items: readonly OrderItem[];
  readonly modifiers: readonly OrderItemModifier[];
  readonly payments: readonly Payment[];
  readonly allocations: readonly PaymentAllocation[];
  readonly language: Language;
  readonly busy: boolean;
  readonly onClose: () => void;
  readonly onConfirm: (plan: CheckSplitPlan, targetCheck?: Check) => Promise<void>;
}

const NEW_CHECK = 'new' as const;

/**
 * "Bu bira Ali'nin, su kola Ayse'nin": garson kalemleri karsilastirarak tasir.
 * Ustteki iki toplam her dokunusta guncellenir; masada hesap yapmak yerine
 * ekranda gorulur.
 */
export function CheckSplitSheet({
  visible,
  sourceCheck,
  openChecks,
  items,
  modifiers,
  payments,
  allocations,
  language,
  busy,
  onClose,
  onConfirm,
}: CheckSplitSheetProps) {
  const { tokens } = useTheme();
  const copy = splitCopy(language);
  const [moves, setMoves] = useState<Readonly<Record<string, number>>>({});
  const [targetId, setTargetId] = useState<CheckId | typeof NEW_CHECK>(NEW_CHECK);
  const [guestName, setGuestName] = useState('');
  const [error, setError] = useState<string>();

  const splittable = useMemo(
    () => buildSplittableOrderItems(sourceCheck, items, modifiers, payments, allocations),
    [allocations, items, modifiers, payments, sourceCheck],
  );
  const movable = splittable.filter((entry) => entry.movableQuantity > 0);
  const locked = splittable.filter((entry) => entry.movableQuantity === 0);
  const targets = openChecks.filter(
    (check) =>
      check.id !== sourceCheck.id &&
      check.tableSessionId === sourceCheck.tableSessionId &&
      (check.status === 'open' || check.status === 'partially_paid'),
  );
  const targetCheck = targets.find((check) => check.id === targetId);

  useEffect(() => {
    if (!visible) return;
    setMoves({});
    setTargetId(NEW_CHECK);
    setGuestName('');
    setError(undefined);
  }, [sourceCheck.id, visible]);

  const currencyCode = splittable[0]?.item.currencyCode ?? 'EUR';
  const movedTotalMinor = splittable.reduce(
    (total, entry) => total + entry.unitTotalMinor * (moves[entry.item.id] ?? 0),
    0,
  );
  const stayingTotalMinor = splittable.reduce(
    (total, entry) =>
      total + entry.unitTotalMinor * (entry.item.quantity - (moves[entry.item.id] ?? 0)),
    0,
  );
  const movedCount = Object.values(moves).reduce((total, quantity) => total + quantity, 0);
  const activeStep =
    !targetCheck && targetId === NEW_CHECK && guestName.trim().length === 0
      ? 1
      : movedCount === 0
        ? 2
        : 3;
  const targetLabel = (targetCheck?.name ?? guestName.trim()) || copy.newCheck;

  const changeMove = (orderItemId: OrderItemId, delta: number, maximum: number) => {
    setError(undefined);
    setMoves((current) => {
      const next = Math.min(maximum, Math.max(0, (current[orderItemId] ?? 0) + delta));
      if (next === 0) {
        const { [orderItemId]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [orderItemId]: next };
    });
  };

  const submit = async () => {
    try {
      setError(undefined);
      const plan = buildCheckSplitPlan({
        sourceCheck,
        ...(targetCheck ? { targetCheck } : { targetCheckName: guestName }),
        items,
        modifiers,
        payments,
        allocations,
        moves: Object.entries(moves).map(([orderItemId, quantity]) => ({
          orderItemId: orderItemId as OrderItemId,
          quantity,
        })),
      });
      await onConfirm(plan, targetCheck);
    } catch (caught) {
      setError(
        caught instanceof CheckSplitValidationError
          ? (copy.errors[caught.code] ?? caught.message)
          : caught instanceof Error
            ? caught.message
            : copy.failed,
      );
    }
  };

  const canSubmit = movedCount > 0 && (Boolean(targetCheck) || guestName.trim().length > 0);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      transparent
      visible={visible}
    >
      <View style={{ backgroundColor: tokens.colors.overlay, flex: 1, justifyContent: 'flex-end' }}>
        <View
          style={{
            alignSelf: 'center',
            backgroundColor: tokens.colors.bg,
            borderTopLeftRadius: tokens.radius.large,
            borderTopRightRadius: tokens.radius.large,
            maxHeight: '92%',
            maxWidth: 720,
            padding: tokens.space.lg,
            width: '100%',
          }}
        >
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: tokens.space.md,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[tokens.typography.title, { color: tokens.colors.text }]}>
                {copy.title}
              </Text>
              <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
                {sourceCheck.name} · {copy.hint}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={copy.close}
              accessibilityRole="button"
              disabled={busy}
              onPress={onClose}
              style={{ padding: tokens.space.sm }}
            >
              <Ionicons color={tokens.colors.text} name="close" size={26} />
            </Pressable>
          </View>

          <SplitStepIndicator
            activeStep={activeStep}
            steps={[copy.stepTarget, copy.stepItems, copy.stepReview]}
          />

          <View
            accessibilityLiveRegion="polite"
            style={{ flexDirection: 'row', gap: tokens.space.sm, marginBottom: tokens.space.md }}
          >
            <TotalCard
              amountMinor={stayingTotalMinor}
              currencyCode={currencyCode}
              label={copy.staysHere}
              language={language}
              tone="neutral"
            />
            <TotalCard
              amountMinor={movedTotalMinor}
              currencyCode={currencyCode}
              label={copy.movesTo}
              language={language}
              tone="accent"
            />
          </View>

          <ScrollView
            contentContainerStyle={{ gap: tokens.space.md, paddingBottom: tokens.space.lg }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <ServiceSurface padding="small" variant="outlined">
              <Text style={[tokens.typography.label, { color: tokens.colors.text }]}>
                {copy.targetLabel}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs }}>
                <TargetChip
                  label={copy.newCheck}
                  onPress={() => setTargetId(NEW_CHECK)}
                  selected={targetId === NEW_CHECK}
                />
                {targets.map((check) => (
                  <TargetChip
                    key={check.id}
                    label={check.name}
                    onPress={() => setTargetId(check.id)}
                    selected={targetId === check.id}
                  />
                ))}
              </View>
              {targetId === NEW_CHECK ? (
                <ServiceTextField
                  label={copy.guestNameLabel}
                  onChangeText={setGuestName}
                  placeholder={copy.guestNameHint}
                  value={guestName}
                />
              ) : null}
            </ServiceSurface>

            {movable.length === 0 ? (
              <Text style={[tokens.typography.body, { color: tokens.colors.textSubtle }]}>
                {copy.empty}
              </Text>
            ) : (
              <>
                <View style={{ flexDirection: 'row', gap: tokens.space.xs }}>
                  <ServiceButton
                    label={copy.moveAll}
                    onPress={() =>
                      setMoves(
                        Object.fromEntries(
                          movable.map((entry) => [entry.item.id, entry.movableQuantity]),
                        ),
                      )
                    }
                    style={{ flex: 1 }}
                    variant="outline"
                  />
                  <ServiceButton
                    disabled={movedCount === 0}
                    label={copy.clear}
                    onPress={() => setMoves({})}
                    style={{ flex: 1 }}
                    variant="ghost"
                  />
                </View>

                {movable.map((entry) => {
                  const moved = moves[entry.item.id] ?? 0;
                  const staying = entry.item.quantity - moved;
                  return (
                    <ServiceSurface
                      key={entry.item.id}
                      style={{
                        borderColor: moved > 0 ? tokens.colors.accent : tokens.colors.border,
                        borderWidth: moved > 0 ? 2 : 1,
                        gap: tokens.space.sm,
                        padding: tokens.space.md,
                      }}
                    >
                      <View style={{ flexDirection: 'row', gap: tokens.space.sm }}>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[tokens.typography.bodyStrong, { color: tokens.colors.text }]}
                          >
                            {entry.item.nameSnapshot}
                          </Text>
                          {entry.modifiers.map((modifier) => (
                            <Text
                              key={modifier.id}
                              style={[
                                tokens.typography.caption,
                                { color: tokens.colors.textSubtle },
                              ]}
                            >
                              + {modifier.modifierOptionNameSnapshot}
                            </Text>
                          ))}
                          {entry.item.note ? (
                            <Text
                              style={[tokens.typography.caption, { color: tokens.colors.warning }]}
                            >
                              {entry.item.note}
                            </Text>
                          ) : null}
                        </View>
                        <Text
                          style={[tokens.typography.label, { color: tokens.colors.textSubtle }]}
                        >
                          {formatMoney(entry.unitTotalMinor, entry.item.currencyCode, language)}
                        </Text>
                      </View>

                      <View
                        style={{
                          alignItems: 'center',
                          flexDirection: 'row',
                          gap: tokens.space.sm,
                        }}
                      >
                        <SideCount count={staying} label={copy.staysHere} tone="neutral" />
                        <Pressable
                          accessibilityLabel={`${copy.moveBack}: ${entry.item.nameSnapshot}`}
                          accessibilityRole="button"
                          disabled={moved === 0}
                          hitSlop={6}
                          onPress={() => changeMove(entry.item.id, -1, entry.movableQuantity)}
                          style={{
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 48,
                            minWidth: 48,
                            opacity: moved === 0 ? 0.3 : 1,
                          }}
                        >
                          <Ionicons
                            color={tokens.colors.text}
                            name="chevron-back-circle"
                            size={34}
                          />
                        </Pressable>
                        <Pressable
                          accessibilityLabel={`${copy.moveOne}: ${entry.item.nameSnapshot}`}
                          accessibilityRole="button"
                          disabled={moved >= entry.movableQuantity}
                          hitSlop={6}
                          onPress={() => changeMove(entry.item.id, 1, entry.movableQuantity)}
                          style={{
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 48,
                            minWidth: 48,
                            opacity: moved >= entry.movableQuantity ? 0.3 : 1,
                          }}
                        >
                          <Ionicons
                            color={tokens.colors.accent}
                            name="chevron-forward-circle"
                            size={34}
                          />
                        </Pressable>
                        <SideCount count={moved} label={copy.movesTo} tone="accent" />
                      </View>
                    </ServiceSurface>
                  );
                })}
              </>
            )}

            {locked.length > 0 ? (
              <View style={{ gap: tokens.space.xs }}>
                <Text style={[tokens.typography.label, { color: tokens.colors.textSubtle }]}>
                  {copy.lockedTitle}
                </Text>
                {locked.map((entry) => (
                  <View
                    key={entry.item.id}
                    style={{
                      alignItems: 'center',
                      flexDirection: 'row',
                      gap: tokens.space.sm,
                      opacity: 0.6,
                    }}
                  >
                    <Text style={[tokens.typography.body, { color: tokens.colors.text, flex: 1 }]}>
                      {entry.item.quantity}× {entry.item.nameSnapshot}
                    </Text>
                    <ServiceStatusPill label={copy.paidLocked} tone="success" />
                  </View>
                ))}
              </View>
            ) : null}

            {error ? (
              <Text
                accessibilityLiveRegion="assertive"
                style={[tokens.typography.caption, { color: tokens.colors.error }]}
              >
                {error}
              </Text>
            ) : null}

            {movedCount > 0 ? (
              <ServiceSurface
                style={{
                  backgroundColor: tokens.colors.accentSoft,
                  borderColor: tokens.colors.accent,
                }}
                variant="outlined"
              >
                <Text style={[tokens.typography.label, { color: tokens.colors.text }]}>
                  {copy.reviewTitle}
                </Text>
                <Text style={[tokens.typography.body, { color: tokens.colors.textSubtle }]}>
                  {movedCount} · {copy.movesTo}: {targetLabel} ·{' '}
                  {formatMoney(movedTotalMinor, currencyCode, language)}
                </Text>
              </ServiceSurface>
            ) : null}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: tokens.space.sm }}>
            <ServiceButton
              disabled={busy}
              label={copy.close}
              onPress={onClose}
              style={{ flex: 1 }}
              variant="ghost"
            />
            <ServiceButton
              disabled={busy || !canSubmit}
              label={`${copy.apply} (${movedCount})`}
              loading={busy}
              onPress={() => void submit()}
              style={{ flex: 2 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SplitStepIndicator({
  activeStep,
  steps,
}: {
  readonly activeStep: number;
  readonly steps: readonly string[];
}) {
  const { tokens } = useTheme();

  return (
    <View
      accessibilityLabel={steps[activeStep - 1]}
      accessibilityRole="progressbar"
      style={{ flexDirection: 'row', gap: tokens.space.xs, marginBottom: tokens.space.md }}
    >
      {steps.map((step, index) => {
        const number = index + 1;
        const complete = number < activeStep;
        const active = number === activeStep;
        return (
          <View
            key={step}
            style={{
              backgroundColor:
                active || complete ? tokens.colors.accentSoft : tokens.colors.surfaceAlt,
              borderColor: active ? tokens.colors.accent : tokens.colors.borderLight,
              borderRadius: tokens.radius.medium,
              borderWidth: active ? 2 : 1,
              flex: 1,
              minHeight: 48,
              justifyContent: 'center',
              paddingHorizontal: tokens.space.xs,
            }}
          >
            <Text
              numberOfLines={2}
              style={[
                tokens.typography.caption,
                {
                  color: active || complete ? tokens.colors.accent : tokens.colors.textMuted,
                  textAlign: 'center',
                },
              ]}
            >
              {step}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function TotalCard({
  amountMinor,
  currencyCode,
  label,
  language,
  tone,
}: {
  readonly amountMinor: number;
  readonly currencyCode: string;
  readonly label: string;
  readonly language: Language;
  readonly tone: 'neutral' | 'accent';
}) {
  const { tokens } = useTheme();
  return (
    <ServiceSurface
      style={{
        backgroundColor: tone === 'accent' ? tokens.colors.accentSoft : tokens.colors.surfaceAlt,
        flex: 1,
        padding: tokens.space.md,
      }}
    >
      <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>{label}</Text>
      <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
        {formatMoney(amountMinor, currencyCode, language)}
      </Text>
    </ServiceSurface>
  );
}

function SideCount({
  count,
  label,
  tone,
}: {
  readonly count: number;
  readonly label: string;
  readonly tone: 'neutral' | 'accent';
}) {
  const { tokens } = useTheme();
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text
        style={[
          tokens.typography.title,
          { color: tone === 'accent' ? tokens.colors.accent : tokens.colors.text },
        ]}
      >
        {count}
      </Text>
      <Text
        numberOfLines={1}
        style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}
      >
        {label}
      </Text>
    </View>
  );
}

function TargetChip({
  label,
  onPress,
  selected,
}: {
  readonly label: string;
  readonly onPress: () => void;
  readonly selected: boolean;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        backgroundColor: selected ? tokens.colors.accentSoft : tokens.colors.surfaceAlt,
        borderColor: selected ? tokens.colors.accent : tokens.colors.border,
        borderRadius: tokens.radius.full,
        borderWidth: selected ? 2 : 1,
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: tokens.space.md,
      }}
    >
      <Text style={[tokens.typography.label, { color: tokens.colors.text }]}>{label}</Text>
    </Pressable>
  );
}

function splitCopy(language: Language) {
  const translations = {
    tr: {
      title: 'Hesabı böl',
      hint: 'kimin ne aldığını işaretle',
      close: 'Kapat',
      staysHere: 'Burada kalan',
      movesTo: 'Ayrılan',
      moveOne: 'Bir adet ayır',
      moveBack: 'Bir adet geri al',
      moveAll: 'Hepsini ayır',
      clear: 'Seçimi temizle',
      stepTarget: '1 · Hedefi seç',
      stepItems: '2 · Ürünleri ayır',
      stepReview: '3 · Kontrol et',
      reviewTitle: 'Bölme özeti',
      empty: 'Bu hesapta taşınabilecek ürün yok.',
      lockedTitle: 'Ödendiği için taşınamaz',
      paidLocked: 'Ödendi',
      targetLabel: 'Nereye gitsin?',
      newCheck: 'Yeni hesap',
      guestNameLabel: 'Yeni hesabın adı',
      guestNameHint: 'Örn. Ali, Pencere kenarı',
      apply: 'Böl',
      failed: 'Hesap bölünemedi.',
      errors: {
        EMPTY_SELECTION: 'Önce taşınacak ürünleri seç.',
        SOURCE_CHECK_LOCKED: 'Kapanmış hesap bölünemez.',
        TARGET_CHECK_LOCKED: 'Hedef hesap kapanmış, ürün alamaz.',
        TARGET_SAME_AS_SOURCE: 'Hedef hesap kaynakla aynı olamaz.',
        TARGET_OTHER_SESSION: 'Hedef hesap başka bir masaya ait.',
        TARGET_NAME_REQUIRED: 'Yeni hesaba bir ad ver.',
        ITEM_NOT_IN_CHECK: 'Ürün bu hesapta değil, ekranı yenile.',
        ITEM_CANCELLED: 'İptal edilmiş ürün taşınamaz.',
        ITEM_ALREADY_PAID: 'Ödenmiş ürün taşınamaz.',
        INVALID_QUANTITY: 'Adet bu üründe geçerli değil.',
        CURRENCY_MISMATCH: 'Farklı para birimleri tek hesaba taşınamaz.',
        NOTHING_LEFT_TO_MOVE: 'Taşınacak ürün kalmadı.',
      },
    },
    bg: {
      title: 'Раздели сметката',
      hint: 'отбележете кой какво е взел',
      close: 'Затвори',
      staysHere: 'Остава тук',
      movesTo: 'Отделено',
      moveOne: 'Отдели една бройка',
      moveBack: 'Върни една бройка',
      moveAll: 'Отдели всичко',
      clear: 'Изчисти избора',
      stepTarget: '1 · Изберете цел',
      stepItems: '2 · Разделете продуктите',
      stepReview: '3 · Проверете',
      reviewTitle: 'Обобщение на разделянето',
      empty: 'Няма продукти за местене в тази сметка.',
      lockedTitle: 'Платено, не може да се мести',
      paidLocked: 'Платено',
      targetLabel: 'Къде да отиде?',
      newCheck: 'Нова сметка',
      guestNameLabel: 'Име на новата сметка',
      guestNameHint: 'Напр. Али, До прозореца',
      apply: 'Раздели',
      failed: 'Сметката не беше разделена.',
      errors: {
        EMPTY_SELECTION: 'Първо изберете продукти.',
        SOURCE_CHECK_LOCKED: 'Затворена сметка не може да се разделя.',
        TARGET_CHECK_LOCKED: 'Целевата сметка е затворена.',
        TARGET_SAME_AS_SOURCE: 'Целевата сметка не може да е същата.',
        TARGET_OTHER_SESSION: 'Целевата сметка е от друга маса.',
        TARGET_NAME_REQUIRED: 'Дайте име на новата сметка.',
        ITEM_NOT_IN_CHECK: 'Продуктът не е в тази сметка, обновете.',
        ITEM_CANCELLED: 'Отказан продукт не може да се мести.',
        ITEM_ALREADY_PAID: 'Платен продукт не може да се мести.',
        INVALID_QUANTITY: 'Невалидно количество за този продукт.',
        CURRENCY_MISMATCH: 'Различни валути не могат да се обединят.',
        NOTHING_LEFT_TO_MOVE: 'Не остана нищо за местене.',
      },
    },
    en: {
      title: 'Split check',
      hint: 'mark who had what',
      close: 'Close',
      staysHere: 'Stays here',
      movesTo: 'Split off',
      moveOne: 'Split off one',
      moveBack: 'Put one back',
      moveAll: 'Split off everything',
      clear: 'Clear selection',
      stepTarget: '1 · Choose target',
      stepItems: '2 · Split products',
      stepReview: '3 · Review',
      reviewTitle: 'Split summary',
      empty: 'Nothing on this check can be moved.',
      lockedTitle: 'Paid, cannot be moved',
      paidLocked: 'Paid',
      targetLabel: 'Where does it go?',
      newCheck: 'New check',
      guestNameLabel: 'Name of the new check',
      guestNameHint: 'e.g. Ali, Window seat',
      apply: 'Split',
      failed: 'The check could not be split.',
      errors: {
        EMPTY_SELECTION: 'Pick the items to move first.',
        SOURCE_CHECK_LOCKED: 'A settled check cannot be split.',
        TARGET_CHECK_LOCKED: 'The target check is settled and cannot take items.',
        TARGET_SAME_AS_SOURCE: 'The target check must be a different one.',
        TARGET_OTHER_SESSION: 'The target check belongs to another table.',
        TARGET_NAME_REQUIRED: 'Give the new check a name.',
        ITEM_NOT_IN_CHECK: 'That item is not on this check anymore; refresh.',
        ITEM_CANCELLED: 'A cancelled item cannot be moved.',
        ITEM_ALREADY_PAID: 'A paid item cannot be moved.',
        INVALID_QUANTITY: 'That quantity is not valid for this item.',
        CURRENCY_MISMATCH: 'Items in different currencies cannot share a check.',
        NOTHING_LEFT_TO_MOVE: 'Nothing left to move.',
      },
    },
  };
  return translations[language] ?? translations.en;
}
