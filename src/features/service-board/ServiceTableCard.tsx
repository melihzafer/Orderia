import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ServiceIconButton, ServiceSurface } from '../../design-system';
import { Language, useLocalization } from '../../i18n';
import { ShiftBoardTable, ShiftBoardTableState } from './shiftBoardModel';

export interface ServiceTableCardProps {
  readonly table: ShiftBoardTable;
  readonly onPress: () => void;
  readonly onMore?: () => void;
}

export function ServiceTableCard({ table, onPress, onMore }: ServiceTableCardProps) {
  const { tokens } = useTheme();
  const { language, t } = useLocalization();
  const [focused, setFocused] = useState(false);
  const state = statePresentation(table.state, t);
  const stateColors = statePalette(table.state, tokens.colors);
  const accessibleWaiters = table.waiterNames.length > 0 ? `, ${table.waiterNames.join(', ')}` : '';
  const accessibilityLabel = [
    table.label,
    state.label,
    table.durationMinutes === undefined ? undefined : `${table.durationMinutes} ${t.minutes}`,
    table.remainingMinor > 0
      ? formatMinorCurrency(table.remainingMinor, table.currencyCode, language)
      : undefined,
    table.checkCount > 0 ? `${table.checkCount} ${t.checksCount}` : undefined,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <ServiceSurface
      padding="none"
      style={{
        backgroundColor: stateColors.background,
        borderColor: focused ? tokens.colors.focus : stateColors.border,
        borderWidth: focused ? 3 : 1,
        minHeight: tokens.sizing.tableCardMinimumHeight,
        overflow: 'hidden',
      }}
    >
      <Pressable
        accessibilityHint={`${table.hallName}${accessibleWaiters}`}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onBlur={() => setFocused(false)}
        onFocus={() => setFocused(true)}
        onPress={onPress}
        style={({ pressed }) => ({
          minHeight: tokens.sizing.tableCardMinimumHeight,
          opacity: pressed ? 0.78 : 1,
          padding: tokens.space.sm,
          paddingRight: onMore ? 52 : tokens.space.sm,
        })}
      >
        <View
          style={{
            alignItems: 'flex-start',
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <Text
            numberOfLines={2}
            style={[tokens.typography.bodyStrong, { color: tokens.colors.text, flexShrink: 1 }]}
          >
            {table.label}
          </Text>
          {table.needsAttention ? (
            <Ionicons
              accessibilityLabel={state.label}
              color={stateColors.content}
              name="alert-circle"
              size={20}
            />
          ) : null}
        </View>

        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            marginTop: tokens.space.xs,
          }}
        >
          <Ionicons color={stateColors.content} name={state.icon} size={16} />
          <Text
            style={[
              tokens.typography.caption,
              {
                color: stateColors.content,
                marginLeft: tokens.space.xxs,
                textTransform: 'uppercase',
              },
            ]}
          >
            {state.label}
            {table.durationMinutes === undefined
              ? ''
              : ` · ${table.durationMinutes}${minuteSuffix(language)}`}
          </Text>
        </View>

        {table.state === 'available' ? (
          table.capacity ? (
            <Text
              style={[
                tokens.typography.caption,
                {
                  color: tokens.colors.textSubtle,
                  marginTop: tokens.space.sm,
                },
              ]}
            >
              {table.capacity} {t.seatsCount}
            </Text>
          ) : (
            <View style={{ flex: 1 }} />
          )
        ) : (
          <>
            <Text
              style={[
                tokens.typography.subtitle,
                {
                  color: tokens.colors.text,
                  marginTop: tokens.space.sm,
                },
              ]}
            >
              {formatMinorCurrency(table.remainingMinor, table.currencyCode, language)}
            </Text>
            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: tokens.space.xs,
              }}
            >
              <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
                {table.checkCount} {t.checksCount}
              </Text>
              <WaiterInitials initials={table.waiterInitials} />
            </View>
          </>
        )}

        {table.pendingMutationCount > 0 ? (
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              marginTop: tokens.space.xs,
            }}
          >
            <Ionicons color={tokens.colors.warning} name="cloud-upload-outline" size={14} />
            <Text
              style={[
                tokens.typography.caption,
                {
                  color: tokens.colors.textSubtle,
                  marginLeft: tokens.space.xxs,
                },
              ]}
            >
              {table.pendingMutationCount} {t.queuedChanges}
            </Text>
          </View>
        ) : null}
      </Pressable>

      {onMore ? (
        <View style={{ position: 'absolute', right: 2, top: 2 }}>
          <ServiceIconButton
            icon="ellipsis-horizontal"
            label={`${table.label}, ${t.moreTableActions}`}
            onPress={onMore}
          />
        </View>
      ) : null}
    </ServiceSurface>
  );
}

