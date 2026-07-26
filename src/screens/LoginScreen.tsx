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

export default function LoginScreen() {
  const { colors } = useTheme();
  const { errorMessage, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      await signIn(email, password);
    } finally {
      setSubmitting(false);
    }
  };

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
          <Text style={[styles.title, { color: colors.text }]}>Service sign in</Text>
          <Text style={[styles.subtitle, { color: colors.textSubtle }]}>
            Use the account assigned by your restaurant manager.
          </Text>

          <Text style={[styles.label, { color: colors.text }]}>Email</Text>
          <TextInput
            accessibilityLabel="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="waiter@restaurant.com"
            placeholderTextColor={colors.textMuted}
            returnKeyType="next"
            style={[
              styles.input,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.bg,
              },
            ]}
            value={email}
          />

          <Text style={[styles.label, { color: colors.text }]}>Password</Text>
          <TextInput
            accessibilityLabel="Password"
            autoCapitalize="none"
            autoComplete="current-password"
            onChangeText={setPassword}
            onSubmitEditing={() => {
              void handleSubmit();
            }}
            placeholder="Your password"
            placeholderTextColor={colors.textMuted}
            returnKeyType="go"
            secureTextEntry
            style={[
              styles.input,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.bg,
              },
            ]}
            value={password}
          />

          {errorMessage ? (
            <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>
              {errorMessage}
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
              {submitting ? 'Signing in…' : 'Sign in'}
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
});
