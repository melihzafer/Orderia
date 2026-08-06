import React from 'react';
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export interface ServiceSectionHeaderAction {
  readonly label: string;
  readonly onPress: () => void;
}

export interface ServiceSectionHeaderProps {
  readonly title: string;
  /** Bölümün ne işe yaradığını bir cümlede anlatan alt satır. */
  readonly caption?: string;
  /** Tek eylem için kısayol; birden fazla eylem gerekirse `actions` kullanın. */
  readonly action?: ServiceSectionHeaderAction;
  /** Sağ üstte art arda duran kısa metin eylemleri (ör. "Açıklamaları göster"). */
  readonly actions?: readonly ServiceSectionHeaderAction[];
  readonly style?: StyleProp<ViewStyle>;
}

/**
 * Ayarlar ve rapor ekranlarında satır gruplarını ayıran başlık.
 * Kart içinde değil kartın *üstünde* durur: göz gruplar arasında kart sınırlarını
 * saymak yerine başlıkları tarayabilsin diye.
 */
export function ServiceSectionHeader({
  title,
  caption,
  action,
  actions,
  style,
}: ServiceSectionHeaderProps) {
  const { tokens, density } = useTheme();
  const resolvedActions = actions ?? (action ? [action] : []);

  return (
    <View
      style={[
        {
          alignItems: 'flex-end',
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: tokens.space.xs,
          marginTop: density === 'compact' ? tokens.space.sm : tokens.space.md,
          paddingHorizontal: tokens.space.xxs,
        },
        style,
      ]}
    >
      <View style={{ flex: 1, marginRight: tokens.space.sm }}>
        <Text
          accessibilityRole="header"
          style={[
            tokens.typography.caption,
            {
              color: tokens.colors.textMuted,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
            },
          ]}
        >
          {title}
        </Text>
        {caption ? (
          <Text
            numberOfLines={2}
            style={[
              tokens.typography.caption,
              { color: tokens.colors.textSubtle, marginTop: tokens.space.xxs },
            ]}
          >
            {caption}
          </Text>
        ) : null}
      </View>
      {resolvedActions.length > 0 ? (
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: tokens.space.sm }}>
          {resolvedActions.map((entry) => (
            <Pressable
              accessibilityRole="button"
              hitSlop={12}
              key={entry.label}
              onPress={entry.onPress}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Text style={[tokens.typography.label, { color: tokens.colors.primary }]}>
                {entry.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
