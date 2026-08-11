import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Barrel üzerinden değil doğrudan: bkz. LoginScreen'deki aynı not (AuthGate döngüsü).
import { BrandLogo } from '../components/BrandLogo';
import LanguageSelector from '../components/LanguageSelector';
import { useTheme } from '../contexts/ThemeContext';
import { ServiceButton, ServiceSurface, useAdaptiveLayout } from '../design-system';
import { useLocalization } from '../i18n';

export default function WelcomeScreen({
  onSignIn,
  onSignUp,
}: {
  readonly onSignIn: () => void;
  readonly onSignUp: () => void;
}) {
  const { tokens } = useTheme();
  const { t } = useLocalization();
  const layout = useAdaptiveLayout();

  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left', 'right']}
      style={{ backgroundColor: tokens.colors.bg, flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{
          alignSelf: 'center',
          flexGrow: 1,
          justifyContent: 'center',
          maxWidth: 560,
          paddingBottom: tokens.space.xl,
          paddingHorizontal: layout.horizontalPadding,
          paddingTop: tokens.space.lg,
          width: '100%',
        }}
        keyboardShouldPersistTaps="handled"
      >
        <LanguageSelector style={{ marginBottom: tokens.space.xl }} />

        <ServiceSurface style={{ padding: tokens.space.xl }}>
          <BrandLogo markSize={64} style={{ marginBottom: tokens.space.md }} />
          <Text
            style={[
              tokens.typography.body,
              {
                color: tokens.colors.textSubtle,
                marginTop: tokens.space.xs,
                textAlign: 'center',
              },
            ]}
          >
            {t.welcomeSubtitle}
          </Text>

          <View style={{ gap: tokens.space.sm, marginTop: tokens.space.xl }}>
            <ServiceButton
              fullWidth
              icon="log-in-outline"
              label={t.welcomeSignIn}
              onPress={onSignIn}
              size="large"
            />
            <ServiceButton
              fullWidth
              icon="person-add-outline"
              label={t.welcomeSignUp}
              onPress={onSignUp}
              size="large"
              variant="outline"
            />
          </View>

          <Text
            style={[
              tokens.typography.caption,
              { color: tokens.colors.textMuted, marginTop: tokens.space.lg, textAlign: 'center' },
            ]}
          >
            {t.welcomeFootnote}
          </Text>
        </ServiceSurface>
      </ScrollView>
    </SafeAreaView>
  );
}
