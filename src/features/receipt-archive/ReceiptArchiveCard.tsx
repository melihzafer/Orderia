import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ServiceButton, ServiceStatusPill, ServiceSurface } from '../../design-system';
import { Language } from '../../i18n';
import { ReceiptArchiveEntry } from './receiptArchiveGateway';

export interface ReceiptArchiveCardProps {
  readonly entry: ReceiptArchiveEntry;
  readonly language: Language;
  readonly busy?: boolean;
  readonly onDetail: () => void;
  readonly onDownload: () => void;
  readonly onShare: () => void;
}

export function ReceiptArchiveCard({
  entry,
  language,
  busy = false,
  onDetail,
  onDownload,
  onShare,
}: ReceiptArchiveCardProps) {
  const { tokens } = useTheme();
  const copy = cardCopy(language);
  const { receipt } = entry;
  const checkNames = receipt.snapshot.checks.map((check) => check.name).join(', ');
  const waiters = receipt.snapshot.waiterDisplayNames.join(', ') || copy.unknownWaiter;

  return (
    <ServiceSurface
      style={{
        gap: tokens.space.md,
        marginBottom: tokens.space.sm,
        padding: tokens.space.md,
      }}
      variant="outlined"
    >
      <View
        style={{
          alignItems: 'flex-start',
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1, paddingRight: tokens.space.sm }}>
          <Text style={[tokens.typography.bodyStrong, { color: tokens.colors.text }]}>
            {receipt.snapshot.tableLabel} · {checkNames}
          </Text>
          <Text
            style={[
              tokens.typography.caption,
              { color: tokens.colors.textSubtle, marginTop: tokens.space.xxs },
            ]}
          >
            {formatIssuedAt(receipt.issuedAt, entry.branchTimezone, language)}
          </Text>
        </View>
        <Text style={[tokens.typography.money, { color: tokens.colors.primary }]}>
          {formatMoney(receipt.totalMinor, receipt.currencyCode, language)}
        </Text>
      </View>

      <View style={{ gap: tokens.space.xs }}>
        <MetaRow icon="receipt-outline" value={receipt.receiptNumber} />
        <MetaRow icon="person-outline" value={waiters} />
        <MetaRow
          icon="card-outline"
          value={[
            ...new Set(receipt.snapshot.payments.map((payment) => copy[payment.method])),
          ].join(' + ')}
        />
      </View>

      {entry.hasAdjustment || receipt.status !== 'issued' ? (
        <ServiceStatusPill icon="alert-circle-outline" label={copy.adjusted} tone="warning" />
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs }}>
        <ServiceButton
          disabled={busy}
          icon="eye-outline"
          label={copy.detail}
          onPress={onDetail}
          style={{ flexGrow: 1 }}
          variant="ghost"
        />
        <ServiceButton
          disabled={busy || !receipt.pdfStoragePath}
          icon="download-outline"
          label={copy.download}
          loading={busy}
          onPress={onDownload}
          style={{ flexGrow: 1 }}
          variant="outline"
        />
        <ServiceButton
          disabled={busy || !receipt.pdfStoragePath}
          icon="share-social-outline"
          label={copy.share}
          onPress={onShare}
          style={{ flexGrow: 1 }}
          variant="outline"
        />
      </View>
    </ServiceSurface>
  );
}

function MetaRow({
  icon,
  value,
}: {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly value: string;
}) {
  const { tokens } = useTheme();
  return (
    <View style={{ alignItems: 'center', flexDirection: 'row' }}>
      <Ionicons color={tokens.colors.textMuted} name={icon} size={16} />
      <Text
        numberOfLines={2}
        style={[
          tokens.typography.caption,
          { color: tokens.colors.textSubtle, marginLeft: tokens.space.xs },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function formatIssuedAt(value: string, timeZone: string, language: Language): string {
  return new Intl.DateTimeFormat(locale(language), {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(value));
}

function formatMoney(amountMinor: number, currency: string, language: Language): string {
  const formatter = new Intl.NumberFormat(locale(language), {
    currency,
    style: 'currency',
  });
  const fractionDigits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return formatter.format(amountMinor / 10 ** fractionDigits);
}

function locale(language: Language): string {
  return language === 'tr' ? 'tr-TR' : language === 'bg' ? 'bg-BG' : 'en-US';
}

function cardCopy(language: Language) {
  if (language === 'tr') {
    return {
      detail: 'Detay',
      download: 'PDF indir',
      share: 'Paylaş',
      adjusted: 'Düzeltme içeriyor',
      unknownWaiter: 'Garson bilinmiyor',
      cash: 'Nakit',
      card: 'Kart',
      mixed_adjustment: 'Düzeltme',
    };
  }
  if (language === 'bg') {
    return {
      detail: 'Детайли',
      download: 'PDF',
      share: 'Сподели',
      adjusted: 'Има корекция',
      unknownWaiter: 'Неизвестен сервитьор',
      cash: 'В брой',
      card: 'Карта',
      mixed_adjustment: 'Корекция',
    };
  }
  return {
    detail: 'Details',
    download: 'Download PDF',
    share: 'Share',
    adjusted: 'Contains adjustment',
    unknownWaiter: 'Unknown waiter',
    cash: 'Cash',
    card: 'Card',
    mixed_adjustment: 'Adjustment',
  };
}
