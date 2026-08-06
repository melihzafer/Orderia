import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import BranchSelectionScreen from '../screens/BranchSelectionScreen';
import LoginScreen from '../screens/LoginScreen';
import PendingApprovalScreen from '../screens/PendingApprovalScreen';
import RegisterScreen from '../screens/RegisterScreen';
import RestaurantAccessScreen from '../screens/RestaurantAccessScreen';
import RoleSelectionScreen from '../screens/RoleSelectionScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import { useLocalization } from '../i18n';

export function AuthGate({ children }: { readonly children: React.ReactNode }) {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const { status, cloudEnabled, errorMessage, retry, signOut } = useAuth();
  const [authView, setAuthView] = useState<'welcome' | 'login' | 'register'>('welcome');

  useEffect(() => {
    if (status === 'signed_out') {
      setAuthView('welcome');
    }
  }, [status]);

  if (status === 'unconfigured' || status === 'ready') {
    return <>{children}</>;
  }

  if (status === 'signed_out') {
    if (authView === 'register') {
      return (
        <RegisterScreen
          onBackToLogin={() => setAuthView('login')}
          onBackToWelcome={() => setAuthView('welcome')}
        />
      );
    }

    if (authView === 'login') {
      return (
        <LoginScreen
          onBackToWelcome={() => setAuthView('welcome')}
          onCreateAccount={() => setAuthView('register')}
        />
      );
    }

    return (
      <WelcomeScreen
        onSignIn={() => setAuthView('login')}
        onSignUp={() => setAuthView('register')}
      />
    );
  }

  if (status === 'pending_approval') {
    return <PendingApprovalScreen />;
  }

  if (status === 'onboarding_role') {
    return <RoleSelectionScreen />;
  }

  if (status === 'onboarding_restaurant') {
    return <RestaurantAccessScreen />;
  }

  if (status === 'select_branch') {
    return <BranchSelectionScreen />;
  }

  if (status === 'initializing') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.message, { color: colors.textSubtle }]}>{t.restoringWorkspace}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.centered, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>{t.workspaceUnavailable}</Text>
      <Text accessibilityRole="alert" style={[styles.message, { color: colors.textSubtle }]}>
        {errorMessage ?? t.workspaceUnavailableBody}
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
            <Text style={[styles.primaryText, { color: colors.primaryContrast }]}>
              {t.tryAgain}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void signOut();
            }}
            style={styles.secondaryAction}
          >
            <Text style={[styles.secondaryText, { color: colors.textSubtle }]}>{t.signOut}</Text>
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
