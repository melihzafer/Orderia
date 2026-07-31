import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../i18n';
import { SignupRequestRow } from '../services/supabase/database.types';

export default function ApprovalsScreen() {
  const { colors } = useTheme();
  const { t, formatDateTime } = useLocalization();
  const { activeMembership, pendingApprovals, refreshApprovals, approveSignup, rejectSignup } =
    useAuth();
  const [busyId, setBusyId] = useState<string>();
  const isManager = activeMembership?.role === 'manager';

  useFocusEffect(
    useCallback(() => {
      void refreshApprovals();
    }, [refreshApprovals]),
  );

  useEffect(() => {
    void refreshApprovals();
  }, [refreshApprovals]);

  const decide = async (request: SignupRequestRow, decision: 'approve' | 'reject') => {
    setBusyId(request.id);
    try {
      if (decision === 'approve') {
        await approveSignup(request.id);
      } else {
        await rejectSignup(request.id);
      }
    } finally {
      setBusyId(undefined);
    }
  };

  if (!isManager) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <Text style={[styles.message, { color: colors.textSubtle }]}>{t.managerRole}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {pendingApprovals.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons color={colors.textMuted} name="checkmark-done-outline" size={48} />
          <Text style={[styles.message, { color: colors.textSubtle }]}>{t.noPendingApprovals}</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={pendingApprovals}
          keyExtractor={(request) => request.id}
          renderItem={({ item: request }) => (
            <View
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.cardBody}>
                <Text style={[styles.name, { color: colors.text }]}>{request.display_name}</Text>
                <Text style={[styles.email, { color: colors.textSubtle }]}>{request.email}</Text>
                <Text style={[styles.date, { color: colors.textMuted }]}>
                  {formatDateTime(Date.parse(request.requested_at))}
                </Text>
              </View>
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={busyId === request.id}
                  onPress={() => void decide(request, 'approve')}
                  style={({ pressed }) => [
                    styles.decisionButton,
                    {
                      backgroundColor: colors.success,
                      opacity: busyId === request.id ? 0.5 : pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Ionicons color={colors.primaryContrast} name="checkmark" size={18} />
                  <Text style={[styles.decisionText, { color: colors.primaryContrast }]}>
                    {t.approve}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={busyId === request.id}
                  onPress={() => void decide(request, 'reject')}
                  style={({ pressed }) => [
                    styles.decisionButton,
                    {
                      backgroundColor: colors.error,
                      opacity: busyId === request.id ? 0.5 : pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Ionicons color={colors.primaryContrast} name="close" size={18} />
                  <Text style={[styles.decisionText, { color: colors.primaryContrast }]}>
                    {t.reject}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
  },
  list: {
    gap: 12,
    padding: 16,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  cardBody: {
    marginBottom: 12,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
  },
  email: {
    fontSize: 14,
    marginTop: 2,
  },
  date: {
    fontSize: 12,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  decisionButton: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 48,
  },
  decisionText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
