import React from 'react';
import { TouchableOpacity, ViewStyle, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { brand, elevation, radius, spacing } from '../constants/branding';

interface FloatingActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'accent';
  label?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export function FloatingActionButton({
  icon,
  onPress,
  size = 'medium',
  variant = 'primary',
  label,
  disabled = false,
  style,
}: FloatingActionButtonProps) {
  const { colors } = useTheme();

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.full,
      ...elevation.lg,
    };

    // Size styles
    switch (size) {
      case 'small':
        baseStyle.width = 48;
        baseStyle.height = 48;
        break;
      case 'large':
        baseStyle.width = 72;
        baseStyle.height = 72;
        break;
      default: // medium
        baseStyle.width = 56;
        baseStyle.height = 56;
        break;
    }

    // Variant styles
    switch (variant) {
      case 'primary':
        baseStyle.backgroundColor = disabled ? colors.textMuted : colors.primary;
        baseStyle.shadowColor = colors.primary;
        break;
      case 'secondary':
        baseStyle.backgroundColor = disabled ? colors.textMuted : colors.secondary;
        baseStyle.shadowColor = colors.secondary;
        break;
      case 'accent':
        baseStyle.backgroundColor = disabled ? colors.textMuted : colors.accent;
        baseStyle.shadowColor = colors.accent;
        break;
    }

    if (disabled) {
      baseStyle.shadowOpacity = 0;
      baseStyle.elevation = 0;
    }

    return baseStyle;
  };

  const getIconSize = () => {
    switch (size) {
      case 'small': return 20;
      case 'large': return 32;
      default: return 24;
    }
  };

  const getIconColor = () => {
    return disabled ? colors.textMuted : colors.primaryContrast;
  };

  const containerStyle: ViewStyle = {
    alignItems: 'center',
    ...style,
  };

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <TouchableOpacity
        style={getButtonStyle()}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.9}
      >
        <Ionicons 
          name={icon} 
          size={getIconSize()} 
          color={getIconColor()} 
        />
      </TouchableOpacity>
      {label && (
        <Text style={{
          fontSize: 12,
          fontWeight: '500',
          color: colors.textSubtle,
          marginTop: spacing.xs,
          textAlign: 'center',
        }}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}
