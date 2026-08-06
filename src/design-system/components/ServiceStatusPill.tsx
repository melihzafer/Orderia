import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ServiceStatusTone } from '../tokens';

export interface ServiceStatusPillProps {
  readonly label: string;
  readonly tone?: ServiceStatusTone;
  readonly icon?: keyof typeof Ionicons.glyphMap;
  readonly announce?: boolean;
  readonly size?: 'small' | 'default' | 'large';
  /** İkon yerine durumu renkli bir noktayla göster; masa haritası gibi yoğun listelerde daha sakin. */
  readonly dot?: boolean;
}

export function ServiceStatusPill({
  label,
  tone = 'neutral',
  icon,
  announce = false,
  size = 'default',
  dot = false,
}: ServiceStatusPillProps) {
  const { tokens } = useTheme();
  const colors = statusPalette(tokens.colors, tone);
  const minimumHeight = size === 'small' ? 28 : size === 'large' ? 40 : 32;
  const typography = size === 'large' ? tokens.typography.label : tokens.typography.caption;

  return (
    <View
      accessibilityLabel={label}
      accessibilityLiveRegion={announce ? 'polite' : 'none'}
      accessibilityRole="text"
      style={{
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: colors.background,
        borderColor: colors.border,
        borderRadius: tokens.radius.full,
        borderWidth: 1,
        flexDirection: 'row',
        minHeight: minimumHeight,
        paddingHorizontal: tokens.space.sm,
      }}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={16}
          color={colors.content}
          style={{ marginRight: tokens.space.xxs }}
        />
      ) : dot ? (
        <View
          style={{
            backgroundColor: colors.content,
            borderRadius: tokens.radius.full,
            height: 8,
            marginRight: tokens.space.xxs,
            width: 8,
          }}
        />
      ) : null}
      <Text style={[typography, { color: colors.content }]}>{label}</Text>
    </View>
  );
}

function statusPalette(
  colors: ReturnType<typeof useTheme>['colors'],
  tone: ServiceStatusTone,
): { background: string; border: string; content: string } {
  switch (tone) {
    case 'success':
      return {
        background: colors.state.delivered.bg,
        border: colors.state.delivered.border,
        content: colors.state.delivered.text,
      };
    case 'warning':
      return {
        background: colors.state.pending.bg,
        border: colors.state.pending.border,
        content: colors.state.pending.text,
      };
    case 'error':
      return {
        background: colors.state.cancelled.bg,
        border: colors.state.cancelled.border,
        content: colors.state.cancelled.text,
      };
    case 'info':
      return {
        background: colors.state.paid.bg,
        border: colors.state.paid.border,
        content: colors.state.paid.text,
      };
    default:
      return {
        background: colors.surfaceAlt,
        border: colors.border,
        content: colors.textSubtle,
      };
  }
}
