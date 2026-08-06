import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOrderiaData } from '../data/runtime';
import { useTheme } from '../contexts/ThemeContext';
import {
  haptic,
  ServiceButton,
  ServiceEmptyState,
  ServiceSectionHeader,
  ServiceSurface,
  ServiceTextField,
  useSnackbar,
} from '../design-system';
import { SupabaseLayoutGateway } from '../features/layout-management';
import { useLocalization } from '../i18n';
import { RootStackParamList } from '../navigation/routes';
import { getSupabaseClient } from '../services/supabase';
import { useLayoutStore } from '../stores';

type AddTableRoute = RouteProp<RootStackParamList, 'AddTable'>;
type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function AddTableScreenModern() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<AddTableRoute>();
  const { tokens } = useTheme();
  const { t } = useLocalization();
  const data = useOrderiaData();
  const client = getSupabaseClient();
  const cloudGateway = useMemo(() => (client ? new SupabaseLayoutGateway(client) : null), [client]);
  const cloudMode = data.mode === 'cloud' && data.scope !== null;
  const halls = useLayoutStore((state) => state.halls);
  const tables = useLayoutStore((state) => state.tables);
  const addTable = useLayoutStore((state) => state.addTable);
  const updateTable = useLayoutStore((state) => state.updateTable);
  const table = useMemo(
    () => tables.find((candidate) => candidate.id === route.params.tableId),
    [route.params.tableId, tables],
  );
  const hallId = table?.hallId ?? route.params.hallId;
  const hall = halls.find((candidate) => candidate.id === hallId);
  const [remoteLayout, setRemoteLayout] = useState<Awaited<
    ReturnType<SupabaseLayoutGateway['load']>
  > | null>(null);
  const remoteHall = remoteLayout?.halls.find((candidate) => candidate.id === hallId);
  const remoteTable = remoteLayout?.tables.find(
    (candidate) => candidate.id === route.params.tableId,
  );
  const displayHall = cloudMode ? remoteHall : hall;
  const isEditing = cloudMode ? Boolean(remoteTable) : Boolean(table);
  const displayName = cloudMode ? remoteTable?.label : table?.label;
  const [name, setName] = useState(displayName ?? '');
  const [saving, setSaving] = useState(false);
  const { show } = useSnackbar();

  useEffect(() => {
    if (!cloudMode || !cloudGateway || !data.scope) return;
    let active = true;
    void cloudGateway
      .load(data.scope)
      .then((next) => {
        if (active) setRemoteLayout(next);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [cloudGateway, cloudMode, data.revision, data.scope]);

  useEffect(() => {
    setName(displayName ?? '');
  }, [displayName, remoteTable?.id, table?.id]);

  const save = () => {
    if (!displayHall) return;

    setSaving(true);
    void (async () => {
      try {
        const nextName = name.trim();
        if (cloudMode) {
          if (!cloudGateway || !data.scope) throw new Error(t.workspaceUnavailable);
          if (route.params.tableId && !remoteTable) throw new Error(t.tableNotFound);
          const sequenceNumber = remoteTable?.sequenceNumber ?? remoteHall?.nextTableSequence ?? 1;
          await cloudGateway.saveTable(data.scope, {
            ...(remoteTable ? { id: remoteTable.id } : {}),
            hallId: displayHall.id,
            label: nextName || `${t.tableName} ${sequenceNumber}`,
            sequenceNumber,
          });
          await data.refresh().catch(() => undefined);
        } else if (table) {
          updateTable(table.id, { label: nextName || undefined });
        } else {
          addTable({ hallId: displayHall.id, label: nextName || undefined });
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

  if (!displayHall) {
    return (
      <SafeAreaView style={{ backgroundColor: tokens.colors.bg, flex: 1 }}>
        <ServiceEmptyState
          action={{ label: t.close, onPress: navigation.goBack }}
          body={t.tableNotFound}
          icon="grid-outline"
          title={t.tableNotFound}
        />
      </SafeAreaView>
    );
  }

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
            gap: tokens.space.lg,
            maxWidth: tokens.sizing.contentMaximumWidth,
            padding: tokens.space.lg,
            paddingBottom: tokens.space.xxxl,
            width: '100%',
          }}
          keyboardShouldPersistTaps="handled"
        >
          <ServiceSectionHeader
            caption={displayHall.name}
            title={isEditing ? t.editTable : t.addTable}
          />
          <ServiceSurface padding="large" variant="raised">
            <Text style={[tokens.typography.body, { color: tokens.colors.textSubtle }]}>
              {t.enterNewTableName}
            </Text>
            <ServiceTextField
              autoFocus
              label={t.tableName}
              onChangeText={setName}
              placeholder={`${t.tableName} ${displayHall.nextTableSequence}`}
              returnKeyType="done"
              onSubmitEditing={save}
              value={name}
            />
            <Text
              style={[
                tokens.typography.caption,
                { color: tokens.colors.textMuted, marginTop: tokens.space.xs },
              ]}
            >
              {t.tableNameHint}
            </Text>
            <ServiceButton
              disabled={saving}
              icon="checkmark-outline"
              label={isEditing ? t.save : t.addTable}
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
