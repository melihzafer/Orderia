import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export type ServiceButtonVariant =
  'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'danger';

export interface ServiceButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  readonly label: string;
  readonly variant?: ServiceButtonVariant;
  readonly size?: 'default' | 'large';
  readonly loading?: boolean;
  readonly fullWidth?: boolean;
  readonly icon?: keyof typeof Ionicons.glyphMap;
  readonly iconPosition?: 'left' | 'right';
  readonly style?: StyleProp<ViewStyle>;
}

export function ServiceButton({
  label,
  variant = 'primary',
  size = 'default',
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  disabled,
  style,
  onFocus,
  onBlur,
  ...props
}: ServiceButtonProps) {
  const { tokens } = useTheme();
  const [focused, setFocused] = useState(false);
  const isDisabled = disabled || loading;
  const palette = buttonPalette(tokens.colors, variant, isDisabled);

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={({ pressed }) => [
        {
          alignItems: 'center',
          backgroundColor: palette.background,
          borderColor: focused ? tokens.colors.focus : palette.border,
          borderRadius: tokens.radius.medium,
          borderWidth: focused ? 3 : 1,
          flexDirection: 'row',
          justifyContent: 'center',
          minHeight: size === 'large' ? tokens.sizing.primaryTarget : tokens.sizing.minimumTarget,
          opacity: pressed ? 0.82 : 1,
          paddingHorizontal: size === 'large' ? tokens.space.lg : tokens.space.md,
          width: fullWidth ? '100%' : undefined,
        },
        style,
      ]}
    >
      <View style={{ alignItems: 'center', flexDirection: 'row' }}>
        {loading ? (
          <ActivityIndicator
            accessibilityLabel={`${label}, loading`}
            color={palette.content}
            size="small"
            style={{ marginRight: tokens.space.xs }}
          />
        ) : icon && iconPosition === 'left' ? (
          <Ionicons
            name={icon}
            size={20}
            color={palette.content}
            style={{ marginRight: tokens.space.xs }}
          />
        ) : null}
        <Text
          numberOfLines={2}
          style={[
            tokens.typography.label,
            {
              color: palette.content,
              textAlign: 'center',
            },
          ]}
        >
          {label}
        </Text>
        {!loading && icon && iconPosition === 'right' ? (
          <Ionicons
            name={icon}
            size={20}
            color={palette.content}
            style={{ marginLeft: tokens.space.xs }}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

function buttonPalette(
  colors: ReturnType<typeof useTheme>['colors'],
  variant: ServiceButtonVariant,
  disabled: boolean,
): { background: string; border: string; content: string } {
  if (disabled) {
    return {
      background: colors.surfaceAlt,
      border: colors.border,
      content: colors.textMuted,
    };
  }

  switch (variant) {
    case 'accent':
      return {
        background: colors.accent,
        border: colors.accent,
        content: colors.primaryContrast,
      };
    case 'secondary':
      return {
        background: colors.secondary,
        border: colors.secondary,
        content: colors.surface,
      };
    case 'outline':
      return {
        background: 'transparent',
        border: colors.primary,
        content: colors.primary,
      };
    case 'ghost':
      return {
        background: 'transparent',
        border: 'transparent',
        content: colors.text,
      };
    case 'danger':
      return {
        background: colors.error,
        border: colors.error,
        content: colors.onError,
      };
    default:
      return {
        background: colors.primary,
        border: colors.primary,
        content: colors.primaryContrast,
      };
  }
}
