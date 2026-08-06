import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { haptic, ServiceConfirmSheet } from '../design-system';
import { useLocalization } from '../i18n';

export default function DeviceManagementScreen() {
  const { colors } = useTheme();
  const { t, formatDateTime } = useLocalization();
  const { devices, currentDeviceId, activeMembership, refreshDevices, revokeDevice } = useAuth();
  const isManager = activeMembership?.role === 'manager';
  // Hook'lar yönetici olmayan için verilen erken dönüşün üstünde durmalı.
  const [pendingRevokeId, setPendingRevokeId] = useState<string>();

  useEffect(() => {
    if (isManager) {
      void refreshDevices();
    }
  }, [isManager, refreshDevices]);

  if (!isManager) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <Ionicons name="lock-closed-outline" size={34} color={colors.textSubtle} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {t.deviceManagerAccessRequired}
        </Text>
      </View>
    );
  }

  const pendingRevoke = devices.find((device) => device.id === pendingRevokeId);
  const revokingCurrentDevice = pendingRevoke?.id === currentDeviceId;

  const confirmRevocation = (deviceId: string) => {
    haptic('warning');
    setPendingRevokeId(deviceId);
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
              {t.deviceLoadingAuthorized}
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
                      {platformLabel(device.platform, t)}
                      {isCurrent ? ` · ${t.deviceThisDevice}` : ''}
                    </Text>
                    <Text style={[styles.meta, { color: colors.textSubtle }]}>
                      {t.deviceAppVersion} {device.app_version} · {t.deviceLastSeen}{' '}
                      {formatDateTime(Date.parse(device.last_seen_at))}
                    </Text>
                    {isRevoked ? (
                      <Text style={[styles.status, { color: colors.error }]}>
                        {t.deviceRevoked}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {!isRevoked ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => confirmRevocation(device.id)}
                    style={({ pressed }) => [
                      styles.revokeButton,
                      {
                        borderColor: colors.error,
                        opacity: pressed ? 0.65 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.revokeText, { color: colors.error }]}>
                      {t.deviceRevoke}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <ServiceConfirmSheet
        body={revokingCurrentDevice ? t.deviceRevokeConfirmCurrent : t.deviceRevokeConfirmOther}
        cancelLabel={t.deviceKeepDevice}
        confirmLabel={t.deviceRevoke}
        destructive
        onClose={() => setPendingRevokeId(undefined)}
        onConfirm={() => {
          const target = pendingRevokeId;
          setPendingRevokeId(undefined);
          if (target) void revokeDevice(target);
        }}
        title={t.deviceRevokeConfirmTitle}
        visible={pendingRevoke !== undefined}
      />
    </SafeAreaView>
  );
}

function platformLabel(
  platform: 'android' | 'ios_web' | 'web',
  t: { devicePlatformAndroid: string; devicePlatformIosWeb: string; devicePlatformWeb: string },
): string {
  if (platform === 'android') return t.devicePlatformAndroid;
  if (platform === 'ios_web') return t.devicePlatformIosWeb;
  return t.devicePlatformWeb;
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
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 48,
    paddingHorizontal: 10,
  },
  revokeText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
