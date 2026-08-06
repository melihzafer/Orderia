import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../i18n';

const POLL_INTERVAL_MS = 20_000;

export default function PendingApprovalScreen() {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const { pendingSignupEmail, retry, signOut } = useAuth();

  // Onay geldiğinde ekranın kendiliğinden açılması için periyodik kontrol
  useEffect(() => {
    const timer = setInterval(() => {
      void retry();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [retry]);

  return (
    <View style={[styles.centered, { backgroundColor: colors.bg }]}>
      <Ionicons color={colors.warning} name="time-outline" size={56} />
      <Text style={[styles.title, { color: colors.text }]}>{t.pendingApprovalTitle}</Text>
      <Text style={[styles.message, { color: colors.textSubtle }]}>
        {t.pendingApprovalBody}
        {pendingSignupEmail ? `\n${pendingSignupEmail}` : ''}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void retry();
        }}
        style={[styles.primaryAction, { backgroundColor: colors.primary }]}
      >
        <Text style={[styles.primaryText, { color: colors.primaryContrast }]}>{t.checkAgain}</Text>
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
      <ActivityIndicator color={colors.textMuted} style={styles.spinner} />
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
    marginTop: 16,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
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
  spinner: {
    marginTop: 18,
  },
});
