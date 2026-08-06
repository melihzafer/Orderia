import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { focusRing } from '../focusRing';

export interface ServiceIconButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly label: string;
  readonly tone?: 'default' | 'primary' | 'danger';
  /**
   * `compact` görsel kutuyu küçültür; dokunma alanı hitSlop ile yine ~48dp'de kalır.
   * Yalnızca ikincil/üçüncül eylemler için (ör. bir kart üstündeki geri al/temizle).
   */
  readonly size?: 'default' | 'compact';
  readonly style?: StyleProp<ViewStyle>;
}

export function ServiceIconButton({
  icon,
  label,
  tone = 'default',
  size = 'default',
  disabled,
  style,
  onFocus,
  onBlur,
  hitSlop,
  ...props
}: ServiceIconButtonProps) {
  const { tokens } = useTheme();
  const [focused, setFocused] = useState(false);
  const isCompact = size === 'compact';
  const color = disabled
    ? tokens.colors.textMuted
    : tone === 'danger'
      ? tokens.colors.error
      : tone === 'primary'
        ? tokens.colors.primary
        : tokens.colors.text;

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      hitSlop={hitSlop ?? (isCompact ? 8 : 4)}
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
          backgroundColor: pressed ? tokens.colors.surfaceAlt : 'transparent',
          borderColor: 'transparent',
          borderRadius: tokens.radius.full,
          borderWidth: 1,
          height: isCompact ? 32 : tokens.sizing.minimumTarget,
          justifyContent: 'center',
          opacity: pressed ? 0.8 : 1,
          width: isCompact ? 32 : tokens.sizing.minimumTarget,
        },
        focusRing(tokens.colors.focus, focused),
        style,
      ]}
    >
      <Ionicons name={icon} size={isCompact ? 18 : 24} color={color} />
    </Pressable>
  );
}
