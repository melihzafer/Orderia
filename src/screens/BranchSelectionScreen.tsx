import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { accessibleBranches } from '../contexts/authTypes';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../i18n';

export default function BranchSelectionScreen() {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const { workspace, switchBranch, signOut, errorMessage } = useAuth();
  const branches = workspace ? accessibleBranches(workspace) : [];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t.selectBranchTitle}</Text>
          <Text style={[styles.subtitle, { color: colors.textSubtle }]}>
            {t.selectBranchSubtitle}
          </Text>
        </View>

        {branches.map((branch) => {
          const organization = workspace?.organizations.find(
            (candidate) => candidate.id === branch.organization_id,
          );
          return (
            <Pressable
              accessibilityRole="button"
              key={branch.id}
              onPress={() => {
                void switchBranch(branch.id);
              }}
              style={({ pressed }) => [
                styles.branch,
                {
                  backgroundColor: colors.surface,
                  borderColor: pressed ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.branchName, { color: colors.text }]}>{branch.name}</Text>
              <Text style={[styles.organization, { color: colors.textSubtle }]}>
                {organization?.name ?? t.defaultOrganization}
              </Text>
            </Pressable>
          );
        })}

        {errorMessage ? (
          <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>
            {errorMessage}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void signOut();
          }}
          style={styles.signOut}
        >
          <Text style={[styles.signOutText, { color: colors.textSubtle }]}>{t.signOut}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    maxWidth: 620,
    padding: 20,
    width: '100%',
  },
  header: {
    marginBottom: 24,
    marginTop: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  branch: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    minHeight: 76,
    padding: 16,
  },
  branchName: {
    fontSize: 18,
    fontWeight: '700',
  },
  organization: {
    fontSize: 14,
    marginTop: 5,
  },
  error: {
    fontSize: 14,
    marginTop: 8,
  },
  signOut: {
    alignItems: 'center',
    marginTop: 18,
    padding: 14,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
