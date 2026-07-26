import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ServiceSurface, useAdaptiveLayout } from '../../design-system';

export interface ManagerKpi {
  readonly label: string;
  readonly value: string;
  readonly helper?: string;
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly tone?: 'primary' | 'warning' | 'neutral';
}

export function ManagerKpiGrid({ items }: { readonly items: readonly ManagerKpi[] }) {
  const { tokens } = useTheme();
  const layout = useAdaptiveLayout();
  const basis = layout.mode === 'compact' ? '47%' : layout.mode === 'medium' ? '30%' : '22%';
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm }}>
      {items.map((item) => (
        <ServiceSurface
          key={item.label}
          style={{
            flexBasis: basis,
            flexGrow: 1,
            gap: tokens.space.xs,
            minHeight: 128,
          }}
          variant="outlined"
        >
          <Ionicons
            color={
              item.tone === 'warning'
                ? tokens.colors.warning
                : item.tone === 'primary'
                  ? tokens.colors.primary
                  : tokens.colors.textSubtle
            }
            name={item.icon}
            size={22}
          />
          <Text style={[tokens.typography.money, { color: tokens.colors.text }]}>{item.value}</Text>
          <Text style={[tokens.typography.label, { color: tokens.colors.textSubtle }]}>
            {item.label}
          </Text>
          {item.helper ? (
            <Text style={[tokens.typography.caption, { color: tokens.colors.textMuted }]}>
              {item.helper}
            </Text>
          ) : null}
        </ServiceSurface>
      ))}
    </View>
  );
}
