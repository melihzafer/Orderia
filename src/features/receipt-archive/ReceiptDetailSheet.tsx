import React from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ServiceButton, ServiceSurface } from '../../design-system';
import { Language } from '../../i18n';
import { ReceiptArchiveEntry } from './receiptArchiveGateway';

export function ReceiptDetailSheet({
  entry,
  language,
  onClose,
}: {
  readonly entry: ReceiptArchiveEntry;
  readonly language: Language;
  readonly onClose: () => void;
}) {
  const { tokens } = useTheme();
  const copy = detailCopy(language);
  const { receipt } = entry;
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
            {receipt.snapshot.checks.map((check) => (
              <ServiceSurface key={check.checkId} style={{ gap: tokens.space.sm }}>
                <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
                  {check.name}
                </Text>
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
                  </View>
                ))}
              </ServiceSurface>
            ))}
            <ServiceSurface style={{ gap: tokens.space.sm }} variant="outlined">
              <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
                {copy.payments}
              </Text>
              {receipt.snapshot.payments.map((payment) => (
                <View
                  key={payment.paymentId}
                  style={{ flexDirection: 'row', justifyContent: 'space-between' }}
                >
                  <Text style={[tokens.typography.body, { color: tokens.colors.textSubtle }]}>
                    {payment.method === 'cash' ? copy.cash : copy.card} ·{' '}
                    {payment.createdByDisplayName}
                  </Text>
                  <Text style={[tokens.typography.label, { color: tokens.colors.text }]}>
                    {money(payment.amountMinor, receipt.currencyCode, language)}
                  </Text>
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
            <ServiceButton label={copy.close} onPress={onClose} size="large" />
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
      total: 'Toplam',
      waiters: 'Garsonlar',
      close: 'Kapat',
    };
  }
  if (language === 'bg') {
    return {
      payments: 'Плащания',
      cash: 'В брой',
      card: 'Карта',
      total: 'Общо',
      waiters: 'Сервитьори',
      close: 'Затвори',
    };
  }
  return {
    payments: 'Payments',
    cash: 'Cash',
    card: 'Card',
    total: 'Total',
    waiters: 'Waiters',
    close: 'Close',
  };
}