function WaiterInitials({ initials }: { readonly initials: readonly string[] }) {
  const { tokens } = useTheme();
  const { t } = useLocalization();
  if (initials.length === 0) return null;

  return (
    <View
      accessibilityLabel={`${initials.length} ${t.waitersCount}`}
      style={{ flexDirection: 'row' }}
    >
      {initials.slice(0, 3).map((value, index) => (
        <View
          key={`${value}-${index}`}
          style={{
            alignItems: 'center',
            backgroundColor: tokens.colors.surfaceAlt,
            borderColor: tokens.colors.border,
            borderRadius: tokens.radius.full,
            borderWidth: 1,
            height: 26,
            justifyContent: 'center',
            marginLeft: index === 0 ? 0 : -4,
            width: 26,
          }}
        >
          <Text
            style={[tokens.typography.caption, { color: tokens.colors.textSubtle, fontSize: 10 }]}
          >
            {value}
          </Text>
        </View>
      ))}
      {initials.length > 3 ? (
        <Text
          style={[
            tokens.typography.caption,
            {
              color: tokens.colors.textSubtle,
              marginLeft: tokens.space.xxs,
            },
          ]}
        >
          +{initials.length - 3}
        </Text>
      ) : null}
    </View>
  );
}

function statePresentation(
  state: ShiftBoardTableState,
  t: ReturnType<typeof useLocalization>['t'],
): {
  readonly label: string;
  readonly icon: keyof typeof Ionicons.glyphMap;
} {
  switch (state) {
    case 'open':
      return { label: t.openState, icon: 'restaurant-outline' };
    case 'payment_pending':
      return { label: t.paymentDueState, icon: 'card-outline' };
    case 'sync_issue':
      return { label: t.syncIssueState, icon: 'cloud-offline-outline' };
    case 'conflict':
      return { label: t.needsReviewState, icon: 'warning-outline' };
    default:
      return { label: t.availableState, icon: 'ellipse-outline' };
  }
}

function statePalette(
  state: ShiftBoardTableState,
  colors: ReturnType<typeof useTheme>['colors'],
): { readonly background: string; readonly border: string; readonly content: string } {
  switch (state) {
    case 'open':
      return {
        background: colors.state.delivered.bg,
        border: colors.state.delivered.border,
        content: colors.state.delivered.text,
      };
    case 'payment_pending':
      return {
        background: colors.state.pending.bg,
        border: colors.state.pending.border,
        content: colors.state.pending.text,
      };
    case 'sync_issue':
    case 'conflict':
      return {
        background: colors.state.cancelled.bg,
        border: colors.state.cancelled.border,
        content: colors.state.cancelled.text,
      };
    default:
      return {
        background: colors.surface,
        border: colors.border,
        content: colors.textSubtle,
      };
  }
}

export function formatMinorCurrency(
  amountMinor: number,
  currencyCode: string,
  language: Language,
): string {
  const locale = language === 'tr' ? 'tr-TR' : language === 'bg' ? 'bg-BG' : 'en-IE';
  try {
    return new Intl.NumberFormat(locale, {
      currency: currencyCode,
      style: 'currency',
    }).format(amountMinor / 100);
  } catch {
    return `${currencyCode} ${(amountMinor / 100).toFixed(2)}`;
  }
}

function minuteSuffix(language: Language): string {
  if (language === 'tr') return 'dk';
  if (language === 'bg') return 'м';
  return 'm';
}
