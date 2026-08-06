import React from 'react';
import { View, ViewStyle, ViewProps, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { serviceElevation, serviceRadius, serviceSpace } from '../design-system/tokens';

interface SurfaceCardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  padding?: 'none' | 'small' | 'medium' | 'large' | 'xl';
  radius?: 'small' | 'medium' | 'large' | 'xl';
  interactive?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
}

export function SurfaceCard({
  variant = 'default',
  padding = 'medium',
  radius: radiusSize = 'medium',
  interactive = false,
  onPress,
  children,
  style,
  ...props
}: SurfaceCardProps) {
  const { colors } = useTheme();

  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      backgroundColor: colors.surface,
      overflow: 'hidden',
    };

    // Border radius
    switch (radiusSize) {
      case 'small':
        baseStyle.borderRadius = serviceRadius.small;
        break;
      case 'large':
        baseStyle.borderRadius = serviceRadius.large;
        break;
      case 'xl':
        baseStyle.borderRadius = serviceRadius.large; // xl doesn't exist, use large
        break;
      default: // medium
        baseStyle.borderRadius = serviceRadius.medium;
        break;
    }

    // Padding
    switch (padding) {
      case 'none':
        break;
      case 'small':
        baseStyle.padding = serviceSpace.xs;
        break;
      case 'large':
        baseStyle.padding = serviceSpace.lg;
        break;
      case 'xl':
        baseStyle.padding = serviceSpace.lg + serviceSpace.xs;
        break;
      default: // medium
        baseStyle.padding = serviceSpace.sm;
        break;
    }

    // Variant styles
    switch (variant) {
      case 'elevated':
        Object.assign(baseStyle, serviceElevation.sticky);
        break;
      case 'outlined':
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = colors.border;
        break;
      case 'glass':
        baseStyle.backgroundColor = colors.surface + 'E6'; // 90% opacity
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = colors.borderLight;
        Object.assign(baseStyle, serviceElevation.none);
        break;
      default: // default
        Object.assign(baseStyle, serviceElevation.none);
        break;
    }

    // Interactive states
    if (interactive || onPress) {
      baseStyle.borderWidth = baseStyle.borderWidth || 1;
      baseStyle.borderColor = baseStyle.borderColor || 'transparent';
    }

    return baseStyle;
  };

  const renderContent = () => (
    <View style={[getCardStyle(), style]} {...props}>
      {children}
    </View>
  );

  if (interactive || onPress) {
    const touchableProps: TouchableOpacityProps = {
      onPress,
      activeOpacity: 0.95,
      style: [getCardStyle(), style],
      ...props,
    };

    return <TouchableOpacity {...touchableProps}>{children}</TouchableOpacity>;
  }

  return renderContent();
}
