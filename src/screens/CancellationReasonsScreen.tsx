import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  haptic,
  ServiceButton,
  ServiceListRow,
  ServiceRowGroup,
  ServiceSectionHeader,
  ServiceSurface,
  ServiceTextField,
  useSnackbar,
} from '../design-system';
import {
  ManagedCancellationReason,
  SupabaseCancellationReasonGateway,
} from '../features/cancellation-reasons';
import { settingsCopy } from '../features/app-settings';
import { useLocalization } from '../i18n';
import { getSupabaseClient } from '../services/supabase';

export default function CancellationReasonsScreen() {
  const { tokens } = useTheme();
  const { language, t } = useLocalization();
  const copy = useMemo(() => settingsCopy(language), [language]);
  const auth = useAuth();
  const { show } = useSnackbar();
  const client = getSupabaseClient();
  const gateway = useMemo(
    () => (client ? new SupabaseCancellationReasonGateway(client) : null),
    [client],
  );
  const scope = useMemo(
    () =>
      auth.activeBranch
        ? { organizationId: auth.activeBranch.organization_id, branchId: auth.activeBranch.id }
        : null,
    [auth.activeBranch],
  );
  const isManager = auth.activeMembership?.role === 'manager';

  const [reasons, setReasons] = useState<readonly ManagedCancellationReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [requiresManager, setRequiresManager] = useState(false);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    if (!gateway || !scope) return;
    setLoading(true);
    try {
      setReasons(await gateway.list(scope));
    } catch {
      show({ message: t.genericError, tone: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gateway, scope]);

  if (!isManager) {
    return (
      <View
        style={{
          alignItems: 'center',
          backgroundColor: tokens.colors.bg,
          flex: 1,
          justifyContent: 'center',
          padding: tokens.space.lg,
        }}
      >
        <Ionicons color={tokens.colors.textSubtle} name="lock-closed-outline" size={34} />
        <Text
          style={[
            tokens.typography.bodyStrong,
            { color: tokens.colors.text, marginTop: tokens.space.sm, textAlign: 'center' },
          ]}
        >
          {copy.cancellationReasonsAccessRequired}
        </Text>
      </View>
    );
  }

  const addReason = async () => {
    if (!gateway || !scope) return;
    const trimmed = name.trim();
    if (!trimmed) {
      haptic('warning');
      show({ message: copy.enterReasonName, tone: 'warning' });
      return;
    }
    setSaving(true);
    try {
      await gateway.create(scope, { name: trimmed, requiresManager });
      setName('');
      setRequiresManager(false);
      await refresh();
      haptic('success');
      show({ message: copy.reasonAdded, tone: 'success' });
    } catch {
      haptic('error');
      show({ message: t.genericError, tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (reason: ManagedCancellationReason) => {
    if (!gateway || !scope) return;
    try {
      await gateway.setActive(scope, reason.id, !reason.isActive);
      await refresh();
      haptic('success');
      show({ message: copy.reasonUpdated, tone: 'success' });
    } catch {
      haptic('error');
      show({ message: t.genericError, tone: 'error' });
    }
  };

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={{ backgroundColor: tokens.colors.bg, flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{
          alignSelf: 'center',
          gap: tokens.space.lg,
          maxWidth: tokens.sizing.contentMaximumWidth,
          padding: tokens.space.lg,
          paddingBottom: tokens.space.xxxl,
          width: '100%',
        }}
      >
        <ServiceSectionHeader
          caption={copy.cancellationReasonsBody}
          title={copy.cancellationReasonsTitle}
        />

        <ServiceSurface padding="large" variant="raised">
          <ServiceTextField
            label={copy.reasonNameLabel}
            onChangeText={setName}
            placeholder={copy.reasonNamePlaceholder}
            value={name}
          />
          <ServiceListRow
            accessory="switch"
            icon="shield-checkmark-outline"
            onValueChange={setRequiresManager}
            style={{ marginTop: tokens.space.md }}
            subtitle={copy.requiresManagerBody}
            switchValue={requiresManager}
            title={copy.requiresManagerLabel}
          />
          <ServiceButton
            icon="add-circle-outline"
            label={copy.addReason}
            loading={saving}
            onPress={() => void addReason()}
            style={{ marginTop: tokens.space.md }}
          />
        </ServiceSurface>

        {!loading && reasons.length === 0 ? (
          <Text style={[tokens.typography.body, { color: tokens.colors.textSubtle }]}>
            {copy.cancellationReasonsEmpty}
          </Text>
        ) : (
          <ServiceRowGroup>
            {reasons.map((reason, index) => (
              <ServiceListRow
                accessory="switch"
                icon={reason.requiresManager ? 'shield-checkmark-outline' : 'close-circle-outline'}
                key={reason.id}
                last={index === reasons.length - 1}
                onValueChange={() => void toggleActive(reason)}
                subtitle={reason.requiresManager ? copy.requiresManagerLabel : undefined}
                switchValue={reason.isActive}
                title={reason.name}
              />
            ))}
          </ServiceRowGroup>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
