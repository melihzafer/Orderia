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

  // Yüzeyleri ayıran şey gölge değil hairline sınır: yüzey ile arka plan arasındaki
  // fark sıcak palette çok ince olduğu için her kart görünür bir çizgi taşır.
  const elevation =
    variant === 'raised'
      ? tokens.elevation.sticky
      : variant === 'muted'
        ? tokens.elevation.none
        : tokens.elevation.card;

  return (
    <View
      style={[
        {
          backgroundColor: variant === 'muted' ? tokens.colors.surfaceAlt : tokens.colors.surface,
          borderColor: variant === 'outlined' ? tokens.colors.border : tokens.colors.borderLight,
          borderRadius: tokens.radius.large,
          borderWidth: variant === 'muted' ? 0 : 1,
          padding: paddingValue,
        },
        elevation,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
