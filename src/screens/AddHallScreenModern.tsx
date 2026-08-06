import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOrderiaData } from '../data/runtime';
import { useTheme } from '../contexts/ThemeContext';
import {
  haptic,
  ServiceButton,
  ServiceSurface,
  ServiceTextField,
  useSnackbar,
} from '../design-system';
import { SupabaseLayoutGateway } from '../features/layout-management';
import { useLocalization } from '../i18n';
import { RootStackParamList } from '../navigation/routes';
import { getSupabaseClient } from '../services/supabase';
import { useLayoutStore } from '../stores';

type AddHallRoute = RouteProp<RootStackParamList, 'AddHall'>;
type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function AddHallScreenModern() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<AddHallRoute>();
  const { tokens } = useTheme();
  const { t } = useLocalization();
  const data = useOrderiaData();
  const client = getSupabaseClient();
  const cloudGateway = useMemo(() => (client ? new SupabaseLayoutGateway(client) : null), [client]);
  const cloudMode = data.mode === 'cloud' && data.scope !== null;
  const halls = useLayoutStore((state) => state.halls);
  const addHall = useLayoutStore((state) => state.addHall);
  const updateHall = useLayoutStore((state) => state.updateHall);
  const [remoteHalls, setRemoteHalls] = useState<
    Awaited<ReturnType<SupabaseLayoutGateway['load']>>['halls']
  >([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const editingHall = useMemo(
    () => halls.find((hall) => hall.id === route.params?.hallId),
    [halls, route.params?.hallId],
  );
  const remoteEditingHall = remoteHalls.find((hall) => hall.id === route.params?.hallId);
  const isEditing = cloudMode ? Boolean(remoteEditingHall) : Boolean(editingHall);
  const [name, setName] = useState(editingHall?.name ?? remoteEditingHall?.name ?? '');
  const [saving, setSaving] = useState(false);
  const { show } = useSnackbar();

  useEffect(() => {
    if (!cloudMode || !cloudGateway || !data.scope) return;
    let active = true;
    setRemoteLoading(true);
    void cloudGateway
      .load(data.scope)
      .then((layout) => {
        if (active) setRemoteHalls([...layout.halls]);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setRemoteLoading(false);
      });
    return () => {
      active = false;
    };
  }, [cloudGateway, cloudMode, data.revision, data.scope]);

  useEffect(() => {
    setName((cloudMode ? remoteEditingHall?.name : editingHall?.name) ?? '');
  }, [
    cloudMode,
    editingHall?.id,
    editingHall?.name,
    remoteEditingHall?.id,
    remoteEditingHall?.name,
  ]);

  const save = () => {
    const nextName = name.trim();
    if (!nextName) {
      haptic('warning');
      show({ message: t.enterHallName, tone: 'warning' });
      return;
    }

    setSaving(true);
    void (async () => {
      try {
        if (cloudMode) {
          if (!cloudGateway || !data.scope) {
            throw new Error(t.workspaceUnavailable);
          }
          if (route.params?.hallId && !remoteEditingHall) {
            throw new Error(t.noHalls);
          }
          await cloudGateway.saveHall(data.scope, {
            ...(remoteEditingHall
              ? { id: remoteEditingHall.id, sortOrder: remoteEditingHall.sortOrder }
              : {}),
            name: nextName,
          });
          await data.refresh().catch(() => undefined);
        } else if (editingHall) {
          updateHall(editingHall.id, { name: nextName });
        } else {
          addHall({ name: nextName });
        }
        navigation.goBack();
      } catch (error) {
        haptic('error');
        show({ message: error instanceof Error ? error.message : t.genericError, tone: 'error' });
      } finally {
        setSaving(false);
      }
    })();
  };

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={{ backgroundColor: tokens.colors.bg, flex: 1 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            alignSelf: 'center',
            maxWidth: 640,
            padding: tokens.space.lg,
            paddingBottom: tokens.space.xxxl,
            width: '100%',
          }}
          keyboardShouldPersistTaps="handled"
        >
          <ServiceSurface padding="large" variant="raised">
            <ServiceTextField
              autoFocus
              label={`${t.hallName} *`}
              onChangeText={setName}
              placeholder={t.enterHallName}
              returnKeyType="done"
              onSubmitEditing={save}
              value={name}
            />
            <ServiceButton
              disabled={!name.trim() || remoteLoading}
              icon="checkmark-outline"
              label={isEditing ? t.update : t.addHall}
              loading={saving}
              onPress={save}
              style={{ marginTop: tokens.space.md }}
            />
            <ServiceButton
              label={t.cancel}
              onPress={() => navigation.goBack()}
              style={{ marginTop: tokens.space.xs }}
              variant="ghost"
            />
          </ServiceSurface>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
