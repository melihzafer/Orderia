import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ServiceButton, ServiceChoiceCard, useAdaptiveLayout } from '../design-system';
import { useLocalization } from '../i18n';

export default function RoleSelectionScreen() {
  const { signOut, selectOnboardingRole } = useAuth();
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
          maxWidth: tokens.sizing.contentMaximumWidth,
          paddingBottom: tokens.space.xxxl,
          paddingHorizontal: layout.horizontalPadding,
          paddingTop: tokens.space.xl,
          width: '100%',
        }}
      >
        <View style={{ maxWidth: 640, width: '100%', alignSelf: 'center' }}>
          <Text style={[tokens.typography.title, { color: tokens.colors.text }]}>
            {t.chooseRoleTitle}
          </Text>
          <Text
            style={[
              tokens.typography.body,
              { color: tokens.colors.textSubtle, marginTop: tokens.space.xs },
            ]}
          >
            {t.chooseRoleBody}
          </Text>

          <View accessibilityRole="radiogroup" style={{ gap: tokens.space.sm }}>
            <ServiceChoiceCard
              description={t.waiterRoleBody}
              icon="restaurant-outline"
              onPress={() => selectOnboardingRole('waiter')}
              selected={false}
              title={t.waiterRole}
            />
            <ServiceChoiceCard
              description={t.managerRoleBody}
              icon="business-outline"
              onPress={() => selectOnboardingRole('manager')}
              selected={false}
              title={t.managerRole}
            />
          </View>

          <ServiceButton
            label={t.signOut}
            onPress={() => {
              void signOut();
            }}
            style={{ alignSelf: 'center', marginTop: tokens.space.md }}
            variant="ghost"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
