import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useLocalization, Language } from '../i18n';
import { ServiceSegmented } from '../design-system';
import { useTheme } from '../contexts/ThemeContext';

const languageOptions: readonly { value: Language; label: string }[] = [
  { value: 'tr', label: '🇹🇷 Türkçe' },
  { value: 'bg', label: '🇧🇬 Български' },
  { value: 'en', label: '🇬🇧 English' },
];

export default function LanguageSelector({ style }: { readonly style?: StyleProp<ViewStyle> }) {
  const { tokens } = useTheme();
  const { language, setLanguage, t } = useLocalization();

  return (
    <View style={[styles.container, style]}>
      <Text style={[tokens.typography.caption, { color: tokens.colors.textMuted }]}>
        {t.language}
      </Text>
      <ServiceSegmented
        fill
        label={t.language}
        onChange={setLanguage}
        options={languageOptions}
        value={language}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    width: '100%',
  },
});
