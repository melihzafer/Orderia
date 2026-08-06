import React, { useState } from 'react';
import { Pressable, ScrollView, StyleProp, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export interface ServiceSegmentedOption<TValue extends string> {
  readonly value: TValue;
  readonly label: string;
  /** Sağda gösterilen sayaç, örneğin açık adisyon adedi. */
  readonly count?: number;
}

export interface ServiceSegmentedProps<TValue extends string> {
  readonly options: readonly ServiceSegmentedOption<TValue>[];
  readonly value: TValue;
  readonly onChange: (next: TValue) => void;
  readonly label: string;
  /** true ise segmentler eşit genişlikte bölünür; false ise yatay kaydırılır. */
  readonly fill?: boolean;
  readonly style?: StyleProp<ViewStyle>;
}

/**
 * Sipariş özeti sekmeleri gibi birbirini dışlayan görünüm seçimleri için.
 * Az sayıda ve kısa etiketli seçenekte `fill`, uzun listede kaydırma kullanılır.
 */
export function ServiceSegmented<TValue extends string>({
  options,
  value,
  onChange,
  label,
  fill = false,
  style,
}: ServiceSegmentedProps<TValue>) {
  const { tokens } = useTheme();

  const segments = options.map((option) => (
    <Segment
      count={option.count}
      fill={fill}
      key={option.value}
      label={option.label}
      onPress={() => onChange(option.value)}
      selected={option.value === value}
    />
  ));

  const containerStyle: ViewStyle = {
    backgroundColor: tokens.colors.surfaceAlt,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 3,
  };

  if (fill) {
    return (
      <View accessibilityLabel={label} accessibilityRole="tablist" style={[containerStyle, style]}>
        {segments}
      </View>
    );
  }

  return (
    <ScrollView
      accessibilityLabel={label}
      accessibilityRole="tablist"
      contentContainerStyle={containerStyle}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
    >
      {segments}
    </ScrollView>
  );
}

interface SegmentProps {
  readonly label: string;
  readonly count?: number;
  readonly selected: boolean;
  readonly fill: boolean;
  readonly onPress: () => void;
}

function Segment({ label, count, selected, fill, onPress }: SegmentProps) {
  const { tokens } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      accessibilityLabel={count === undefined ? label : `${label}, ${count}`}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: selected ? tokens.colors.surface : 'transparent',
        borderColor: focused ? tokens.colors.focus : 'transparent',
        borderRadius: tokens.radius.full,
        borderWidth: focused ? 3 : 0,
        flex: fill ? 1 : undefined,
        flexDirection: 'row',
        justifyContent: 'center',
        minHeight: tokens.sizing.minimumTarget,
        opacity: pressed ? 0.75 : 1,
        paddingHorizontal: tokens.space.sm,
        ...(selected ? tokens.elevation.card : tokens.elevation.none),
      })}
    >
      <Text
        numberOfLines={1}
        style={[
          tokens.typography.label,
          { color: selected ? tokens.colors.text : tokens.colors.textSubtle },
        ]}
      >
        {label}
      </Text>
      {count === undefined ? null : (
        <View
          style={{
            backgroundColor: selected ? tokens.colors.accentSoft : 'transparent',
            borderRadius: tokens.radius.full,
            marginLeft: tokens.space.xxs,
            paddingHorizontal: tokens.space.xxs,
          }}
        >
          <Text
            style={[
              tokens.typography.caption,
              { color: selected ? tokens.colors.accent : tokens.colors.textMuted },
            ]}
          >
            {count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
