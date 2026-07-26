import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export interface ServiceSkeletonProps {
  readonly width?: ViewStyle['width'];
  readonly height: number;
  readonly radius?: number;
  readonly style?: StyleProp<ViewStyle>;
  readonly label?: string;
}

export function ServiceSkeleton({
  width = '100%',
  height,
  radius,
  style,
  label = 'Loading',
}: ServiceSkeletonProps) {
  const { tokens } = useTheme();
  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      style={[
        {
          backgroundColor: tokens.colors.surfaceAlt,
          borderRadius: radius ?? tokens.radius.medium,
          height,
          overflow: 'hidden',
          width,
        },
        style,
      ]}
    />
  );
}
