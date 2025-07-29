import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { OrderStatus } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { getStatusConfig } from '../constants/branding';

interface StatusBadgeProps {
  status: OrderStatus;
  showIcon?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function StatusBadge({ 
  status, 
  showIcon = true, 
  size = 'medium' 
}: StatusBadgeProps) {
  const { colorMode } = useTheme();
  const statusConfig = getStatusConfig(status, colorMode);

  const getBadgeStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      backgroundColor: statusConfig.bg,
      borderWidth: 1,
      borderColor: statusConfig.border,
      borderRadius: 6,
      paddingHorizontal: size === 'small' ? 6 : size === 'large' ? 12 : 8,
      paddingVertical: size === 'small' ? 2 : size === 'large' ? 6 : 4,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
    };

    if (status === 'pending') {
      baseStyle.borderLeftWidth = 4;
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    return {
      color: statusConfig.text,
      fontSize: size === 'small' ? 11 : size === 'large' ? 14 : 12,
      fontWeight: '600',
      marginLeft: showIcon ? 4 : 0,
    };
  };

  const getStatusLabel = (status: OrderStatus): string => {
    switch (status) {
      case 'pending':
        return 'Bekliyor';
      case 'delivered':
        return 'Teslim';
      case 'paid':
        return 'Ödendi';
      default:
        return status;
    }
  };

  return (
    <View style={getBadgeStyle()}>
      {showIcon && (
        <Text style={{ fontSize: size === 'small' ? 10 : size === 'large' ? 14 : 12 }}>
          {statusConfig.icon}
        </Text>
      )}
      <Text style={getTextStyle()}>
        {getStatusLabel(status)}
      </Text>
    </View>
  );
}
