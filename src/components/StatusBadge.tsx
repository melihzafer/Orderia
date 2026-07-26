import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ServiceStatusPill, ServiceStatusTone } from '../design-system';
import { OrderStatus } from '../types';
import { useLocalization } from '../i18n';

type StatusBadgeProps = {
  status: OrderStatus;
  size?: 'small' | 'medium' | 'large';
};

export function StatusBadge({ status, size = 'medium' }: StatusBadgeProps) {
  const { t } = useLocalization();

  const statusConfig: Record<
    OrderStatus,
    {
      label: string;
      tone: ServiceStatusTone;
      icon: keyof typeof Ionicons.glyphMap;
    }
  > = {
    pending: {
      label: t.pending,
      tone: 'warning',
      icon: 'time-outline',
    },
    delivered: {
      label: t.delivered,
      tone: 'success',
      icon: 'checkmark-circle-outline',
    },
    paid: {
      label: t.paid,
      tone: 'info',
      icon: 'card-outline',
    },
    cancelled: {
      label: t.cancelled,
      tone: 'error',
      icon: 'close-circle-outline',
    },
  };

  const config = statusConfig[status];
  const legacySize = size === 'medium' ? 'default' : size;

  return (
    <ServiceStatusPill
      label={config.label}
      tone={config.tone}
      icon={config.icon}
      size={legacySize}
    />
  );
}
