import React from 'react';
import { View, ViewStyle, ViewProps } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface SurfaceCardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'small' | 'medium' | 'large';
  children: React.ReactNode;
}

export function SurfaceCard({
  variant = 'default',
  padding = 'medium',
  children,
  style,
  ...props
}: SurfaceCardProps) {
  const { colors } = useTheme();

  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      backgroundColor: colors.surface,
      borderRadius: 12,
    };

    // Padding
    switch (padding) {
      case 'none':
        break;
      case 'small':
        baseStyle.padding = 8;
        break;
      case 'large':
        baseStyle.padding = 20;
        break;
      default: // medium
        baseStyle.padding = 16;
        break;
    }

    // Variant styles
    switch (variant) {
      case 'elevated':
        baseStyle.shadowColor = '#000';
        baseStyle.shadowOffset = { width: 0, height: 2 };
        baseStyle.shadowOpacity = 0.1;
        baseStyle.shadowRadius = 4;
        baseStyle.elevation = 3;
        break;
      case 'outlined':
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = colors.border;
        break;
    }

    return baseStyle;
  };

  return (
    <View style={[getCardStyle(), style]} {...props}>
      {children}
    </View>
  );
}
