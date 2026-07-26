import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ServiceButton, ServiceTextField } from '../../design-system';
import { Language } from '../../i18n';
import { ReceiptArchiveFilterDraft } from './receiptArchiveFilters';

export interface ReceiptArchiveFilterSheetProps {
  readonly draft: ReceiptArchiveFilterDraft;
  readonly language: Language;
  readonly visible: boolean;
  readonly onApply: () => void;
  readonly onChange: (draft: ReceiptArchiveFilterDraft) => void;
  readonly onClose: () => void;
  readonly onReset: () => void;
}

export function ReceiptArchiveFilterSheet({
  draft,
  language,
  visible,
  onApply,
  onChange,
  onClose,
  onReset,
}: ReceiptArchiveFilterSheetProps) {
  const { tokens } = useTheme();
  const copy = filterCopy(language);
  const update = <Key extends keyof ReceiptArchiveFilterDraft>(
    key: Key,
    value: ReceiptArchiveFilterDraft[Key],
  ) => onChange({ ...draft, [key]: value });

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
            maxWidth: 720,
            width: '100%',
          }}
        >
          <View
            style={{
              alignItems: 'center',
              borderBottomColor: tokens.colors.border,
              borderBottomWidth: 1,
              flexDirection: 'row',
              justifyContent: 'space-between',
              padding: tokens.space.md,
            }}
          >
            <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
              {copy.title}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onReset}
              style={{ minHeight: 48, justifyContent: 'center' }}
            >
              <Text style={[tokens.typography.label, { color: tokens.colors.primary }]}>
                {copy.reset}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ gap: tokens.space.md, padding: tokens.space.md }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm }}>
              <ServiceTextField
                autoCapitalize="none"
                containerStyle={{ flexBasis: 220, flexGrow: 1 }}
                label={copy.dateFrom}
                onChangeText={(value) => update('dateFrom', value)}
                placeholder="YYYY-MM-DD"
                value={draft.dateFrom}
              />
              <ServiceTextField
                autoCapitalize="none"
                containerStyle={{ flexBasis: 220, flexGrow: 1 }}
                label={copy.dateTo}
                onChangeText={(value) => update('dateTo', value)}
                placeholder="YYYY-MM-DD"
                value={draft.dateTo}
              />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm }}>
              <ServiceTextField
                autoCapitalize="none"
                containerStyle={{ flexBasis: 220, flexGrow: 1 }}
                label={copy.timeFrom}
                onChangeText={(value) => update('timeFrom', value)}
                placeholder="13:00"
                value={draft.timeFrom}
              />
              <ServiceTextField
                autoCapitalize="none"
                containerStyle={{ flexBasis: 220, flexGrow: 1 }}
                label={copy.timeTo}
                onChangeText={(value) => update('timeTo', value)}
                placeholder="14:00"
                value={draft.timeTo}
              />
            </View>
            <ServiceTextField
              label={copy.waiter}
              onChangeText={(value) => update('waiterQuery', value)}
              placeholder={copy.waiterPlaceholder}
              value={draft.waiterQuery}
            />
            <ChoiceGroup
              label={copy.payment}
              onSelect={(value) => update('paymentMethod', value)}
              options={[
                ['all', copy.all],
                ['cash', copy.cash],
                ['card', copy.card],
                ['mixed_adjustment', copy.adjustmentPayment],
              ]}
              selected={draft.paymentMethod}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm }}>
              <ServiceTextField
                containerStyle={{ flexBasis: 220, flexGrow: 1 }}
                inputMode="decimal"
                label={copy.amountMin}
                onChangeText={(value) => update('amountMin', value)}
                placeholder="0.00"
                value={draft.amountMin}
              />
              <ServiceTextField
                containerStyle={{ flexBasis: 220, flexGrow: 1 }}
                inputMode="decimal"
                label={copy.amountMax}
                onChangeText={(value) => update('amountMax', value)}
                placeholder="100.00"
                value={draft.amountMax}
              />
            </View>
            <ChoiceGroup
              label={copy.adjustments}
              onSelect={(value) => update('adjustment', value)}
              options={[
                ['all', copy.all],
                ['with', copy.withAdjustment],
                ['without', copy.withoutAdjustment],
              ]}
              selected={draft.adjustment}
            />
          </ScrollView>

          <View
            style={{
              borderTopColor: tokens.colors.border,
              borderTopWidth: 1,
              flexDirection: 'row',
              gap: tokens.space.sm,
              padding: tokens.space.md,
            }}
          >
            <ServiceButton
              label={copy.cancel}
              onPress={onClose}
              style={{ flex: 1 }}
              variant="ghost"
            />
            <ServiceButton label={copy.apply} onPress={onApply} style={{ flex: 2 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ChoiceGroup<Value extends string>({
  label,
  options,
  selected,
  onSelect,
}: {
  readonly label: string;
  readonly options: readonly (readonly [Value, string])[];
  readonly selected: Value;
  readonly onSelect: (value: Value) => void;
}) {
  const { tokens } = useTheme();
  return (
    <View>
      <Text
        style={[
          tokens.typography.label,
          { color: tokens.colors.text, marginBottom: tokens.space.xs },
        ]}
      >
        {label}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs }}>
        {options.map(([value, optionLabel]) => {
          const active = value === selected;
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onPress={() => onSelect(value)}
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
                {optionLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function filterCopy(language: Language) {
  if (language === 'tr') {
    return {
      title: 'Arşiv filtreleri',
      reset: 'Sıfırla',
      dateFrom: 'Başlangıç tarihi',
      dateTo: 'Bitiş tarihi',
      timeFrom: 'Başlangıç saati',
      timeTo: 'Bitiş saati',
      waiter: 'Garson',
      waiterPlaceholder: 'İsimle ara',
      payment: 'Ödeme yöntemi',
      all: 'Tümü',
      cash: 'Nakit',
      card: 'Kart',
      adjustmentPayment: 'Düzeltme',
      amountMin: 'En az tutar',
      amountMax: 'En çok tutar',
      adjustments: 'Düzeltme durumu',
      withAdjustment: 'Düzeltme var',
      withoutAdjustment: 'Düzeltme yok',
      cancel: 'Vazgeç',
      apply: 'Sonuçları göster',
    };
  }
  if (language === 'bg') {
    return {
      title: 'Филтри на архива',
      reset: 'Изчисти',
      dateFrom: 'Начална дата',
      dateTo: 'Крайна дата',
      timeFrom: 'Начален час',
      timeTo: 'Краен час',
      waiter: 'Сервитьор',
      waiterPlaceholder: 'Търсене по име',
      payment: 'Начин на плащане',
      all: 'Всички',
      cash: 'В брой',
      card: 'Карта',
      adjustmentPayment: 'Корекция',
      amountMin: 'Мин. сума',
      amountMax: 'Макс. сума',
      adjustments: 'Корекции',
      withAdjustment: 'С корекция',
      withoutAdjustment: 'Без корекция',
      cancel: 'Отказ',
      apply: 'Покажи резултатите',
    };
  }
  return {
    title: 'Archive filters',
    reset: 'Reset',
    dateFrom: 'Start date',
    dateTo: 'End date',
    timeFrom: 'Start time',
    timeTo: 'End time',
    waiter: 'Waiter',
    waiterPlaceholder: 'Search by name',
    payment: 'Payment method',
    all: 'All',
    cash: 'Cash',
    card: 'Card',
    adjustmentPayment: 'Adjustment',
    amountMin: 'Minimum amount',
    amountMax: 'Maximum amount',
    adjustments: 'Adjustment status',
    withAdjustment: 'Has adjustment',
    withoutAdjustment: 'No adjustment',
    cancel: 'Cancel',
    apply: 'Show results',
  };
}
