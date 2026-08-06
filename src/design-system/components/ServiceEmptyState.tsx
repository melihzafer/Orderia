import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ServiceButton, ServiceButtonProps } from './ServiceButton';

export interface ServiceEmptyStateProps {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly title: string;
  readonly body: string;
  readonly action?: Pick<ServiceButtonProps, 'label' | 'onPress' | 'accessibilityHint'>;
}

export function ServiceEmptyState({ icon, title, body, action }: ServiceEmptyStateProps) {
  const { tokens, density } = useTheme();

  return (
    <View
      accessibilityRole="summary"
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        padding: density === 'compact' ? tokens.space.lg : tokens.space.xl,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          backgroundColor: tokens.colors.surfaceAlt,
          borderRadius: tokens.radius.full,
          height: 56,
          justifyContent: 'center',
          marginBottom: tokens.space.md,
          width: 56,
        }}
      >
        <Ionicons name={icon} size={28} color={tokens.colors.primary} />
      </View>
      <Text
        accessibilityRole="header"
        style={[tokens.typography.sectionTitle, { color: tokens.colors.text, textAlign: 'center' }]}
      >
        {title}
      </Text>
      <Text
        numberOfLines={3}
        style={[
          tokens.typography.body,
          {
            color: tokens.colors.textSubtle,
            marginTop: tokens.space.xs,
            maxWidth: 480,
            textAlign: 'center',
          },
        ]}
      >
        {body}
      </Text>
      {action ? <ServiceButton {...action} style={{ marginTop: tokens.space.lg }} /> : null}
    </View>
  );
}
