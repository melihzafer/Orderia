import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { SurfaceCard } from '../../components';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useOrderiaData } from '../../data/runtime';
import { DeviceId, toDomainId } from '../../domain';
import { useLocalization } from '../../i18n';
import {
  LegacyMigrationReport,
  LegacyMigrationSnapshot,
  prepareLegacyMigration,
} from './legacyMigration';

interface SelectedMigration {
  readonly snapshot: LegacyMigrationSnapshot;
  readonly report: LegacyMigrationReport;
  readonly fileName: string;
  readonly recoveryJson: string;
}

export function LegacyMigrationCard() {
  const { colors } = useTheme();
  const { language, formatPrice } = useLocalization();
  const auth = useAuth();
  const data = useOrderiaData();
  const copy = useMemo(() => migrationCopy(language), [language]);
  const [selected, setSelected] = useState<SelectedMigration>();
  const [serverReport, setServerReport] = useState<LegacyMigrationReport>();
  const [busy, setBusy] = useState<'inspect' | 'apply'>();
  const [completed, setCompleted] = useState(false);

  const inspectFile = async () => {
    setBusy('inspect');
    setCompleted(false);
    setServerReport(undefined);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const prepared = prepareLegacyMigration(JSON.parse(fileContent));
      setSelected({
        ...prepared,
        fileName: result.assets[0].name,
        recoveryJson: fileContent,
      });
      if (
        auth.activeMembership?.role === 'manager' &&
        data.mode === 'cloud' &&
        prepared.report.reconciled
      ) {
        const remote = await data.inspectLegacyMigration(prepared.snapshot);
        setServerReport(remote.report);
        setCompleted(remote.status === 'completed');
      }
    } catch (error) {
      Alert.alert(copy.invalidTitle, error instanceof Error ? error.message : copy.tryAgain);
    } finally {
      setBusy(undefined);
    }
  };

  const effectiveReport = serverReport ?? selected?.report;
  const canApply =
    Boolean(selected) &&
    Boolean(serverReport) &&
    Boolean(effectiveReport?.reconciled) &&
    auth.activeMembership?.role === 'manager' &&
    Boolean(auth.currentDeviceId) &&
    !completed &&
    !busy;

  const applyMigration = () => {
    if (!selected || !auth.currentDeviceId || !effectiveReport?.reconciled) return;
    Alert.alert(copy.confirmTitle, copy.confirmBody, [
      { text: copy.cancel, style: 'cancel' },
      {
        text: copy.apply,
        onPress: () => {
          void performApply(selected);
        },
      },
    ]);
  };

  const performApply = async (migration: SelectedMigration) => {
    if (!auth.currentDeviceId) return;
    setBusy('apply');
    try {
      const recoveryPath =
        `${FileSystem.documentDirectory}orderia-legacy-recovery-` +
        `${migration.report.snapshotHash.slice(0, 12)}.json`;
      await FileSystem.writeAsStringAsync(recoveryPath, migration.recoveryJson);
      const result = await data.applyLegacyMigration(
        toDomainId<DeviceId>(auth.currentDeviceId),
        migration.snapshot,
      );
      setServerReport(result.report);
      setCompleted(true);
      Alert.alert(copy.doneTitle, result.idempotentReplay ? copy.alreadyDone : copy.doneBody);
    } catch (error) {
      Alert.alert(copy.failedTitle, error instanceof Error ? error.message : copy.tryAgain);
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <SurfaceCard style={{ marginBottom: 16 }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', marginBottom: 12 }}>
        <Ionicons name="git-compare-outline" size={24} color={colors.primary} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            accessibilityRole="header"
            style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}
          >
            {copy.title}
          </Text>
          <Text style={{ color: colors.textSubtle, fontSize: 13, marginTop: 3 }}>
            {copy.subtitle}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={Boolean(busy)}
        onPress={() => void inspectFile()}
        style={{
          alignItems: 'center',
          backgroundColor: colors.surfaceAlt,
          borderColor: colors.border,
          borderRadius: 10,
          borderWidth: 1,
          flexDirection: 'row',
          minHeight: 52,
          paddingHorizontal: 14,
        }}
      >
        {busy === 'inspect' ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Ionicons name="document-outline" size={21} color={colors.primary} />
        )}
        <Text style={{ color: colors.text, flex: 1, fontWeight: '700', marginLeft: 10 }}>
          {busy === 'inspect' ? copy.inspecting : copy.choose}
        </Text>
      </Pressable>

      {selected && effectiveReport ? (
        <View
          style={{
            backgroundColor: colors.surfaceAlt,
            borderRadius: 10,
            marginTop: 12,
            padding: 14,
          }}
        >
          <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '700' }}>
            {selected.fileName}
          </Text>
          <Text style={{ color: colors.textSubtle, fontSize: 12, marginTop: 4 }}>
            SHA-256: {effectiveReport.snapshotHash.slice(0, 16)}…
          </Text>
          <Text style={{ color: colors.text, marginTop: 10 }}>
            {copy.entities(effectiveReport)}
          </Text>
          <Text style={{ color: colors.text, marginTop: 4 }}>
            {copy.finance(
              formatPrice(effectiveReport.sourceClosedGrossMinor),
              formatPrice(effectiveReport.computedClosedGrossMinor),
            )}
          </Text>
          <Text
            accessibilityRole="alert"
            style={{
              color: effectiveReport.reconciled ? colors.success : colors.error,
              fontWeight: '800',
              marginTop: 8,
            }}
          >
            {effectiveReport.reconciled
              ? copy.reconciled(effectiveReport.warningCount)
              : copy.blocked(effectiveReport.blockingIssueCount)}
          </Text>
          {effectiveReport.issues.slice(0, 5).map((issue, index) => (
            <Text
              key={`${issue.code}-${issue.path}-${index}`}
              style={{
                color: issue.severity === 'error' ? colors.error : colors.warning,
                fontSize: 12,
                marginTop: 6,
              }}
            >
              • {issue.code}: {issue.message}
            </Text>
          ))}
        </View>
      ) : null}

      {completed ? (
        <Text
          accessibilityRole="alert"
          style={{ color: colors.success, fontWeight: '800', marginTop: 12 }}
        >
          {copy.completed}
        </Text>
      ) : null}

      <Pressable
        accessibilityHint={copy.applyHint}
        accessibilityRole="button"
        disabled={!canApply}
        onPress={applyMigration}
        style={{
          alignItems: 'center',
          backgroundColor: canApply ? colors.primary : colors.surfaceAlt,
          borderRadius: 10,
          justifyContent: 'center',
          marginTop: 12,
          minHeight: 52,
          opacity: canApply ? 1 : 0.6,
        }}
      >
        {busy === 'apply' ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={{ color: canApply ? '#FFFFFF' : colors.textMuted, fontWeight: '800' }}>
            {copy.apply}
          </Text>
        )}
      </Pressable>
      <Text style={{ color: colors.textSubtle, fontSize: 12, lineHeight: 18, marginTop: 8 }}>
        {data.mode !== 'cloud' ? copy.cloudRequired : copy.guardrail}
      </Text>
    </SurfaceCard>
  );
}

