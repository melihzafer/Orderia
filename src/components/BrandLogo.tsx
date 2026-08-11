import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import OrderiaForeground from '../../assets/orderia-foreground.svg';
import { useTheme } from '../contexts/ThemeContext';

interface BrandLogoProps {
  readonly markSize?: number;
  readonly showName?: boolean;
  readonly style?: StyleProp<ViewStyle>;
}

export function BrandLogo({ markSize = 48, showName = true, style }: BrandLogoProps) {
  const { tokens } = useTheme();

  return (
    <View
      accessibilityLabel="Orderia"
      accessibilityRole="image"
      accessible
      style={[styles.lockup, style]}
    >
      <View
        style={[
          styles.mark,
          {
            borderRadius: Math.round(markSize * 0.22),
            height: markSize,
            width: markSize,
          },
        ]}
      >
        <OrderiaForeground height={markSize} width={markSize} />
      </View>
      {showName ? (
        <Text
          style={[
            tokens.typography.title,
            { color: tokens.colors.text, fontSize: Math.max(24, Math.round(markSize * 0.52)) },
          ]}
        >
          Orderia
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  mark: {
    backgroundColor: '#BE4A26',
    overflow: 'hidden',
  },
});
