import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ServiceButton, ServiceSurface } from '../../design-system';
import { Receipt } from '../../domain';
import { Language } from '../../i18n';

export interface ReceiptReadySheetProps {
  readonly receipt: Receipt;
  readonly language: Language;
  readonly busy: boolean;
  readonly onClose: () => void;
  readonly onDownload: () => void;
  readonly onShare: () => void;
}

export function ReceiptReadySheet({
  receipt,
  language,
  busy,
  onClose,
  onDownload,
  onShare,
}: ReceiptReadySheetProps) {
  const { tokens } = useTheme();
  const copy = readyCopy(language);
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
            maxWidth: 620,
            padding: tokens.space.lg,
            width: '100%',
          }}
        >
          <View style={{ alignItems: 'flex-end' }}>
            <Pressable
              accessibilityLabel={copy.later}
              accessibilityRole="button"
              disabled={busy}
              onPress={onClose}
              style={{ padding: tokens.space.sm }}
            >
              <Ionicons color={tokens.colors.text} name="close" size={26} />
            </Pressable>
          </View>
          <View style={{ alignItems: 'center', gap: tokens.space.sm }}>
            <View
              style={{
                alignItems: 'center',
                backgroundColor: tokens.colors.state.delivered.bg,
                borderRadius: tokens.radius.full,
                height: 72,
                justifyContent: 'center',
                width: 72,
              }}
            >
              <Ionicons
                color={tokens.colors.state.delivered.text}
                name="receipt-outline"
                size={36}
              />
            </View>
            <Text style={[tokens.typography.title, { color: tokens.colors.text }]}>
              {copy.ready}
            </Text>
            <Text style={[tokens.typography.body, { color: tokens.colors.textSubtle }]}>
              {receipt.receiptNumber}
            </Text>
          </View>
          <ServiceSurface
            style={{
              alignItems: 'center',
              gap: tokens.space.xs,
              marginVertical: tokens.space.lg,
              padding: tokens.space.lg,
            }}
          >
            <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
              {receipt.snapshot.tableLabel} · {receipt.snapshot.checks[0]?.name}
            </Text>
            <Text style={[tokens.typography.money, { color: tokens.colors.primary }]}>
              {formatMinorCurrency(
                receipt.totalMinor,
                receipt.currencyCode,
                language === 'tr' ? 'tr-TR' : language === 'bg' ? 'bg-BG' : 'en-US',
              )}
            </Text>
            <Text style={[tokens.typography.caption, { color: tokens.colors.textMuted }]}>
              {copy.privateNotice}
            </Text>
          </ServiceSurface>
          <View style={{ gap: tokens.space.sm }}>
            <ServiceButton
              disabled={busy}
              icon="download-outline"
              label={copy.download}
              loading={busy}
              onPress={onDownload}
              size="large"
            />
            <ServiceButton
              disabled={busy}
              icon="share-social-outline"
              label={copy.share}
              onPress={onShare}
              size="large"
              variant="outline"
            />
            <ServiceButton disabled={busy} label={copy.later} onPress={onClose} variant="ghost" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function formatMinorCurrency(amountMinor: number, currencyCode: string, locale: string): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
  });
  const fractionDigits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return formatter.format(amountMinor / 10 ** fractionDigits);
}

function readyCopy(language: Language) {
  if (language === 'tr') {
    return {
      ready: 'Fiş hazır',
      download: 'PDF indir',
      share: 'Paylaş',
      later: 'Sonra',
      privateNotice: 'PDF özel depoda saklanır ve yalnız yetkili şube kullanıcıları erişebilir.',
    };
  }
  if (language === 'bg') {
    return {
      ready: 'Разписката е готова',
      download: 'Изтегли PDF',
      share: 'Сподели',
      later: 'По-късно',
      privateNotice: 'PDF файлът е частен и е достъпен само за упълномощени потребители.',
    };
  }
  return {
    ready: 'Receipt ready',
    download: 'Download PDF',
    share: 'Share',
    later: 'Later',
    privateNotice: 'The PDF is private and available only to authorized branch members.',
  };
}