function migrationCopy(language: string) {
  if (language === 'tr') {
    return {
      title: 'Eski veri geçişi',
      subtitle: 'Önce doğrula ve mutabakat yap; sonra boş şubeye uygula.',
      choose: 'Yedek seç ve dry-run yap',
      inspecting: 'Yedek doğrulanıyor…',
      apply: 'Doğrulanmış geçişi uygula',
      applyHint: 'Yalnız sunucu raporu temizse ve hedef şube boşsa etkinleşir.',
      invalidTitle: 'Yedek doğrulanamadı',
      failedTitle: 'Geçiş tamamlanamadı',
      tryAgain: 'Tekrar deneyin.',
      confirmTitle: 'Eski veriyi bu şubeye aktar?',
      confirmBody:
        'Snapshot’ın ikinci recovery kopyası saklanacak. İşlem yalnız boş şubede ve tek transaction içinde çalışır.',
      cancel: 'Vazgeç',
      doneTitle: 'Geçiş tamamlandı',
      doneBody: 'Kayıt sayıları ve finansal toplamlar eşleşti.',
      alreadyDone: 'Bu snapshot daha önce aktarılmış; ikinci kez kayıt oluşturulmadı.',
      completed: 'Bu snapshot sunucuda tamamlandı ve tekrar uygulanmayacak.',
      cloudRequired: 'Sunucu onayı ve uygulama için Orderia Cloud bağlantısı gerekir.',
      guardrail: 'Snapshot sunucuda tutulmaz; yalnız SHA-256, mapping ve denetim raporu saklanır.',
      entities: (report: LegacyMigrationReport) =>
        `${report.counts.tables} masa · ${report.counts.menuItems} ürün · ${report.counts.openTickets} açık · ${report.counts.closedTickets} kapanmış hesap`,
      finance: (source: string, computed: string) =>
        `Eski kapanmış toplam: ${source} · Satırlardan hesaplanan: ${computed}`,
      reconciled: (warnings: number) => `Mutabakat başarılı · ${warnings} uyarı`,
      blocked: (errors: number) => `Geçiş bloklandı · ${errors} hata`,
    };
  }
  if (language === 'bg') {
    return {
      title: 'Миграция на стари данни',
      subtitle: 'Първо проверка и сверяване, после импорт в празен обект.',
      choose: 'Избери архив и направи dry-run',
      inspecting: 'Архивът се проверява…',
      apply: 'Приложи проверената миграция',
      applyHint: 'Активно само след чист сървърен отчет и за празен обект.',
      invalidTitle: 'Архивът е невалиден',
      failedTitle: 'Миграцията не завърши',
      tryAgain: 'Опитайте отново.',
      confirmTitle: 'Да се импортират ли старите данни?',
      confirmBody:
        'Ще се запази второ recovery копие. Импортът работи само в празен обект и в една транзакция.',
      cancel: 'Отказ',
      doneTitle: 'Миграцията завърши',
      doneBody: 'Броят записи и финансовите суми съвпадат.',
      alreadyDone: 'Този архив вече е импортиран; няма дублирани записи.',
      completed: 'Този архив вече е завършен на сървъра.',
      cloudRequired: 'За сървърна проверка и импорт е нужна връзка с Orderia Cloud.',
      guardrail: 'Архивът не се пази на сървъра; пазят се само SHA-256, mapping и отчет.',
      entities: (report: LegacyMigrationReport) =>
        `${report.counts.tables} маси · ${report.counts.menuItems} артикула · ${report.counts.openTickets} отворени · ${report.counts.closedTickets} затворени сметки`,
      finance: (source: string, computed: string) =>
        `Стара сума: ${source} · Изчислена от редовете: ${computed}`,
      reconciled: (warnings: number) => `Сверяването е успешно · ${warnings} предупреждения`,
      blocked: (errors: number) => `Миграцията е блокирана · ${errors} грешки`,
    };
  }
  return {
    title: 'Legacy data migration',
    subtitle: 'Validate and reconcile first, then import into an empty branch.',
    choose: 'Choose backup and run dry-run',
    inspecting: 'Validating backup…',
    apply: 'Apply verified migration',
    applyHint: 'Enabled only after a clean server report for an empty branch.',
    invalidTitle: 'Backup could not be validated',
    failedTitle: 'Migration did not complete',
    tryAgain: 'Please try again.',
    confirmTitle: 'Import legacy data into this branch?',
    confirmBody:
      'A second recovery copy will be retained. Import runs only in an empty branch and in one transaction.',
    cancel: 'Cancel',
    doneTitle: 'Migration completed',
    doneBody: 'Entity counts and financial totals reconcile.',
    alreadyDone: 'This snapshot was already imported; no duplicate records were created.',
    completed: 'This snapshot is complete on the server and cannot be applied twice.',
    cloudRequired: 'Orderia Cloud is required for server verification and apply.',
    guardrail:
      'The snapshot is not retained server-side; only its SHA-256, mappings and audit report are stored.',
    entities: (report: LegacyMigrationReport) =>
      `${report.counts.tables} tables · ${report.counts.menuItems} items · ${report.counts.openTickets} open · ${report.counts.closedTickets} closed checks`,
    finance: (source: string, computed: string) =>
      `Legacy closed gross: ${source} · Computed from lines: ${computed}`,
    reconciled: (warnings: number) => `Reconciled · ${warnings} warnings`,
    blocked: (errors: number) => `Migration blocked · ${errors} errors`,
  };
}
