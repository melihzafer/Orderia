import React from 'react';
import { Image, StyleProp, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export interface ServiceAvatarProps {
  readonly name: string;
  readonly imageUri?: string;
  readonly size?: number;
  readonly style?: StyleProp<ViewStyle>;
}

/** Fotoğraf yoksa baş harflere düşen yuvarlak kimlik göstergesi. */
export function ServiceAvatar({ name, imageUri, size = 48, style }: ServiceAvatarProps) {
  const { tokens } = useTheme();
  const initials = toInitials(name);

  return (
    <View
      accessibilityLabel={name}
      style={[
        {
          alignItems: 'center',
          backgroundColor: tokens.colors.accentSoft,
          borderColor: tokens.colors.borderLight,
          borderRadius: tokens.radius.full,
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
      ) : (
        <Text
          style={[
            tokens.typography.label,
            { color: tokens.colors.accent, fontSize: Math.round(size * 0.36) },
          ]}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}

export function toInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/u)
    .filter((part) => part.length > 0);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toLocaleUpperCase();
}
