import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Garson dostu adet kontrolü: − sayaç +
 * Ebeveyn Pressable içinde kullanıldığında dokunuşu yukarı iletmez.
 */
export function QuantityStepper({
  quantity,
  onDecrease,
  onIncrease,
  decreaseLabel,
  increaseLabel,
  compact = false,
  decreaseDisabled = false,
  increaseDisabled = false,
}: {
  readonly quantity: number;
  readonly onDecrease: () => void;
  readonly onIncrease: () => void;
  readonly decreaseLabel: string;
  readonly increaseLabel: string;
  readonly compact?: boolean;
  readonly decreaseDisabled?: boolean;
  readonly increaseDisabled?: boolean;
}) {
  const { tokens } = useTheme();
  const buttonSize = compact ? 36 : 44;
  const iconSize = compact ? 18 : 22;
  return (
    <View
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        gap: tokens.space.xxs,
        marginTop: compact ? 0 : tokens.space.xxs,
      }}
    >
      <Pressable
        accessibilityLabel={decreaseLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: decreaseDisabled }}
        disabled={decreaseDisabled}
        hitSlop={6}
        onPress={(event) => {
          event.stopPropagation();
          onDecrease();
        }}
        style={({ pressed }) => ({
          alignItems: 'center',
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.full,
          borderWidth: 1,
          height: buttonSize,
          justifyContent: 'center',
          opacity: decreaseDisabled ? 0.35 : pressed ? 0.7 : 1,
          width: buttonSize,
        })}
      >
        <Ionicons color={tokens.colors.error} name="remove" size={iconSize} />
      </Pressable>
      <Text
        style={[
          tokens.typography.bodyStrong,
          { color: tokens.colors.text, minWidth: 28, textAlign: 'center' },
        ]}
      >
        {quantity}
      </Text>
      <Pressable
        accessibilityLabel={increaseLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: increaseDisabled }}
        disabled={increaseDisabled}
        hitSlop={6}
        onPress={(event) => {
          event.stopPropagation();
          onIncrease();
        }}
        style={({ pressed }) => ({
          alignItems: 'center',
          backgroundColor: tokens.colors.accent,
          borderRadius: tokens.radius.full,
          height: buttonSize,
          justifyContent: 'center',
          opacity: increaseDisabled ? 0.35 : pressed ? 0.7 : 1,
          width: buttonSize,
        })}
      >
        <Ionicons color={tokens.colors.primaryContrast} name="add" size={iconSize} />
      </Pressable>
    </View>
  );
}
