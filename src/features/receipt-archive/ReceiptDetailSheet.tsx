import React, { useState } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ServiceButton, ServiceSurface, ServiceTextField } from '../../design-system';
import { Language } from '../../i18n';
import { ReceiptArchiveEntry } from './receiptArchiveGateway';
import { ReceiptTimelineEntry } from './receiptTimelineGateway';

export function ReceiptDetailSheet({
  entry,
  language,
  onClose,
  managerCanReopen = false,
  reopening = false,
  onReopen,
  timeline = [],
  timelineLoading = false,
}: {
  readonly entry: ReceiptArchiveEntry;
  readonly language: Language;
  readonly onClose: () => void;
  readonly managerCanReopen?: boolean;
  readonly reopening?: boolean;
  readonly onReopen?: (reason: string, pin: string) => void;
  readonly timeline?: readonly ReceiptTimelineEntry[];
  readonly timelineLoading?: boolean;
}) {
  const { tokens } = useTheme();
  const copy = detailCopy(language);
  const { receipt } = entry;
  const [reopenReason, setReopenReason] = useState('');
  const [reopenPin, setReopenPin] = useState('');
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      transparent
      visible
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
          <ScrollView contentContainerStyle={{ gap: tokens.space.md, padding: tokens.space.lg }}>
            <View>
              <Text style={[tokens.typography.title, { color: tokens.colors.text }]}>
                {receipt.snapshot.tableLabel}
              </Text>
              <Text style={[tokens.typography.body, { color: tokens.colors.textSubtle }]}>
                {receipt.receiptNumber}
              </Text>
            </View>
            <ServiceSurface style={{ gap: tokens.space.xs }} variant="outlined">
              <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
                {copy.opened}: {formatTimelineAt(receipt.snapshot.openedAt, language)}
              </Text>
              <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
                {copy.closed}: {formatTimelineAt(receipt.issuedAt, language)}
              </Text>
            </ServiceSurface>
            {receipt.snapshot.checks.map((check) => (
              <ServiceSurface key={check.checkId} style={{ gap: tokens.space.sm }}>
                <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
                  {check.name}
                </Text>
                {check.note ? (
                  <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
                    {check.note}
                  </Text>
                ) : null}
                {check.items.map((item) => (
                  <View
                    key={item.orderItemId}
                    style={{
                      borderBottomColor: tokens.colors.borderLight,
                      borderBottomWidth: 1,
                      paddingBottom: tokens.space.sm,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text
                        style={[
                          tokens.typography.bodyStrong,
                          { color: tokens.colors.text, flex: 1 },
                        ]}
                      >
                        {item.quantity}× {item.name}
                      </Text>
                      <Text style={[tokens.typography.label, { color: tokens.colors.text }]}>
                        {money(item.lineTotalMinor, receipt.currencyCode, language)}
                      </Text>
                    </View>
                    {item.modifiers.map((modifier, index) => (
                      <Text
                        key={`${modifier.name}-${index}`}
                        style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}
                      >
                        + {modifier.name}
                      </Text>
                    ))}
                    {item.createdAt ? (
                      <Text style={[tokens.typography.caption, { color: tokens.colors.textMuted }]}>
                        {item.createdByDisplayName ? `${item.createdByDisplayName} · ` : ''}
                        {formatTimelineAt(item.createdAt, language)}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </ServiceSurface>
            ))}
            <ServiceSurface style={{ gap: tokens.space.sm }} variant="outlined">
              <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
                {copy.payments}
              </Text>
              {receipt.snapshot.payments.map((payment) => (
                <View key={payment.paymentId} style={{ gap: tokens.space.xxs }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[tokens.typography.body, { color: tokens.colors.textSubtle }]}>
                      {payment.method === 'cash' ? copy.cash : copy.card} ·{' '}
                      {payment.createdByDisplayName}
                    </Text>
                    <Text style={[tokens.typography.label, { color: tokens.colors.text }]}>
                      {money(payment.amountMinor, receipt.currencyCode, language)}
                    </Text>
                  </View>
                  {payment.tenderedMinor !== undefined ? (
                    <Text style={[tokens.typography.caption, { color: tokens.colors.textMuted }]}>
                      {copy.tendered}:{' '}
                      {money(payment.tenderedMinor, receipt.currencyCode, language)}
                      {payment.changeMinor !== undefined
                        ? ` · ${copy.change}: ${money(payment.changeMinor, receipt.currencyCode, language)}`
                        : ''}
                    </Text>
                  ) : null}
                </View>
              ))}
              <View
                style={{
                  borderTopColor: tokens.colors.border,
                  borderTopWidth: 1,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingTop: tokens.space.sm,
                }}
              >
                <Text style={[tokens.typography.bodyStrong, { color: tokens.colors.text }]}>
                  {copy.total}
                </Text>
                <Text style={[tokens.typography.money, { color: tokens.colors.primary }]}>
                  {money(receipt.totalMinor, receipt.currencyCode, language)}
                </Text>
              </View>
            </ServiceSurface>
            <Text style={[tokens.typography.caption, { color: tokens.colors.textMuted }]}>
              {copy.waiters}: {receipt.snapshot.waiterDisplayNames.join(', ')}
            </Text>
            <ServiceSurface style={{ gap: tokens.space.sm }} variant="outlined">
              <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
                {copy.timeline}
              </Text>
              {timelineLoading ? (
                <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
                  {copy.timelineLoading}
                </Text>
              ) : timeline.length === 0 ? (
                <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
                  {copy.noTimeline}
                </Text>
              ) : (
                timeline.map((event, index) => (
                  <View key={`${event.occurredAt}-${event.action}-${index}`}>
                    <Text style={[tokens.typography.bodyStrong, { color: tokens.colors.text }]}>
                      {formatTimelineAt(event.occurredAt, language)} · {event.action}
                    </Text>
                    <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
                      {event.actorDisplayName}
                      {event.reason ? ` · ${event.reason}` : ''}
                    </Text>
                  </View>
                ))
              )}
            </ServiceSurface>
            {managerCanReopen && onReopen ? (
              <ServiceSurface style={{ gap: tokens.space.sm }} variant="outlined">
                <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
                  {copy.reopen}
                </Text>
                <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
                  {copy.reopenHint}
                </Text>
                <ServiceTextField
                  label={copy.reopenReason}
                  maxLength={500}
                  onChangeText={setReopenReason}
                  placeholder={copy.reopenPlaceholder}
                  value={reopenReason}
                />
                <ServiceTextField
                  keyboardType="number-pad"
                  label={copy.managerPin}
                  maxLength={6}
                  onChangeText={setReopenPin}
                  placeholder={copy.managerPinPlaceholder}
                  secureTextEntry
                  value={reopenPin}
                />
                <ServiceButton
                  disabled={
                    reopenReason.trim().length < 3 || !/^[0-9]{4}([0-9]{2})?$/.test(reopenPin)
                  }
                  icon="lock-open-outline"
                  label={copy.reopen}
                  loading={reopening}
                  onPress={() => onReopen(reopenReason.trim(), reopenPin)}
                  size="large"
                  variant="outline"
                />
              </ServiceSurface>
            ) : null}
            <ServiceButton label={copy.close} onPress={onClose} size="compact" />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function money(amountMinor: number, currency: string, language: Language): string {
  const formatter = new Intl.NumberFormat(
    language === 'tr' ? 'tr-TR' : language === 'bg' ? 'bg-BG' : 'en-US',
    { currency, style: 'currency' },
  );
  const fractionDigits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return formatter.format(amountMinor / 10 ** fractionDigits);
}

function detailCopy(language: Language) {
  if (language === 'tr') {
    return {
      payments: 'Ödemeler',
      cash: 'Nakit',
      card: 'Kart',
      tendered: 'Alınan nakit',
      change: 'Para üstü',
      total: 'Toplam',
      opened: 'Açılış',
      closed: 'Kapanış',
      waiters: 'Garsonlar',
      reopen: 'Siparişi yeniden aç',
      reopenHint:
        'Yeni düzeltme siparişi açılır; eski fiş değişmez. Yönetici gerekçesi zorunludur.',
      reopenReason: 'Yeniden açma gerekçesi',
      reopenPlaceholder: 'Örn. yanlış ürün düzeltmesi',
      managerPin: 'Yönetici PIN’i',
      managerPinPlaceholder: '4 veya 6 hane',
      timeline: 'İşlem geçmişi',
      timelineLoading: 'Geçmiş yükleniyor…',
      noTimeline: 'Bu fiş için işlem geçmişi bulunamadı.',
      close: 'Kapat',
    };
  }
  if (language === 'bg') {
    return {
      payments: 'Плащания',
      cash: 'В брой',
      card: 'Карта',
      tendered: 'Получени пари',
      change: 'Ресто',
      total: 'Общо',
      opened: 'Отваряне',
      closed: 'Затваряне',
      waiters: 'Сервитьори',
      reopen: 'Отвори поръчката отново',
      reopenHint: 'Старият документ остава непроменен. Изисква се причина от управител.',
      reopenReason: 'Причина за повторно отваряне',
      reopenPlaceholder: 'Напр. корекция на грешен продукт',
      managerPin: 'PIN на управителя',
      managerPinPlaceholder: '4 или 6 цифри',
      timeline: 'История на действията',
      timelineLoading: 'Историята се зарежда…',
      noTimeline: 'Няма история за тази разписка.',
      close: 'Затвори',
    };
  }
  return {
    payments: 'Payments',
    cash: 'Cash',
    card: 'Card',
    tendered: 'Cash received',
    change: 'Change',
    total: 'Total',
    opened: 'Opened',
    closed: 'Closed',
    waiters: 'Waiters',
    reopen: 'Reopen order',
    reopenHint:
      'A new correction check opens; the old receipt remains immutable. A manager reason is required.',
    reopenReason: 'Reopen reason',
    reopenPlaceholder: 'E.g. correcting a wrong item',
    managerPin: 'Manager PIN',
    managerPinPlaceholder: '4 or 6 digits',
    timeline: 'Activity timeline',
    timelineLoading: 'Loading activity…',
    noTimeline: 'No activity was found for this receipt.',
    close: 'Close',
  };
}

function formatTimelineAt(value: string, language: Language): string {
  return new Intl.DateTimeFormat(
    language === 'tr' ? 'tr-TR' : language === 'bg' ? 'bg-BG' : 'en-GB',
    { dateStyle: 'short', timeStyle: 'short' },
  ).format(new Date(value));
}
