import React from 'react';
import { View, ViewStyle, ViewProps, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { brand, elevation, radius, spacing } from '../constants/branding';

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
        baseStyle.borderRadius = radius.sm;
        break;
      case 'large':
        baseStyle.borderRadius = radius.lg;
        break;
      case 'xl':
        baseStyle.borderRadius = radius.lg; // xl doesn't exist, use lg
        break;
      default: // medium
        baseStyle.borderRadius = radius.md;
        break;
    }

    // Padding
    switch (padding) {
      case 'none':
        break;
      case 'small':
        baseStyle.padding = spacing.sm;
        break;
      case 'large':
        baseStyle.padding = spacing.xl;
        break;
      case 'xl':
        baseStyle.padding = spacing.xl + spacing.sm;
        break;
      default: // medium
        baseStyle.padding = spacing.md;
        break;
    }

    // Variant styles
    switch (variant) {
      case 'elevated':
        Object.assign(baseStyle, elevation.md);
        break;
      case 'outlined':
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = colors.border;
        break;
      case 'glass':
        baseStyle.backgroundColor = colors.surface + 'E6'; // 90% opacity
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = colors.borderLight;
        Object.assign(baseStyle, elevation.sm);
        break;
      default: // default
        Object.assign(baseStyle, elevation.sm);
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

    return (
      <TouchableOpacity {...touchableProps}>
        {children}
      </TouchableOpacity>
    );
  }

  return renderContent();
}
