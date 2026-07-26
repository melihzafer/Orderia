import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import BranchSelectionScreen from '../screens/BranchSelectionScreen';
import LoginScreen from '../screens/LoginScreen';

export function AuthGate({ children }: { readonly children: React.ReactNode }) {
  const { colors } = useTheme();
  const { status, cloudEnabled, errorMessage, retry, signOut } = useAuth();

  if (status === 'unconfigured' || status === 'ready') {
    return <>{children}</>;
  }

  if (status === 'signed_out') {
    return <LoginScreen />;
  }

  if (status === 'select_branch') {
    return <BranchSelectionScreen />;
  }

  if (status === 'initializing') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.message, { color: colors.textSubtle }]}>
          Restoring your Orderia workspace…
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.centered, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>Workspace unavailable</Text>
      <Text accessibilityRole="alert" style={[styles.message, { color: colors.textSubtle }]}>
        {errorMessage ?? 'Orderia could not load this account.'}
      </Text>
      {cloudEnabled ? (
        <>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void retry();
            }}
            style={[styles.primaryAction, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.primaryText, { color: colors.primaryContrast }]}>Try again</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void signOut();
            }}
            style={styles.secondaryAction}
          >
            <Text style={[styles.secondaryText, { color: colors.textSubtle }]}>Sign out</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 14,
    maxWidth: 420,
    textAlign: 'center',
  },
  primaryAction: {
    borderRadius: 12,
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryAction: {
    marginTop: 10,
    padding: 12,
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
