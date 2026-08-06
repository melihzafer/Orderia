import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ServiceStatusTone } from '../tokens';

export interface ServiceQuickActionProps {
  readonly label: string;
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly onPress: () => void;
  /** Sağ üstte gösterilen sayaç; 0 ise çizilmez. */
  readonly badge?: number;
  readonly tone?: ServiceStatusTone | 'accent';
  /** Ekranın ana eylemi: dolgulu ve daha yüksek çizilir. */
  readonly emphasis?: 'primary' | 'default';
  readonly disabled?: boolean;
  readonly style?: StyleProp<ViewStyle>;
}

/**
 * Ana ekranın üst sırasındaki tek dokunuşluk kısayol.
 * Yoğun serviste garson menüde gezinmek yerine buradan başlar; bu yüzden hedef
 * `primaryTarget`'tan büyük ve etiket ikonun altında, kısaltmasız durur.
 */
export function ServiceQuickAction({
  label,
  icon,
  onPress,
  badge,
  tone = 'accent',
  emphasis = 'default',
  disabled = false,
  style,
}: ServiceQuickActionProps) {
  const { tokens, density } = useTheme();
  const [focused, setFocused] = useState(false);
  const palette = quickActionPalette(tokens.colors, tone, emphasis);

  return (
    <Pressable
      accessibilityLabel={badge ? `${label}, ${badge}` : label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onPress={onPress}
      style={({ pressed }) => [
        {
          alignItems: 'center',
          backgroundColor: palette.background,
          borderColor: focused ? tokens.colors.focus : palette.border,
          borderRadius: tokens.radius.large,
          borderWidth: focused ? 3 : 1,
          justifyContent: 'center',
          minHeight: density === 'compact' ? 68 : 84,
          opacity: pressed ? 0.82 : disabled ? 0.5 : 1,
          paddingHorizontal: tokens.space.xs,
          paddingVertical: tokens.space.sm,
        },
        emphasis === 'primary' ? tokens.elevation.card : tokens.elevation.none,
        style,
      ]}
    >
      <View>
        <Ionicons color={palette.content} name={icon} size={24} />
        {badge ? (
          <View
            style={{
              alignItems: 'center',
              backgroundColor: palette.badgeBackground,
              borderRadius: tokens.radius.full,
              justifyContent: 'center',
              minHeight: 18,
              minWidth: 18,
              paddingHorizontal: 4,
              position: 'absolute',
              right: -14,
              top: -6,
            }}
          >
            <Text
              style={[tokens.typography.caption, { color: palette.badgeContent, fontSize: 11 }]}
            >
              {badge > 99 ? '99+' : badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text
        numberOfLines={2}
        style={[
          tokens.typography.caption,
          {
            color: palette.content,
            marginTop: tokens.space.xs,
            textAlign: 'center',
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function quickActionPalette(
  colors: ReturnType<typeof useTheme>['colors'],
  tone: ServiceStatusTone | 'accent',
  emphasis: 'primary' | 'default',
): {
  background: string;
  border: string;
  content: string;
  badgeBackground: string;
  badgeContent: string;
} {
  if (emphasis === 'primary') {
    return {
      background: colors.primary,
      border: colors.primary,
      content: colors.primaryContrast,
      badgeBackground: colors.primaryContrast,
      badgeContent: colors.primary,
    };
  }

  const soft =
    tone === 'success'
      ? { background: colors.state.delivered.bg, content: colors.state.delivered.text }
      : tone === 'warning'
        ? { background: colors.state.pending.bg, content: colors.state.pending.text }
        : tone === 'error'
          ? { background: colors.state.cancelled.bg, content: colors.state.cancelled.text }
          : tone === 'info'
            ? { background: colors.state.paid.bg, content: colors.state.paid.text }
            : tone === 'neutral'
              ? { background: colors.surfaceAlt, content: colors.textSubtle }
              : { background: colors.surface, content: colors.accent };

  return {
    background: soft.background,
    border: colors.borderLight,
    content: soft.content,
    badgeBackground: colors.primary,
    badgeContent: colors.primaryContrast,
  };
}
