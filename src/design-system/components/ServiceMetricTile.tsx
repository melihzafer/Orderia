import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ServiceStatusTone } from '../tokens';

export interface ServiceMetricTileProps {
  readonly label: string;
  readonly value: string;
  /** Değerin yanında küçük punto duran birim, örneğin para birimi kodu. */
  readonly unit?: string;
  /** Değerin altındaki kısa yorum satırı. */
  readonly hint?: string;
  readonly trend?: 'up' | 'down' | 'flat';
  readonly tone?: ServiceStatusTone | 'accent';
  readonly onPress?: () => void;
  readonly style?: StyleProp<ViewStyle>;
}

/**
 * Vardiya ve rapor ekranlarının sayı kutusu.
 * Sayı `tabular-nums` taşır: değerler saniyede bir güncellenirken rakamların
 * genişliği değişmesin, göz aynı yerde kalsın.
 */
export function ServiceMetricTile({
  label,
  value,
  unit,
  hint,
  trend,
  tone = 'neutral',
  onPress,
  style,
}: ServiceMetricTileProps) {
  const { tokens, density } = useTheme();
  const accent = metricAccent(tokens.colors, tone);
  const trendColor =
    trend === 'up'
      ? tokens.colors.success
      : trend === 'down'
        ? tokens.colors.error
        : tokens.colors.textMuted;

  const content = (
    <>
      <Text
        // Üç kutu yan yanayken "AÇIK MASALAR" tek satıra sığmayıp kesiliyordu.
        numberOfLines={2}
        style={[
          tokens.typography.caption,
          { color: tokens.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
        ]}
      >
        {label}
      </Text>
      <View style={{ alignItems: 'baseline', flexDirection: 'row', marginTop: tokens.space.xxs }}>
        <Text
          numberOfLines={1}
          style={[tokens.typography.title, { color: accent, fontVariant: ['tabular-nums'] }]}
        >
          {value}
        </Text>
        {unit ? (
          <Text
            style={[
              tokens.typography.caption,
              { color: tokens.colors.textMuted, marginLeft: tokens.space.xxs },
            ]}
          >
            {unit}
          </Text>
        ) : null}
      </View>
      {hint ? (
        <View style={{ alignItems: 'center', flexDirection: 'row', marginTop: tokens.space.xxs }}>
          {trend && trend !== 'flat' ? (
            <Ionicons
              color={trendColor}
              name={trend === 'up' ? 'arrow-up' : 'arrow-down'}
              size={12}
              style={{ marginRight: 2 }}
            />
          ) : null}
          <Text
            numberOfLines={1}
            style={[
              tokens.typography.caption,
              { color: trend && trend !== 'flat' ? trendColor : tokens.colors.textSubtle },
            ]}
          >
            {hint}
          </Text>
        </View>
      ) : null}
    </>
  );

  const surface: ViewStyle = {
    backgroundColor: tokens.colors.surface,
    borderColor: tokens.colors.borderLight,
    borderRadius: tokens.radius.large,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: density === 'compact' ? 64 : 76,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.sm,
  };

  if (!onPress) {
    return (
      <View
        accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}
        style={[surface, tokens.elevation.card, style]}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        surface,
        tokens.elevation.card,
        { opacity: pressed ? 0.82 : 1 },
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

function metricAccent(
  colors: ReturnType<typeof useTheme>['colors'],
  tone: ServiceStatusTone | 'accent',
): string {
  switch (tone) {
    case 'success':
      return colors.success;
    case 'warning':
      return colors.warning;
    case 'error':
      return colors.error;
    case 'info':
      return colors.info;
    case 'accent':
      return colors.accent;
    default:
      return colors.text;
  }
}
