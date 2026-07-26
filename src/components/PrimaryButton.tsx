import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ServiceButton, ServiceButtonProps, ServiceButtonVariant } from '../design-system';

interface PrimaryButtonProps extends Omit<ServiceButtonProps, 'label' | 'variant' | 'size'> {
  title: string;
  variant?: Exclude<ServiceButtonVariant, 'accent'>;
  size?: 'small' | 'medium' | 'large';
  icon?: keyof typeof Ionicons.glyphMap;
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
  return (
    <ServiceButton
      label={title}
      variant={variant}
      size={size === 'large' ? 'large' : 'default'}
      loading={loading}
      fullWidth={fullWidth}
      disabled={disabled}
      style={style}
      icon={icon}
      iconPosition={iconPosition}
      {...props}
    />
  );
}
