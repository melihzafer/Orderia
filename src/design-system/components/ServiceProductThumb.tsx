import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleProp, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { toInitials } from './ServiceAvatar';

export interface ServiceProductThumbProps {
  readonly name: string;
  readonly imageUri?: string;
  readonly size?: number;
  /** Fotoğraf yoksa baş harf yerine ikon göster. */
  readonly fallbackIcon?: keyof typeof Ionicons.glyphMap;
  readonly style?: StyleProp<ViewStyle>;
}

/**
 * Menü ürününün küçük görseli. Fotoğraf tamamen isteğe bağlı olduğu için
 * boş hâli de tasarımın parçası: kare hiçbir zaman "kırık görsel" gibi durmaz,
 * ürün adının baş harflerine ya da bir ikona düşer.
 */
export function ServiceProductThumb({
  name,
  imageUri,
  size = 44,
  fallbackIcon,
  style,
}: ServiceProductThumbProps) {
  const { tokens } = useTheme();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          alignItems: 'center',
          backgroundColor: tokens.colors.surfaceAlt,
          borderColor: tokens.colors.borderLight,
          borderRadius: tokens.radius.medium,
          borderWidth: 1,
          height: size,
          justifyContent: 'center',
          overflow: 'hidden',
          width: size,
        },
        style,
      ]}
    >
      {imageUri ? (
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="cover"
          source={{ uri: imageUri }}
          style={{ height: size, width: size }}
        />
      ) : fallbackIcon ? (
        <Ionicons
          color={tokens.colors.textMuted}
          name={fallbackIcon}
          size={Math.round(size * 0.45)}
        />
      ) : (
        <Text
          style={[
            tokens.typography.caption,
            { color: tokens.colors.textMuted, fontSize: Math.round(size * 0.3) },
          ]}
        >
          {toInitials(name)}
        </Text>
      )}
    </View>
  );
}
