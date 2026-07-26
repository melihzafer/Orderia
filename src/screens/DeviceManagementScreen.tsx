import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function DeviceManagementScreen() {
  const { colors } = useTheme();
  const { devices, currentDeviceId, activeMembership, refreshDevices, revokeDevice } = useAuth();
  const isManager = activeMembership?.role === 'manager';

  useEffect(() => {
    if (isManager) {
      void refreshDevices();
    }
  }, [isManager, refreshDevices]);

  if (!isManager) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <Ionicons name="lock-closed-outline" size={34} color={colors.textSubtle} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Manager access required</Text>
      </View>
    );
  }

  const confirmRevocation = (deviceId: string, isCurrent: boolean) => {
    Alert.alert(
      'Revoke device?',
      isCurrent
        ? 'This is your current device. Revoking it will sign you out.'
        : 'The device will be rejected the next time it connects to Orderia.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: () => {
            void revokeDevice(deviceId);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: colors.bg }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {devices.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSubtle }]}>
              Loading authorized devices…
            </Text>
          </View>
        ) : (
          devices.map((device) => {
            const isCurrent = device.id === currentDeviceId;
            const isRevoked = device.revoked_at !== null;
            return (
              <View
                key={device.id}
                style={[
                  styles.deviceCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.deviceHeader}>
                  <Ionicons
                    color={isRevoked ? colors.error : colors.primary}
                    name={
                      device.platform === 'android' ? 'phone-portrait-outline' : 'globe-outline'
                    }
                    size={24}
                  />
                  <View style={styles.deviceInfo}>
                    <Text style={[styles.deviceName, { color: colors.text }]}>
                      {platformLabel(device.platform)}
                      {isCurrent ? ' · This device' : ''}
                    </Text>
                    <Text style={[styles.meta, { color: colors.textSubtle }]}>
                      App {device.app_version} · Last seen{' '}
                      {new Date(device.last_seen_at).toLocaleString()}
                    </Text>
                    <Text
                      style={[
                        styles.status,
                        {
                          color: isRevoked ? colors.error : colors.success,
                        },
                      ]}
                    >
                      {isRevoked ? 'Revoked' : 'Authorized'}
                    </Text>
                  </View>
                </View>

                {!isRevoked ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => confirmRevocation(device.id, isCurrent)}
                    style={({ pressed }) => [
                      styles.revokeButton,
                      {
                        borderColor: colors.error,
                        opacity: pressed ? 0.65 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.revokeText, { color: colors.error }]}>Revoke</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function platformLabel(platform: 'android' | 'ios_web' | 'web'): string {
  if (platform === 'android') return 'Android';
  if (platform === 'ios_web') return 'iPhone / iPad Safari';
  return 'Web browser';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 160,
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 10,
  },
  deviceCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  deviceHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  deviceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '700',
  },
  meta: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  status: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 7,
  },
  revokeButton: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 14,
    padding: 10,
  },
  revokeText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
