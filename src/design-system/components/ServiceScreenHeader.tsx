import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { focusRing } from '../focusRing';

export interface ServiceScreenHeaderProps {
  readonly title: string;
  /** Ekranın ne için açıldığını bir cümlede anlatan alt satır. */
  readonly subtitle?: string;
  /** Hiyerarşide bir üst adıma dönüş. Verilirse başlığın üstünde kendi satırında durur. */
  readonly back?: {
    readonly label: string;
    readonly onPress: () => void;
  };
  /** Başlık satırının sağ ucunda duran tek eylem — genellikle bir ikon düğmesi. */
  readonly action?: React.ReactNode;
  readonly style?: StyleProp<ViewStyle>;
}

/**
 * Ekran başlığı.
 *
 * Her ekran bunu elle dizerken hizalar kayıyordu: geri düğmesi ile başlık yan yana
 * konulup aradaki fark `paddingTop: 6` gibi elle bulunmuş kaydırmalarla kapatılmaya
 * çalışılıyor, sonuçta başlık altındaki içerik ızgarasından onlarca piksel içeride
 * kalıyordu. Burada geri eylemi **kendi satırında** durur ve başlık, altındaki
 * kartlarla aynı sol kenardan başlar — yani ekranda tek bir hizalama ekseni olur.
 *
 * Sihirli piksel yok: bütün boşluklar `space` ölçeğinden gelir.
 */
export function ServiceScreenHeader({
  title,
  subtitle,
  back,
  action,
  style,
}: ServiceScreenHeaderProps) {
  const { tokens } = useTheme();
  const [focused, setFocused] = React.useState(false);

  return (
    <View style={[{ gap: tokens.space.xs }, style]}>
      {back ? (
        <Pressable
          accessibilityLabel={back.label}
          accessibilityRole="button"
          onBlur={() => setFocused(false)}
          onFocus={() => setFocused(true)}
          onPress={back.onPress}
          style={({ pressed }) => [
            {
              alignItems: 'center',
              alignSelf: 'flex-start',
              borderRadius: tokens.radius.full,
              flexDirection: 'row',
              gap: tokens.space.xxs,
              // Metin sola dayansın diye yatay dolgu yok; dokunma alanını
              // `hitSlop` değil, en az hedef yüksekliği taşıyor.
              minHeight: tokens.sizing.minimumTarget,
              opacity: pressed ? 0.7 : 1,
              paddingRight: tokens.space.sm,
            },
            focusRing(tokens.colors.focus, focused),
          ]}
        >
          <Ionicons color={tokens.colors.primary} name="arrow-back" size={22} />
          <Text style={[tokens.typography.label, { color: tokens.colors.primary }]}>
            {back.label}
          </Text>
        </Pressable>
      ) : null}

      <View style={{ alignItems: 'center', flexDirection: 'row', gap: tokens.space.sm }}>
        <View style={{ flex: 1 }}>
          <Text
            accessibilityRole="header"
            style={[tokens.typography.title, { color: tokens.colors.text }]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={2}
              style={[
                tokens.typography.caption,
                { color: tokens.colors.textSubtle, marginTop: tokens.space.xxs },
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {action}
      </View>
    </View>
  );
}
