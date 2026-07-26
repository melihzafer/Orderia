import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ServiceStatusPill, ServiceSurface } from '../../design-system';
import { Language } from '../../i18n';
import { formatMinor } from './DailyRevenueBars';
import { WaiterPerformanceRow } from './managerReportGateway';

export function WaiterPerformanceCard({
  currencyCode,
  language,
  waiter,
}: {
  readonly currencyCode: string;
  readonly language: Language;
  readonly waiter: WaiterPerformanceRow;
}) {
  const { tokens } = useTheme();
  const copy = waiterCopy(language);
  return (
    <ServiceSurface style={{ gap: tokens.space.md }} variant="outlined">
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
            {waiter.displayName}
          </Text>
          <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
            {copy.contribution}
          </Text>
        </View>
        <Text style={[tokens.typography.money, { color: tokens.colors.primary }]}>
          {formatMinor(waiter.contributedRevenueMinor, currencyCode, language)}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm }}>
        <Metric label={copy.items} value={`${waiter.itemRows}`} />
        <Metric label={copy.tables} value={`${waiter.tablesServed}`} />
        <Metric
          label={copy.payments}
          value={formatMinor(waiter.paymentHandledMinor, currencyCode, language)}
        />
        <Metric label={copy.helped} value={`${waiter.helpedTableCount}`} />
        <Metric label={copy.observed} value={`~${waiter.observedActiveMinutes} ${copy.minute}`} />
      </View>
      {waiter.cancellationCount > 0 ? (
        <ServiceStatusPill
          icon="close-circle-outline"
          label={`${waiter.cancellationCount} ${copy.cancellations} · ${formatMinor(
            waiter.cancellationValueMinor,
            currencyCode,
            language,
          )}`}
          tone="warning"
        />
      ) : null}
    </ServiceSurface>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  const { tokens } = useTheme();
  return (
    <View style={{ flexBasis: 110, flexGrow: 1 }}>
      <Text style={[tokens.typography.bodyStrong, { color: tokens.colors.text }]}>{value}</Text>
      <Text style={[tokens.typography.caption, { color: tokens.colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function waiterCopy(language: Language) {
  if (language === 'tr') {
    return {
      contribution: 'Satır bazlı ciro katkısı',
      items: 'Ürün satırı',
      tables: 'Servis verilen masa',
      payments: 'Alınan ödeme',
      helped: 'Yardım edilen masa',
      observed: 'Gözlenen süre',
      minute: 'dk',
      cancellations: 'iptal',
    };
  }
  if (language === 'bg') {
    return {
      contribution: 'Принос към оборота по артикули',
      items: 'Редове',
      tables: 'Обслужени маси',
      payments: 'Обработени плащания',
      helped: 'Помогнати маси',
      observed: 'Наблюдавано време',
      minute: 'мин',
      cancellations: 'анулирания',
    };
  }
  return {
    contribution: 'Item-attributed revenue',
    items: 'Item rows',
    tables: 'Tables served',
    payments: 'Payments handled',
    helped: 'Tables helped',
    observed: 'Observed time',
    minute: 'min',
    cancellations: 'cancellations',
  };
}
