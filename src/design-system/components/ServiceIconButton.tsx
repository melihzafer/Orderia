import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export interface ServiceIconButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly label: string;
  readonly tone?: 'default' | 'primary' | 'danger';
  readonly style?: StyleProp<ViewStyle>;
}

export function ServiceIconButton({
  icon,
  label,
  tone = 'default',
  disabled,
  style,
  onFocus,
  onBlur,
  ...props
}: ServiceIconButtonProps) {
  const { tokens } = useTheme();
  const [focused, setFocused] = useState(false);
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
      hitSlop={4}
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
          borderColor: focused ? tokens.colors.focus : 'transparent',
          borderRadius: tokens.radius.full,
          borderWidth: focused ? 3 : 1,
          height: tokens.sizing.minimumTarget,
          justifyContent: 'center',
          opacity: pressed ? 0.8 : 1,
          width: tokens.sizing.minimumTarget,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={24} color={color} />
    </Pressable>
  );
}
