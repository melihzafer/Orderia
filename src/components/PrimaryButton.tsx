import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  ViewStyle, 
  TextStyle, 
  ActivityIndicator,
  TouchableOpacityProps,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { brand, elevation, radius, spacing } from '../constants/branding';

interface PrimaryButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  fullWidth?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
}

export function PrimaryButton({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  fullWidth = false,
  disabled,
  style,
  icon,
  iconPosition = 'left',
  ...props
}: PrimaryButtonProps) {
  const { colors } = useTheme();

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      borderWidth: 1,
      ...elevation.sm,
    };

    // Size styles
    switch (size) {
      case 'small':
        baseStyle.paddingHorizontal = spacing.md;
        baseStyle.paddingVertical = spacing.sm;
        baseStyle.minHeight = 36;
        break;
      case 'large':
        baseStyle.paddingHorizontal = spacing.xl;
        baseStyle.paddingVertical = spacing.lg;
        baseStyle.minHeight = 52;
        break;
      default: // medium
        baseStyle.paddingHorizontal = spacing.lg;
        baseStyle.paddingVertical = spacing.md;
        baseStyle.minHeight = 44;
        break;
    }

    // Variant styles
    const isDisabled = disabled || loading;
    
    switch (variant) {
      case 'primary':
        baseStyle.backgroundColor = isDisabled ? colors.textMuted : colors.primary;
        baseStyle.borderColor = isDisabled ? colors.textMuted : colors.primary;
        baseStyle.shadowColor = colors.primary;
        break;
      case 'secondary':
        baseStyle.backgroundColor = isDisabled ? colors.textMuted : colors.secondary;
        baseStyle.borderColor = isDisabled ? colors.textMuted : colors.secondary;
        baseStyle.shadowColor = colors.secondary;
        break;
      case 'outline':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderColor = isDisabled ? colors.border : colors.primary;
        baseStyle.shadowOpacity = 0;
        baseStyle.elevation = 0;
        break;
      case 'ghost':
        baseStyle.backgroundColor = isDisabled ? colors.border : colors.surfaceAlt;
        baseStyle.borderColor = 'transparent';
        baseStyle.shadowOpacity = 0;
        baseStyle.elevation = 0;
        break;
      case 'danger':
        baseStyle.backgroundColor = isDisabled ? colors.textMuted : colors.error;
        baseStyle.borderColor = isDisabled ? colors.textMuted : colors.error;
        baseStyle.shadowColor = colors.error;
        break;
    }

    if (isDisabled) {
      baseStyle.shadowOpacity = 0;
      baseStyle.elevation = 0;
    }

    if (fullWidth) {
      baseStyle.width = '100%';
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: '600',
      textAlign: 'center',
    };

    // Size styles
    switch (size) {
      case 'small':
        baseStyle.fontSize = 14;
        break;
      case 'large':
        baseStyle.fontSize = 18;
        break;
      default: // medium
        baseStyle.fontSize = 16;
        break;
    }

    // Variant styles
    const isDisabled = disabled || loading;
    
    switch (variant) {
      case 'primary':
      case 'secondary':
      case 'danger':
        baseStyle.color = colors.primaryContrast;
        break;
      case 'outline':
        baseStyle.color = isDisabled ? colors.textMuted : colors.primary;
        break;
      case 'ghost':
        baseStyle.color = isDisabled ? colors.textMuted : colors.text;
        break;
    }

    return baseStyle;
  };

  const getIconSize = () => {
    switch (size) {
      case 'small': return 16;
      case 'large': return 24;
      default: return 20;
    }
  };

  const getIconColor = () => {
    const isDisabled = disabled || loading;
    switch (variant) {
      case 'primary':
      case 'secondary':
      case 'danger':
        return colors.primaryContrast;
      case 'outline':
        return isDisabled ? colors.textMuted : colors.primary;
      case 'ghost':
        return isDisabled ? colors.textMuted : colors.text;
      default:
        return colors.primaryContrast;
    }
  };

  const renderContent = () => {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {loading && (
          <ActivityIndicator 
            size="small" 
            color={getIconColor()} 
            style={{ marginRight: title ? spacing.sm : 0 }}
          />
        )}
        {!loading && icon && iconPosition === 'left' && (
          <Ionicons 
            name={icon} 
            size={getIconSize()} 
            color={getIconColor()} 
            style={{ marginRight: title ? spacing.sm : 0 }}
          />
        )}
        {title && (
          <Text style={getTextStyle()}>
            {title}
          </Text>
        )}
        {!loading && icon && iconPosition === 'right' && (
          <Ionicons 
            name={icon} 
            size={getIconSize()} 
            color={getIconColor()} 
            style={{ marginLeft: title ? spacing.sm : 0 }}
          />
        )}
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {renderContent()}
    </TouchableOpacity>
  );
}
