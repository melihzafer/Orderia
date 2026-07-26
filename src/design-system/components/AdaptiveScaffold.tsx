import React from 'react';
import { ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { AdaptiveLayout, useAdaptiveLayout } from '../layout';

export interface AdaptiveScaffoldProps {
  readonly children: React.ReactNode | ((layout: AdaptiveLayout) => React.ReactNode);
  readonly scroll?: boolean;
  readonly style?: StyleProp<ViewStyle>;
  readonly contentStyle?: StyleProp<ViewStyle>;
  readonly testID?: string;
}

export function AdaptiveScaffold({
  children,
  scroll = false,
  style,
  contentStyle,
  testID,
}: AdaptiveScaffoldProps) {
  const { tokens } = useTheme();
  const layout = useAdaptiveLayout();
  const content = typeof children === 'function' ? children(layout) : children;
  const sharedStyle: StyleProp<ViewStyle> = [
    {
      alignSelf: 'center',
      maxWidth: tokens.sizing.contentMaximumWidth,
      paddingHorizontal: layout.horizontalPadding,
      width: '100%',
    },
    contentStyle,
  ];

  if (scroll) {
    return (
      <ScrollView
        style={[{ backgroundColor: tokens.colors.bg, flex: 1 }, style]}
        contentContainerStyle={sharedStyle}
        testID={testID}
      >
        {content}
      </ScrollView>
    );
  }

  return (
    <View
      style={[{ backgroundColor: tokens.colors.bg, flex: 1 }, sharedStyle, style]}
      testID={testID}
    >
      {content}
    </View>
  );
}
