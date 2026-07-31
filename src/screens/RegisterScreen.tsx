import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../i18n';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen({ onBackToLogin }: { readonly onBackToLogin: () => void }) {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const { errorMessage, signUp } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string>();

  const validate = (): string | undefined => {
    if (!displayName.trim()) return t.displayNameLabel;
    if (!emailPattern.test(email.trim())) return t.invalidEmail;
    if (password.length < 6) return t.passwordTooShort;
    if (password !== confirmPassword) return t.passwordsDoNotMatch;
    return undefined;
  };

  const canSubmit =
    displayName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length > 0 &&
    confirmPassword.length > 0 &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const problem = validate();
    setValidationError(problem);
    if (problem) return;

    setSubmitting(true);
    try {
      await signUp(email, password, displayName);
      // Başarılı kayıtta AuthContext 'pending_approval' durumuna geçer
      // ve AuthGate otomatik olarak bekleme ekranını gösterir.
    } catch {
      // errorMessage AuthContext tarafından set edildi
    } finally {
      setSubmitting(false);
    }
  };

  const shownError = validationError ?? errorMessage;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.centered}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.brand, { color: colors.primary }]}>Orderia</Text>
          <Text style={[styles.title, { color: colors.text }]}>{t.registerTitle}</Text>
          <Text style={[styles.subtitle, { color: colors.textSubtle }]}>{t.registerSubtitle}</Text>

          <Text style={[styles.label, { color: colors.text }]}>{t.displayNameLabel}</Text>
          <TextInput
            accessibilityLabel={t.displayNameLabel}
            autoComplete="name"
            onChangeText={setDisplayName}
            placeholder="Ayşe Yılmaz"
            placeholderTextColor={colors.textMuted}
            returnKeyType="next"
            style={[
              styles.input,
              { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg },
            ]}
            value={displayName}
          />

          <Text style={[styles.label, { color: colors.text }]}>{t.emailLabel}</Text>
          <TextInput
            accessibilityLabel={t.emailLabel}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="garson@restoran.com"
            placeholderTextColor={colors.textMuted}
            returnKeyType="next"
            style={[
              styles.input,
              { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg },
            ]}
            value={email}
          />

          <Text style={[styles.label, { color: colors.text }]}>{t.passwordLabel}</Text>
          <TextInput
            accessibilityLabel={t.passwordLabel}
            autoCapitalize="none"
            autoComplete="new-password"
            onChangeText={setPassword}
            placeholderTextColor={colors.textMuted}
            returnKeyType="next"
            secureTextEntry
            style={[
              styles.input,
              { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg },
            ]}
            value={password}
          />

          <Text style={[styles.label, { color: colors.text }]}>{t.confirmPasswordLabel}</Text>
          <TextInput
            accessibilityLabel={t.confirmPasswordLabel}
            autoCapitalize="none"
            autoComplete="new-password"
            onChangeText={setConfirmPassword}
            onSubmitEditing={() => {
              void handleSubmit();
            }}
            placeholderTextColor={colors.textMuted}
            returnKeyType="go"
            secureTextEntry
            style={[
              styles.input,
              { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg },
            ]}
            value={confirmPassword}
          />

          {shownError ? (
            <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>
              {shownError}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={!canSubmit}
            onPress={() => {
              void handleSubmit();
            }}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: colors.primary,
                opacity: !canSubmit ? 0.45 : pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={[styles.buttonText, { color: colors.primaryContrast }]}>
              {submitting ? t.registering : t.register}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onBackToLogin}
            style={styles.secondaryAction}
          >
            <Text style={[styles.secondaryText, { color: colors.textSubtle }]}>
              {t.haveAccount}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    alignSelf: 'center',
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 420,
    padding: 24,
    width: '100%',
  },
  brand: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 7,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    marginBottom: 16,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  button: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryAction: {
    alignItems: 'center',
    marginTop: 14,
    padding: 10,
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
