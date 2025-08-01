import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { OrderStatus } from '../types';
import { useLocalization } from '../i18n';

type StatusBadgeProps = {
  status: OrderStatus;
  size?: 'small' | 'medium' | 'large';
};

export function StatusBadge({ status, size = 'medium' }: StatusBadgeProps) {
  const { colors } = useTheme();
  const { t } = useLocalization();

  const statusConfig = {
    pending: {
      label: t.pending,
      color: '#F59E0B', // Amber
      bg: '#FEF3C7', // Light amber
      borderColor: '#F59E0B',
    },
    delivered: {
      label: t.delivered,
      color: '#10B981', // Emerald
      bg: '#D1FAE5', // Light emerald
      borderColor: '#10B981',
    },
    paid: {
      label: t.paid,
      color: '#3B82F6', // Blue
      bg: '#DBEAFE', // Light blue
      borderColor: '#3B82F6',
    },
    cancelled: {
      label: t.cancelled,
      color: '#EF4444', // Red
      bg: '#FEE2E2', // Light red
      borderColor: '#EF4444',
    },
  };

  const config = statusConfig[status];

  if (!config) return null;

  const sizeStyles = {
    small: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      fontSize: 10,
    },
    medium: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      fontSize: 12,
    },
    large: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      fontSize: 14,
    },
  };

  const style = sizeStyles[size];

  return (
    <View
      style={{
        backgroundColor: config.bg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: config.borderColor,
        paddingHorizontal: style.paddingHorizontal,
        paddingVertical: style.paddingVertical,
        alignSelf: 'flex-start',
        shadowColor: config.color,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
      }}
    >
      <Text
        style={{
          color: config.color,
          fontSize: style.fontSize,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {config.label}
      </Text>
    </View>
  );
}
