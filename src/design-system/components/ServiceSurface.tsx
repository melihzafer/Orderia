import React from 'react';
import { StyleProp, View, ViewProps, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export interface ServiceSurfaceProps extends Omit<ViewProps, 'style'> {
  readonly children: React.ReactNode;
  readonly variant?: 'default' | 'raised' | 'outlined' | 'muted';
  readonly padding?: 'none' | 'small' | 'default' | 'large';
  readonly style?: StyleProp<ViewStyle>;
}

export function ServiceSurface({
  children,
  variant = 'default',
  padding = 'default',
  style,
  ...props
}: ServiceSurfaceProps) {
  const { tokens } = useTheme();
  const paddingValue =
    padding === 'none'
      ? 0
      : padding === 'small'
        ? tokens.space.sm
        : padding === 'large'
          ? tokens.space.lg
          : tokens.space.md;

  return (
    <View
      style={[
        {
          backgroundColor: variant === 'muted' ? tokens.colors.surfaceAlt : tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.large,
          borderWidth: variant === 'outlined' ? 1 : 0,
          padding: paddingValue,
        },
        variant === 'raised' ? tokens.elevation.sticky : undefined,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
