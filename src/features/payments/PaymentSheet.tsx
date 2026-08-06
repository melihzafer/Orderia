import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ServiceButton, ServiceSurface, ServiceTextField } from '../../design-system';
import { Check, OrderItem, OrderItemModifier, Payment, PaymentAllocation } from '../../domain';
import { Language } from '../../i18n';
import {
  ConfirmCheckPaymentsCommand,
  PaymentSelection,
  PaymentSelectionMode,
  buildConfirmCheckPaymentsCommand,
  buildPayableOrderItems,
  splitMinorEqually,
} from './paymentPlanner';
import { beginPwaCriticalFlow } from '../pwa/pwaLifecycle';

type TenderMode = 'cash' | 'card' | 'mixed';

export interface PaymentSheetProps {
  readonly visible: boolean;
  readonly check: Check;
  readonly orderItems: readonly OrderItem[];
  readonly modifiers: readonly OrderItemModifier[];
  readonly payments: readonly Payment[];
  readonly allocations: readonly PaymentAllocation[];
  readonly language: Language;
  readonly online: boolean;
  readonly quickCash?: boolean;
  readonly confirmBeforeClose?: boolean;
  readonly busy: boolean;
  readonly onClose: () => void;
  readonly onConfirm: (command: ConfirmCheckPaymentsCommand) => Promise<void>;
}

