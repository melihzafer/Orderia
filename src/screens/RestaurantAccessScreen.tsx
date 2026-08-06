import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  ServiceButton,
  ServiceSurface,
  ServiceTextField,
  useAdaptiveLayout,
} from '../design-system';
import { useLocalization } from '../i18n';

const restaurantCodePattern = /^[A-Z0-9]{8}$/;

export default function RestaurantAccessScreen() {
  const auth = useAuth();
  const { tokens } = useTheme();
  const { t } = useLocalization();
  const layout = useAdaptiveLayout();
  const role = auth.onboardingRole;
  const [code, setCode] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [createMode, setCreateMode] = useState(false);
  const [validationError, setValidationError] = useState<string>();
  const submitting = auth.status === 'initializing';

  if (!role) return null;

  const handleJoin = async () => {
    const normalizedCode = normalizeCode(code);
    const problem = restaurantCodePattern.test(normalizedCode)
      ? undefined
      : t.invalidRestaurantCode;
    setValidationError(problem);
    if (problem) return;

    try {
      await auth.joinRestaurant(normalizedCode);
    } catch {
      // AuthContext exposes the recoverable message.
    }
  };

  const handleCreate = async () => {
    const name = restaurantName.trim();
    if (!name) {
      setValidationError(t.invalidRestaurantName);
      return;
    }
    setValidationError(undefined);
    try {
      await auth.createRestaurant(name, branchName.trim() || undefined);
    } catch {
      // AuthContext exposes the recoverable message.
    }
  };

  const error = validationError ?? auth.errorMessage;

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
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignSelf: 'center', maxWidth: 640, width: '100%' }}>
          <View style={{ alignItems: 'flex-start', flexDirection: 'row' }}>
            <View style={{ flex: 1, marginRight: tokens.space.md }}>
              <Text style={[tokens.typography.title, { color: tokens.colors.text }]}>
                {createMode
                  ? t.createRestaurantTitle
                  : role === 'manager'
                    ? t.managerRestaurantCodeTitle
                    : t.restaurantCodeTitle}
              </Text>
              <Text
                style={[
                  tokens.typography.body,
                  { color: tokens.colors.textSubtle, marginTop: tokens.space.xs },
                ]}
              >
                {createMode
                  ? t.createRestaurantBody
                  : role === 'manager'
                    ? t.managerRestaurantCodeBody
                    : t.restaurantCodeBody}
              </Text>
            </View>
            <ServiceButton
              label={t.signOut}
              onPress={() => {
                void auth.signOut();
              }}
              variant="ghost"
            />
          </View>

          {auth.createdRestaurantCode ? (
            <ServiceSurface
              padding="large"
              style={{ marginTop: tokens.space.xl }}
              variant="outlined"
            >
              <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
                {t.restaurantCodeCreatedTitle}
              </Text>
              <Text
                style={[
                  tokens.typography.body,
                  { color: tokens.colors.textSubtle, marginTop: tokens.space.xs },
                ]}
              >
                {t.restaurantCodeCreatedBody}
              </Text>
              <Text
                selectable
                style={[
                  tokens.typography.title,
                  {
                    color: tokens.colors.primary,
                    letterSpacing: 4,
                    marginTop: tokens.space.lg,
                    textAlign: 'center',
                  },
                ]}
              >
                {auth.createdRestaurantCode}
              </Text>
              <Text
                style={[
                  tokens.typography.caption,
                  {
                    color: tokens.colors.textSubtle,
                    marginTop: tokens.space.xs,
                    textAlign: 'center',
                  },
                ]}
              >
                {t.restaurantCodeShareHint}
              </Text>
              <ServiceButton
                fullWidth
                label={t.finishOnboarding}
                loading={submitting}
                onPress={() => void auth.finishOnboarding()}
                style={{ marginTop: tokens.space.lg }}
              />
            </ServiceSurface>
          ) : createMode ? (
            <View style={{ gap: tokens.space.md, marginTop: tokens.space.xl }}>
              <ServiceTextField
                autoCapitalize="words"
                label={t.restaurantNameLabel}
                onChangeText={(value) => {
                  setRestaurantName(value);
                  setValidationError(undefined);
                  auth.selectOnboardingRole('manager');
                }}
                placeholder={t.restaurantNamePlaceholder}
                value={restaurantName}
              />
              <ServiceTextField
                autoCapitalize="words"
                label={t.branchNameLabel}
                onChangeText={(value) => {
                  setBranchName(value);
                  auth.selectOnboardingRole('manager');
                }}
                placeholder={t.branchNamePlaceholder}
                value={branchName}
              />
              {error ? (
                <Text
                  accessibilityRole="alert"
                  style={[tokens.typography.caption, { color: tokens.colors.error }]}
                >
                  {error}
                </Text>
              ) : null}
              <ServiceButton
                disabled={!restaurantName.trim() || submitting}
                fullWidth
                label={t.createRestaurantConfirm}
                loading={submitting}
                onPress={() => void handleCreate()}
              />
              <ServiceButton
                label={t.back}
                onPress={() => {
                  setCreateMode(false);
                  setValidationError(undefined);
                  auth.selectOnboardingRole('manager');
                }}
                variant="ghost"
              />
            </View>
          ) : (
            <View style={{ marginTop: tokens.space.xl }}>
              <ServiceTextField
                autoCapitalize="characters"
                autoCorrect={false}
                error={error}
                label={t.restaurantCodeLabel}
                maxLength={8}
                onChangeText={(value) => {
                  setCode(normalizeCode(value));
                  setValidationError(undefined);
                  auth.selectOnboardingRole(role);
                }}
                placeholder={t.restaurantCodePlaceholder}
                value={code}
              />
              <ServiceButton
                disabled={!code.trim() || submitting}
                fullWidth
                label={t.continueWithCode}
                loading={submitting}
                onPress={() => void handleJoin()}
                style={{ marginTop: tokens.space.md }}
              />

              {role === 'manager' ? (
                <>
                  <View
                    style={{
                      alignItems: 'center',
                      flexDirection: 'row',
                      marginVertical: tokens.space.lg,
                    }}
                  >
                    <View style={{ backgroundColor: tokens.colors.border, flex: 1, height: 1 }} />
                    <Text
                      style={[
                        tokens.typography.caption,
                        { color: tokens.colors.textMuted, marginHorizontal: tokens.space.sm },
                      ]}
                    >
                      {t.or}
                    </Text>
                    <View style={{ backgroundColor: tokens.colors.border, flex: 1, height: 1 }} />
                  </View>
                  <ServiceButton
                    fullWidth
                    icon="business-outline"
                    label={t.createRestaurant}
                    onPress={() => {
                      setCreateMode(true);
                      setValidationError(undefined);
                      auth.selectOnboardingRole('manager');
                    }}
                    variant="outline"
                  />
                </>
              ) : (
                <ServiceSurface
                  padding="small"
                  style={{ marginTop: tokens.space.xl }}
                  variant="muted"
                >
                  <Text style={[tokens.typography.body, { color: tokens.colors.textSubtle }]}>
                    {t.contactManager}
                  </Text>
                </ServiceSurface>
              )}
            </View>
          )}

          {!auth.createdRestaurantCode && !createMode ? (
            <ServiceButton
              label={t.back}
              onPress={auth.resetOnboardingRole}
              style={{ alignSelf: 'center', marginTop: tokens.space.md }}
              variant="ghost"
            />
          ) : null}
          {submitting && !auth.createdRestaurantCode ? (
            <ActivityIndicator
              color={tokens.colors.primary}
              style={{ marginTop: tokens.space.md }}
            />
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function normalizeCode(value: string): string {
  return value
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase()
    .slice(0, 8);
}
