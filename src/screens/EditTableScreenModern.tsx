import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOrderiaData } from '../data/runtime';
import { useTheme } from '../contexts/ThemeContext';
import {
  haptic,
  ServiceButton,
  ServiceConfirmSheet,
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

type EditTableRoute = RouteProp<RootStackParamList, 'EditTable'>;
type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function EditTableScreenModern() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<EditTableRoute>();
  const { tokens } = useTheme();
  const { t } = useLocalization();
  const data = useOrderiaData();
  const client = getSupabaseClient();
  const cloudGateway = useMemo(() => (client ? new SupabaseLayoutGateway(client) : null), [client]);
  const cloudMode = data.mode === 'cloud' && data.scope !== null;
  const table = useLayoutStore((state) => state.getTable(route.params.tableId));
  const updateTable = useLayoutStore((state) => state.updateTable);
  const deleteTable = useLayoutStore((state) => state.deleteTable);
  const [tableName, setTableName] = useState(table?.label ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const { show } = useSnackbar();

  if (!table) {
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

  const save = () => {
    setSaving(true);
    void (async () => {
      try {
        const nextLabel = tableName.trim();
        if (cloudMode) {
          if (!cloudGateway || !data.scope) throw new Error(t.workspaceUnavailable);
          await cloudGateway.saveTable(data.scope, {
            id: table.id,
            hallId: table.hallId,
            label: nextLabel || table.label || t.tableName,
          });
          await data.refresh().catch(() => undefined);
        } else {
          updateTable(table.id, { label: nextLabel || undefined });
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

  const requestDelete = () => {
    if (table.isOpen) {
      haptic('warning');
      show({ message: t.tableDeleteBlocked, tone: 'warning' });
      return;
    }
    setDeletePending(true);
  };

  const performDelete = () => {
    setDeletePending(false);
    setDeleting(true);
    void (async () => {
      try {
        if (cloudMode && cloudGateway && data.scope) {
          await cloudGateway.archiveTable(data.scope, table.id);
          await data.refresh().catch(() => undefined);
        } else {
          deleteTable(table.id);
        }
        haptic('success');
        show({ message: t.tableDeleted, tone: 'success' });
        navigation.goBack();
      } catch (error) {
        haptic('error');
        show({ message: error instanceof Error ? error.message : t.genericError, tone: 'error' });
      } finally {
        setDeleting(false);
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
          contentContainerStyle={{ gap: tokens.space.lg, padding: tokens.space.lg }}
          keyboardShouldPersistTaps="handled"
        >
          <ServiceSurface padding="large" variant="raised">
            <ServiceTextField
              autoFocus
              label={t.tableName}
              onChangeText={setTableName}
              placeholder={t.enterNewTableName}
              value={tableName}
            />
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: tokens.space.xs,
                marginTop: tokens.space.md,
              }}
            >
              <ServiceButton
                label={t.cancel}
                onPress={() => navigation.goBack()}
                style={{ flexBasis: 140, flexGrow: 1 }}
                variant="ghost"
              />
              <ServiceButton
                icon="checkmark-outline"
                label={t.save}
                loading={saving}
                onPress={save}
                style={{ flexBasis: 180, flexGrow: 1 }}
              />
            </View>
          </ServiceSurface>

          <ServiceSectionHeader title={t.deleteTable} />
          <ServiceSurface variant="outlined">
            <ServiceButton
              fullWidth
              icon="trash-outline"
              label={t.deleteTable}
              loading={deleting}
              onPress={requestDelete}
              variant="danger"
            />
          </ServiceSurface>
        </ScrollView>
      </KeyboardAvoidingView>

      <ServiceConfirmSheet
        body={t.deleteTableConfirm}
        cancelLabel={t.cancel}
        confirmLabel={t.deleteTable}
        destructive
        onClose={() => setDeletePending(false)}
        onConfirm={performDelete}
        title={t.deleteTable}
        visible={deletePending}
      />
    </SafeAreaView>
  );
}