export function PaymentSheet({
  visible,
  check,
  orderItems,
  modifiers,
  payments,
  allocations,
  language,
  online,
  quickCash = false,
  confirmBeforeClose = true,
  busy,
  onClose,
  onConfirm,
}: PaymentSheetProps) {
  const { tokens } = useTheme();
  const copy = paymentCopy(language);
  const payable = useMemo(
    () => buildPayableOrderItems(check, orderItems, modifiers, payments, allocations),
    [allocations, check, modifiers, orderItems, payments],
  );
  const currencyCode =
    orderItems.find((item) => item.checkId === check.id && item.status !== 'cancelled')
      ?.currencyCode ?? ('EUR' as never);
  const [selectionMode, setSelectionMode] = useState<PaymentSelectionMode>('amount');
  const [tenderMode, setTenderMode] = useState<TenderMode>('card');
  const [amountInput, setAmountInput] = useState('');
  const [cashAmountInput, setCashAmountInput] = useState('');
  const [tenderedInput, setTenderedInput] = useState('');
  const [partCount, setPartCount] = useState(2);
  const [itemQuantities, setItemQuantities] = useState<Readonly<Record<string, number>>>({});
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!visible) return;
    const remaining = minorToInput(payable.balance.remainingMinor);
    setSelectionMode('amount');
    setTenderMode('card');
    setAmountInput(remaining);
    setCashAmountInput('');
    setTenderedInput(remaining);
    setPartCount(2);
    setItemQuantities({});
    setReviewing(!confirmBeforeClose);
    setError(undefined);
  }, [check.id, confirmBeforeClose, payable.balance.remainingMinor, visible]);

  useEffect(() => {
    if (!visible) return;
    return beginPwaCriticalFlow(`payment:${check.id}`);
  }, [check.id, visible]);

  const selections = useMemo<readonly PaymentSelection[]>(() => {
    if (selectionMode === 'amount') {
      const amountMinor = inputToMinor(amountInput);
      return amountMinor > 0 ? [{ checkId: check.id, amountMinor }] : [];
    }
    if (selectionMode === 'equal') {
      const amountMinor = splitMinorEqually(payable.balance.remainingMinor, partCount)[0];
      return [{ checkId: check.id, amountMinor }];
    }
    return payable.items.flatMap<PaymentSelection>((option) => {
      const quantity = itemQuantities[option.item.id] ?? 0;
      if (quantity <= 0) return [];
      return [
        {
          checkId: check.id,
          orderItemId: option.item.id,
          quantity,
          amountMinor: option.unitTotalMinor * quantity,
        },
      ];
    });
  }, [
    amountInput,
    check.id,
    itemQuantities,
    partCount,
    payable.balance.remainingMinor,
    payable.items,
    selectionMode,
  ]);
  const selectedMinor = selections.reduce((total, selection) => total + selection.amountMinor, 0);
  const mixedCashMinor = inputToMinor(cashAmountInput);
  const cashPaymentMinor = tenderMode === 'mixed' ? mixedCashMinor : selectedMinor;
  const tenderedMinor = inputToMinor(tenderedInput);
  const changeMinor = tenderMode === 'card' ? 0 : Math.max(0, tenderedMinor - cashPaymentMinor);
  const canReview =
    online &&
    selectedMinor > 0 &&
    selectedMinor <= payable.balance.remainingMinor &&
    (tenderMode !== 'mixed' || (mixedCashMinor > 0 && mixedCashMinor < selectedMinor)) &&
    (tenderMode === 'card' || tenderedMinor >= cashPaymentMinor);

  const changeItemQuantity = (itemId: string, delta: number, maximum: number) => {
    setItemQuantities((current) => {
      const next = Math.max(0, Math.min(maximum, (current[itemId] ?? 0) + delta));
      return { ...current, [itemId]: next };
    });
    setReviewing(false);
    setError(undefined);
  };

  const submit = async () => {
    try {
      setError(undefined);
      const tenders =
        tenderMode === 'mixed'
          ? [
              {
                method: 'cash' as const,
                amountMinor: mixedCashMinor,
                tenderedMinor,
              },
              { method: 'card' as const, amountMinor: selectedMinor - mixedCashMinor },
            ]
          : tenderMode === 'cash'
            ? [{ method: 'cash' as const, amountMinor: selectedMinor, tenderedMinor }]
            : [{ method: 'card' as const, amountMinor: selectedMinor }];
      await onConfirm(
        buildConfirmCheckPaymentsCommand({
          checkId: check.id,
          expectedCheckVersion: check.serverVersion ?? check.version,
          currencyCode,
          selections,
          tenders,
        }),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.paymentFailed);
      setReviewing(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      transparent
      visible={visible}
    >
      <View
        style={{
          backgroundColor: tokens.colors.overlay,
          flex: 1,
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            alignSelf: 'center',
            backgroundColor: tokens.colors.bg,
            borderTopLeftRadius: tokens.radius.large,
            borderTopRightRadius: tokens.radius.large,
            maxHeight: '94%',
            maxWidth: 760,
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
                {reviewing ? copy.reviewPayment : copy.takePayment}
              </Text>
              <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
                {check.name} · {copy.remaining}{' '}
                {formatMoney(payable.balance.remainingMinor, currencyCode, language)}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={copy.close}
              accessibilityRole="button"
              disabled={busy}
              hitSlop={8}
              onPress={onClose}
              style={{ padding: tokens.space.sm }}
            >
              <Ionicons color={tokens.colors.text} name="close" size={26} />
            </Pressable>
          </View>

          {!online ? (
            <ServiceSurface
              style={{
                backgroundColor: tokens.colors.state.pending.bg,
                marginBottom: tokens.space.md,
                padding: tokens.space.md,
              }}
            >
              <Text style={[tokens.typography.bodyStrong, { color: tokens.colors.warning }]}>
                {copy.onlineRequired}
              </Text>
              <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
                {copy.onlineRequiredDetail}
              </Text>
            </ServiceSurface>
          ) : null}

          <ScrollView
            contentContainerStyle={{ gap: tokens.space.md, paddingBottom: tokens.space.lg }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!reviewing ? (
              <>
                <SegmentedRow
                  options={[
                    ['amount', copy.amount],
                    ['items', copy.items],
                    ['equal', copy.equal],
                  ]}
                  selected={selectionMode}
                  onSelect={(mode) => {
                    setSelectionMode(mode);
                    setError(undefined);
                  }}
                />

                {selectionMode === 'amount' ? (
                  <ServiceTextField
                    keyboardType="decimal-pad"
                    label={copy.paymentAmount}
                    onChangeText={(value) => {
                      setAmountInput(value);
                      setError(undefined);
                    }}
                    value={amountInput}
                  />
                ) : null}

                {selectionMode === 'equal' ? (
                  <ServiceSurface style={{ gap: tokens.space.sm, padding: tokens.space.md }}>
                    <Text style={[tokens.typography.label, { color: tokens.colors.text }]}>
                      {copy.people}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm }}>
                      {[2, 3, 4, 5, 6, 8].map((count) => (
                        <ChoiceChip
                          key={count}
                          label={String(count)}
                          selected={partCount === count}
                          onPress={() => setPartCount(count)}
                        />
                      ))}
                    </View>
                    <Text style={[tokens.typography.bodyStrong, { color: tokens.colors.primary }]}>
                      {copy.oneShare}{' '}
                      {formatMoney(
                        splitMinorEqually(payable.balance.remainingMinor, partCount)[0],
                        currencyCode,
                        language,
                      )}
                    </Text>
                  </ServiceSurface>
                ) : null}

                {selectionMode === 'items' ? (
                  <View style={{ gap: tokens.space.sm }}>
                    {payable.items.map((option) => {
                      const selected = itemQuantities[option.item.id] ?? 0;
                      return (
                        <ServiceSurface
                          key={option.item.id}
                          style={{
                            alignItems: 'center',
                            flexDirection: 'row',
                            gap: tokens.space.md,
                            padding: tokens.space.md,
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text
                              numberOfLines={2}
                              style={[tokens.typography.bodyStrong, { color: tokens.colors.text }]}
                            >
                              {option.item.nameSnapshot}
                            </Text>
                            <Text
                              style={[
                                tokens.typography.caption,
                                { color: tokens.colors.textSubtle },
                              ]}
                            >
                              {formatMoney(option.unitTotalMinor, currencyCode, language)} ·{' '}
                              {copy.available} {option.remainingQuantity}
                            </Text>
                          </View>
                          <QuantityPicker
                            maximum={option.remainingQuantity}
                            value={selected}
                            onChange={(delta) =>
                              changeItemQuantity(option.item.id, delta, option.remainingQuantity)
                            }
                          />
                        </ServiceSurface>
                      );
                    })}
                  </View>
                ) : null}

                <ServiceSurface style={{ gap: tokens.space.sm, padding: tokens.space.md }}>
                  <Text style={[tokens.typography.label, { color: tokens.colors.text }]}>
                    {copy.method}
                  </Text>
                  <SegmentedRow
                    options={[
                      ['card', copy.card],
                      ['cash', copy.cash],
                      ['mixed', copy.mixed],
                    ]}
                    selected={tenderMode}
                    onSelect={(mode) => {
                      setTenderMode(mode);
                      const selectedInput = minorToInput(selectedMinor);
                      setTenderedInput(selectedInput);
                      if (mode === 'mixed' && !cashAmountInput) {
                        const half = minorToInput(Math.floor(selectedMinor / 2));
                        setCashAmountInput(half);
                        setTenderedInput(half);
                      }
                      setError(undefined);
                    }}
                  />
                  {tenderMode === 'mixed' ? (
                    <ServiceTextField
                      keyboardType="decimal-pad"
                      label={copy.cashPart}
                      onChangeText={setCashAmountInput}
                      value={cashAmountInput}
                    />
                  ) : null}
                  {tenderMode !== 'card' ? (
                    <>
                      <ServiceTextField
                        helperText={`${copy.change}: ${formatMoney(
                          changeMinor,
                          currencyCode,
                          language,
                        )}`}
                        keyboardType="decimal-pad"
                        label={copy.cashReceived}
                        onChangeText={setTenderedInput}
                        value={tenderedInput}
                      />
                      {quickCash && cashPaymentMinor > 0 ? (
                        <View style={{ gap: tokens.space.xs }}>
                          <Text
                            style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}
                          >
                            {copy.quickCash}
                          </Text>
                          <View
                            style={{
                              flexDirection: 'row',
                              flexWrap: 'wrap',
                              gap: tokens.space.xs,
                            }}
                          >
                            {quickCashAmounts(cashPaymentMinor).map((amount) => (
                              <ChoiceChip
                                key={amount}
                                label={formatMoney(amount, currencyCode, language)}
                                onPress={() => setTenderedInput(minorToInput(amount))}
                                selected={inputToMinor(tenderedInput) === amount}
                              />
                            ))}
                          </View>
                        </View>
                      ) : null}
                    </>
                  ) : null}
                </ServiceSurface>
              </>
            ) : (
              <ServiceSurface style={{ gap: tokens.space.md, padding: tokens.space.lg }}>
                <ReviewLine label={copy.check} value={check.name} />
                <ReviewLine
                  label={copy.selected}
                  value={formatMoney(selectedMinor, currencyCode, language)}
                />
                <ReviewLine
                  label={copy.method}
                  value={
                    tenderMode === 'mixed'
                      ? `${copy.cash} + ${copy.card}`
                      : tenderMode === 'cash'
                        ? copy.cash
                        : copy.card
                  }
                />
                {tenderMode !== 'card' ? (
                  <ReviewLine
                    label={copy.change}
                    value={formatMoney(changeMinor, currencyCode, language)}
                  />
                ) : null}
                <View style={{ height: 1, backgroundColor: tokens.colors.border }} />
                <ReviewLine
                  emphasis
                  label={copy.afterPayment}
                  value={formatMoney(
                    payable.balance.remainingMinor - selectedMinor,
                    currencyCode,
                    language,
                  )}
                />
                <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
                  {copy.serverNotice}
                </Text>
              </ServiceSurface>
            )}

            {selectedMinor > payable.balance.remainingMinor ? (
              <Text style={[tokens.typography.caption, { color: tokens.colors.error }]}>
                {copy.exceedsRemaining}
              </Text>
            ) : null}
            {error ? (
              <Text
                accessibilityLiveRegion="assertive"
                style={[tokens.typography.caption, { color: tokens.colors.error }]}
              >
                {error}
              </Text>
            ) : null}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: tokens.space.sm }}>
            <ServiceButton
              disabled={busy}
              label={reviewing ? copy.back : copy.close}
              onPress={() => (reviewing ? setReviewing(false) : onClose())}
              style={{ flex: 1 }}
              variant="ghost"
            />
            <ServiceButton
              disabled={busy || (!reviewing && !canReview)}
              label={reviewing ? copy.confirmPayment : copy.reviewPayment}
              loading={busy}
              onPress={() => (reviewing ? void submit() : setReviewing(true))}
              style={{ flex: 2 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SegmentedRow<Value extends string>({
  options,
  selected,
  onSelect,
}: {
  readonly options: readonly (readonly [Value, string])[];
  readonly selected: Value;
  readonly onSelect: (value: Value) => void;
}) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        backgroundColor: tokens.colors.surfaceAlt,
        borderRadius: tokens.radius.medium,
        flexDirection: 'row',
        gap: tokens.space.xs,
        padding: tokens.space.xs,
      }}
    >
      {options.map(([value, label]) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: selected === value }}
          key={value}
          onPress={() => onSelect(value)}
          style={{
            alignItems: 'center',
            backgroundColor: selected === value ? tokens.colors.surface : 'transparent',
            borderRadius: tokens.radius.small,
            flex: 1,
            minHeight: tokens.sizing.minimumTarget,
            justifyContent: 'center',
            paddingHorizontal: tokens.space.sm,
            paddingVertical: tokens.space.sm,
          }}
        >
          <Text
            style={[
              tokens.typography.label,
              { color: selected === value ? tokens.colors.primary : tokens.colors.textSubtle },
            ]}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function ChoiceChip({
  label,
  selected,
  onPress,
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        alignItems: 'center',
        backgroundColor: selected ? tokens.colors.primary : tokens.colors.surfaceAlt,
        borderRadius: tokens.radius.full,
        minHeight: tokens.sizing.minimumTarget,
        minWidth: tokens.sizing.minimumTarget,
        justifyContent: 'center',
        paddingHorizontal: tokens.space.md,
      }}
    >
      <Text
        style={[
          tokens.typography.label,
          { color: selected ? tokens.colors.primaryContrast : tokens.colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function QuantityPicker({
  value,
  maximum,
  onChange,
}: {
  readonly value: number;
  readonly maximum: number;
  readonly onChange: (delta: number) => void;
}) {
  const { tokens } = useTheme();
  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: tokens.space.xs }}>
      <ChoiceChip label="−" selected={false} onPress={() => onChange(-1)} />
      <Text
        style={[
          tokens.typography.bodyStrong,
          { color: tokens.colors.text, minWidth: 24, textAlign: 'center' },
        ]}
      >
        {value}
      </Text>
      <Pressable
        accessibilityLabel="+"
        accessibilityRole="button"
        disabled={value >= maximum}
        onPress={() => onChange(1)}
        style={{
          alignItems: 'center',
          backgroundColor: tokens.colors.primary,
          borderRadius: tokens.radius.full,
          minHeight: tokens.sizing.minimumTarget,
          minWidth: tokens.sizing.minimumTarget,
          justifyContent: 'center',
          opacity: value >= maximum ? 0.4 : 1,
        }}
      >
        <Text style={[tokens.typography.label, { color: tokens.colors.primaryContrast }]}>+</Text>
      </Pressable>
    </View>
  );
}

function ReviewLine({
  label,
  value,
  emphasis = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly emphasis?: boolean;
}) {
  const { tokens } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: tokens.space.md }}>
      <Text
        style={[
          emphasis ? tokens.typography.bodyStrong : tokens.typography.body,
          { color: tokens.colors.textSubtle },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          emphasis ? tokens.typography.subtitle : tokens.typography.bodyStrong,
          { color: emphasis ? tokens.colors.primary : tokens.colors.text },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function inputToMinor(value: string): number {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+([.]\d{0,2})?$/.test(normalized)) return 0;
  const [whole, fractional = ''] = normalized.split('.');
  const amount = Number(whole) * 100 + Number(fractional.padEnd(2, '0'));
  return Number.isSafeInteger(amount) ? amount : 0;
}

function minorToInput(value: number): string {
  return (value / 100).toFixed(2);
}

function quickCashAmounts(amountMinor: number): readonly number[] {
  const candidates = [
    amountMinor,
    Math.ceil(amountMinor / 500) * 500,
    Math.ceil(amountMinor / 1000) * 1000,
    Math.ceil(amountMinor / 5000) * 5000,
  ];
  return [...new Set(candidates)].filter((candidate) => candidate >= amountMinor);
}

function formatMoney(amountMinor: number, currencyCode: string, language: Language): string {
  return new Intl.NumberFormat(
    language === 'tr' ? 'tr-TR' : language === 'bg' ? 'bg-BG' : 'en-US',
    { style: 'currency', currency: currencyCode },
  ).format(amountMinor / 100);
}

function paymentCopy(language: Language) {
  const translations = {
    tr: {
      takePayment: 'Ödeme al',
      reviewPayment: 'Ödemeyi gözden geçir',
      close: 'Kapat',
      remaining: 'Kalan',
      onlineRequired: 'Ödeme için bağlantı gerekli',
      onlineRequiredDetail: 'Çift tahsilatı önlemek için ödeme sunucuda kesinleştirilir.',
      amount: 'Tutar',
      items: 'Ürün / adet',
      equal: 'Eşit böl',
      paymentAmount: 'Ödenecek tutar',
      people: 'Kişi sayısı',
      oneShare: 'Bir pay:',
      available: 'Kalan adet',
      method: 'Yöntem',
      card: 'Kart',
      cash: 'Nakit',
      mixed: 'Karışık',
      cashPart: 'Nakit kısmı',
      cashReceived: 'Alınan nakit',
      change: 'Para üstü',
      quickCash: 'Hızlı nakit',
      check: 'Hesap',
      selected: 'Tahsil edilecek',
      afterPayment: 'İşlem sonrası kalan',
      serverNotice: 'Tutar sunucuda tekrar hesaplanır ve tek işlem olarak kesinleşir.',
      exceedsRemaining: 'Seçilen tutar kalan hesaptan fazla.',
      back: 'Geri',
      confirmPayment: 'Ödemeyi kesinleştir',
      paymentFailed: 'Ödeme kesinleştirilemedi.',
    },
    bg: {
      takePayment: 'Плащане',
      reviewPayment: 'Преглед на плащането',
      close: 'Затвори',
      remaining: 'Остава',
      onlineRequired: 'Нужна е връзка',
      onlineRequiredDetail: 'Плащането се потвърждава на сървъра, за да няма двойно плащане.',
      amount: 'Сума',
      items: 'Артикули',
      equal: 'По равно',
      paymentAmount: 'Сума за плащане',
      people: 'Брой хора',
      oneShare: 'Един дял:',
      available: 'Оставащо количество',
      method: 'Метод',
      card: 'Карта',
      cash: 'В брой',
      mixed: 'Смесено',
      cashPart: 'Част в брой',
      cashReceived: 'Получени пари',
      change: 'Ресто',
      quickCash: 'Бърз избор на сума',
      check: 'Сметка',
      selected: 'За плащане',
      afterPayment: 'Остава след плащане',
      serverNotice: 'Сумата се преизчислява и потвърждава атомарно на сървъра.',
      exceedsRemaining: 'Избраната сума е по-голяма от остатъка.',
      back: 'Назад',
      confirmPayment: 'Потвърди плащането',
      paymentFailed: 'Плащането не бе потвърдено.',
    },
    en: {
      takePayment: 'Take payment',
      reviewPayment: 'Review payment',
      close: 'Close',
      remaining: 'Remaining',
      onlineRequired: 'Connection required',
      onlineRequiredDetail: 'Payments are confirmed on the server to prevent double charging.',
      amount: 'Amount',
      items: 'Items / qty',
      equal: 'Equal split',
      paymentAmount: 'Amount to pay',
      people: 'Number of people',
      oneShare: 'One share:',
      available: 'Available quantity',
      method: 'Method',
      card: 'Card',
      cash: 'Cash',
      mixed: 'Mixed',
      cashPart: 'Cash part',
      cashReceived: 'Cash received',
      change: 'Change',
      quickCash: 'Quick cash',
      check: 'Check',
      selected: 'Charge now',
      afterPayment: 'Remaining after payment',
      serverNotice: 'The server recalculates and confirms the amount atomically.',
      exceedsRemaining: 'The selected amount exceeds the remaining balance.',
      back: 'Back',
      confirmPayment: 'Confirm payment',
      paymentFailed: 'Payment could not be confirmed.',
    },
  };
  return translations[language] ?? translations.en;
}
