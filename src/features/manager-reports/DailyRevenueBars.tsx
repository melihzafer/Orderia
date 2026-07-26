import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Language } from '../../i18n';
import { ManagerReportDay } from './managerReportGateway';

export function DailyRevenueBars({
  currencyCode,
  days,
  language,
  selectedWaiter,
}: {
  readonly currencyCode: string;
  readonly days: readonly ManagerReportDay[];
  readonly language: Language;
  readonly selectedWaiter: boolean;
}) {
  const { tokens } = useTheme();
  const amounts = days.map((day) =>
    selectedWaiter ? (day.selectedWaiterContributionMinor ?? 0) : day.confirmedRevenueMinor,
  );
  const maximum = Math.max(1, ...amounts);
  return (
    <View style={{ gap: tokens.space.sm }}>
      {days.map((day, index) => {
        const amount = amounts[index];
        return (
          <View key={day.businessDate} style={{ gap: tokens.space.xxs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
                {formatDate(day.businessDate, language)}
              </Text>
              <Text style={[tokens.typography.label, { color: tokens.colors.text }]}>
                {formatMinor(amount, currencyCode, language)}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: tokens.colors.surfaceAlt,
                borderRadius: tokens.radius.full,
                height: 10,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  backgroundColor: tokens.colors.primary,
                  borderRadius: tokens.radius.full,
                  height: 10,
                  width: `${Math.max(amount > 0 ? 4 : 0, (amount / maximum) * 100)}%`,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function formatDate(value: string, language: Language): string {
  return new Intl.DateTimeFormat(locale(language), {
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${value}T12:00:00Z`));
}

export function formatMinor(amountMinor: number, currencyCode: string, language: Language): string {
  const formatter = new Intl.NumberFormat(locale(language), {
    currency: currencyCode,
    style: 'currency',
  });
  const fractionDigits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return formatter.format(amountMinor / 10 ** fractionDigits);
}

function locale(language: Language): string {
  return language === 'tr' ? 'tr-TR' : language === 'bg' ? 'bg-BG' : 'en-US';
}
