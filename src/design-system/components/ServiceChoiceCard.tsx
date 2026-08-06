import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export interface ServiceChoiceCardProps {
  readonly title: string;
  readonly description?: string;
  readonly icon?: keyof typeof Ionicons.glyphMap;
  readonly selected: boolean;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  readonly style?: StyleProp<ViewStyle>;
}

/**
 * Birbirini dışlayan ama açıklama isteyen seçimler için (servis modu gibi).
 * Segmented kontrol tek kelimelik seçeneklere yeter; burada seçimin *sonucu*
 * anlatılmak zorunda olduğu için kart tercih edilir.
 */
export function ServiceChoiceCard({
  title,
  description,
  icon,
  selected,
  onPress,
  disabled = false,
  style,
}: ServiceChoiceCardProps) {
  const { tokens, density } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      accessibilityLabel={description ? `${title}. ${description}` : title}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: selected ? tokens.colors.accentSoft : tokens.colors.surface,
          borderColor: focused
            ? tokens.colors.focus
            : selected
              ? tokens.colors.primary
              : tokens.colors.border,
          borderRadius: tokens.radius.large,
          borderWidth: focused || selected ? 2 : 1,
          flex: 1,
          minHeight: density === 'compact' ? 76 : 96,
          opacity: pressed ? 0.85 : disabled ? 0.5 : 1,
          padding: tokens.space.sm,
        },
        style,
      ]}
    >
      <View style={{ alignItems: 'center', flexDirection: 'row' }}>
        {icon ? (
          <Ionicons
            color={selected ? tokens.colors.primary : tokens.colors.textSubtle}
            name={icon}
            size={20}
            style={{ marginRight: tokens.space.xs }}
          />
        ) : null}
        <Text
          numberOfLines={1}
          style={[
            tokens.typography.label,
            { color: selected ? tokens.colors.primary : tokens.colors.text, flex: 1 },
          ]}
        >
          {title}
        </Text>
        {selected ? (
          <Ionicons color={tokens.colors.primary} name="checkmark-circle" size={20} />
        ) : null}
      </View>
      {description ? (
        <Text
          numberOfLines={2}
          style={[
            tokens.typography.caption,
            { color: tokens.colors.textSubtle, marginTop: tokens.space.xs },
          ]}
        >
          {description}
        </Text>
      ) : null}
    </Pressable>
  );
}
