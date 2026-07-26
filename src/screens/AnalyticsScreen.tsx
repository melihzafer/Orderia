import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { accessibleBranches } from '../contexts/authTypes';
import { useTheme } from '../contexts/ThemeContext';
import { useOrderiaData } from '../data/runtime';
import { UserId } from '../domain';
import {
  ServiceButton,
  ServiceEmptyState,
  ServiceSkeleton,
  ServiceStatusPill,
  ServiceSurface,
  ServiceTextField,
  useAdaptiveLayout,
} from '../design-system';
import {
  DailyRevenueBars,
  ManagerKpi,
  ManagerKpiGrid,
  ManagerReport,
  ManagerReportRange,
  WaiterPerformanceCard,
  WaiterPerformanceRow,
  assertManagerReportRange,
  formatMinor,
  managerReportRange,
  presentManagerReportCsv,
} from '../features/manager-reports';
import { useLocalization } from '../i18n';

export default function AnalyticsScreen() {
  const auth = useAuth();
  const { tokens } = useTheme();
  const { language } = useLocalization();
  const layout = useAdaptiveLayout();
  const { loadManagerReport, mode, sync } = useOrderiaData();
  const copy = reportCopy(language);
  const timezone = auth.activeBranch?.timezone ?? 'UTC';
  const initialRange = useMemo(() => managerReportRange(timezone, 7), [timezone]);
  const [range, setRange] = useState<ManagerReportRange>(initialRange);
  const [rangeDraft, setRangeDraft] = useState<ManagerReportRange>(initialRange);
  const [report, setReport] = useState<ManagerReport>();
  const [waiterOptions, setWaiterOptions] = useState<readonly WaiterPerformanceRow[]>([]);
  const [selectedWaiterId, setSelectedWaiterId] = useState<UserId>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const branchSwitchInFlight = useRef(false);
  const isManager = auth.activeMembership?.role === 'manager' || auth.status === 'unconfigured';
  const cloudReady = mode === 'cloud' && sync.online && isManager;

  const branches = useMemo(
    () =>
      auth.workspace
        ? accessibleBranches(auth.workspace).filter(
            (branch) => branch.organization_id === auth.activeBranch?.organization_id,
          )
        : [],
    [auth.activeBranch?.organization_id, auth.workspace],
  );

  const load = useCallback(async () => {
    if (branchSwitchInFlight.current) return;
    if (!cloudReady) {
      setLoading(false);
      setRefreshing(false);
      setErrorMessage(isManager ? copy.onlineRequired : copy.managerRequired);
      return;
    }
    setLoading(true);
    try {
      assertManagerReportRange(range);
      const next = await loadManagerReport(range.dateFrom, range.dateTo, selectedWaiterId);
      setReport(next);
      if (!selectedWaiterId) setWaiterOptions(next.waiters);
      setErrorMessage(undefined);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.loadFailed);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    cloudReady,
    copy.loadFailed,
    copy.managerRequired,
    copy.onlineRequired,
    isManager,
    loadManagerReport,
    range,
    selectedWaiterId,
  ]);

  useEffect(() => {
    void load();
  }, [auth.activeBranch?.id, load]);

  const applyPreset = (days: number) => {
    const next = managerReportRange(timezone, days);
    setRangeDraft(next);
    setRange(next);
  };

  const applyRange = () => {
    try {
      assertManagerReportRange(rangeDraft);
      if (rangeDraft.dateFrom === range.dateFrom && rangeDraft.dateTo === range.dateTo) {
        void load();
      } else {
        setRange(rangeDraft);
      }
    } catch (error) {
      Alert.alert(copy.invalidRange, error instanceof Error ? error.message : copy.tryAgain);
    }
  };

  const switchBranch = async (branchId: string) => {
    if (branchId === auth.activeBranch?.id) return;
    branchSwitchInFlight.current = true;
    try {
      setSelectedWaiterId(undefined);
      setWaiterOptions([]);
      await auth.switchBranch(branchId);
      const nextBranch = branches.find((branch) => branch.id === branchId);
      const nextRange = managerReportRange(nextBranch?.timezone ?? 'UTC', 7);
      setRangeDraft(nextRange);
      setRange(nextRange);
    } catch (error) {
      Alert.alert(copy.branchFailed, error instanceof Error ? error.message : copy.tryAgain);
    } finally {
      branchSwitchInFlight.current = false;
    }
  };

  const exportReport = async () => {
    if (!report) return;
    setExporting(true);
    try {
      await presentManagerReportCsv(report);
    } catch (error) {
      Alert.alert(copy.exportFailed, error instanceof Error ? error.message : copy.tryAgain);
    } finally {
      setExporting(false);
    }
  };

  const kpis = report ? managerKpis(report, language, copy) : [];
  const selectedWaiterName = waiterOptions.find(
    (waiter) => waiter.userId === selectedWaiterId,
  )?.displayName;

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ backgroundColor: tokens.colors.bg, flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{
          alignSelf: 'center',
          gap: tokens.space.lg,
          maxWidth: tokens.sizing.contentMaximumWidth,
          paddingBottom: tokens.space.xxl,
          paddingHorizontal: layout.horizontalPadding,
          paddingTop: tokens.space.lg,
          width: '100%',
        }}
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            refreshing={refreshing}
            tintColor={tokens.colors.primary}
          />
        }
      >
        <View
          style={{
            alignItems: 'flex-start',
            flexDirection: layout.mode === 'compact' ? 'column' : 'row',
            gap: tokens.space.sm,
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={[tokens.typography.title, { color: tokens.colors.text }]}>
              {copy.title}
            </Text>
            <Text
              style={[
                tokens.typography.body,
                { color: tokens.colors.textSubtle, marginTop: tokens.space.xs },
              ]}
            >
              {copy.subtitle}
            </Text>
          </View>
          <ServiceStatusPill
            icon={cloudReady ? 'shield-checkmark-outline' : 'cloud-offline-outline'}
            label={cloudReady ? copy.serverConfirmed : copy.unavailable}
            tone={cloudReady ? 'success' : 'warning'}
          />
        </View>

        {branches.length > 1 ? (
          <View>
            <Text
              style={[
                tokens.typography.label,
                { color: tokens.colors.text, marginBottom: tokens.space.xs },
              ]}
            >
              {copy.branch}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs }}>
              {branches.map((branch) => (
                <ReportChip
                  key={branch.id}
                  active={branch.id === auth.activeBranch?.id}
                  label={branch.name}
                  onPress={() => void switchBranch(branch.id)}
                />
              ))}
            </View>
          </View>
        ) : null}

        <ServiceSurface style={{ gap: tokens.space.md }} variant="outlined">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs }}>
            <ReportChip label={copy.today} onPress={() => applyPreset(1)} />
            <ReportChip label={copy.sevenDays} onPress={() => applyPreset(7)} />
            <ReportChip label={copy.thirtyDays} onPress={() => applyPreset(30)} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm }}>
            <ServiceTextField
              autoCapitalize="none"
              containerStyle={{ flexBasis: 190, flexGrow: 1 }}
              label={copy.dateFrom}
              onChangeText={(dateFrom) => setRangeDraft((current) => ({ ...current, dateFrom }))}
              placeholder="YYYY-MM-DD"
              value={rangeDraft.dateFrom}
            />
            <ServiceTextField
              autoCapitalize="none"
              containerStyle={{ flexBasis: 190, flexGrow: 1 }}
              label={copy.dateTo}
              onChangeText={(dateTo) => setRangeDraft((current) => ({ ...current, dateTo }))}
              placeholder="YYYY-MM-DD"
              value={rangeDraft.dateTo}
            />
            <ServiceButton
              icon="refresh-outline"
              label={copy.apply}
              onPress={applyRange}
              style={{ alignSelf: 'flex-end' }}
            />
          </View>
        </ServiceSurface>

        {waiterOptions.length > 0 ? (
          <View>
            <Text
              style={[
                tokens.typography.label,
                { color: tokens.colors.text, marginBottom: tokens.space.xs },
              ]}
            >
              {copy.waiterFilter}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs }}>
              <ReportChip
                active={!selectedWaiterId}
                label={copy.allWaiters}
                onPress={() => setSelectedWaiterId(undefined)}
              />
              {waiterOptions.map((waiter) => (
                <ReportChip
                  key={waiter.userId}
                  active={waiter.userId === selectedWaiterId}
                  label={waiter.displayName}
                  onPress={() => setSelectedWaiterId(waiter.userId)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {errorMessage ? (
          <ServiceEmptyState
            action={{ label: copy.retry, onPress: () => void load() }}
            body={errorMessage}
            icon="analytics-outline"
            title={copy.unavailable}
          />
        ) : loading && !report ? (
          <View style={{ gap: tokens.space.sm }}>
            <ServiceSkeleton height={128} label={copy.loading} />
            <ServiceSkeleton height={220} label={copy.loading} />
            <ServiceSkeleton height={220} label={copy.loading} />
          </View>
        ) : report ? (
          <>
            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: tokens.space.sm,
                justifyContent: 'space-between',
              }}
            >
              <View>
                <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
                  {selectedWaiterName
                    ? `${selectedWaiterName} · ${copy.contributionView}`
                    : copy.branchOverview}
                </Text>
                <Text style={[tokens.typography.caption, { color: tokens.colors.textMuted }]}>
                  {report.dateFrom} → {report.dateTo} · {report.branchName}
                </Text>
              </View>
              <ServiceButton
                icon="download-outline"
                label={copy.exportCsv}
                loading={exporting}
                onPress={() => void exportReport()}
                variant="outline"
              />
            </View>

            <ManagerKpiGrid items={kpis} />

            <ServiceSurface style={{ gap: tokens.space.md }} variant="outlined">
              <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
                {selectedWaiterName ? copy.dailyContribution : copy.dailyRevenue}
              </Text>
              <DailyRevenueBars
                currencyCode={report.currencyCode}
                days={report.daily}
                language={language}
                selectedWaiter={Boolean(selectedWaiterId)}
              />
            </ServiceSurface>

            <View style={{ gap: tokens.space.sm }}>
              <View>
                <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
                  {copy.waiterContributions}
                </Text>
                <Text style={[tokens.typography.caption, { color: tokens.colors.textMuted }]}>
                  {copy.notLeaderboard}
                </Text>
              </View>
              {report.waiters.map((waiter) => (
                <WaiterPerformanceCard
                  key={waiter.userId}
                  currencyCode={report.currencyCode}
                  language={language}
                  waiter={waiter}
                />
              ))}
            </View>

            <ServiceSurface style={{ gap: tokens.space.md }} variant="outlined">
              <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
                {copy.cancellationContext}
              </Text>
              {report.cancellations.length === 0 ? (
                <Text style={[tokens.typography.body, { color: tokens.colors.textSubtle }]}>
                  {copy.noCancellations}
                </Text>
              ) : (
                report.cancellations.map((cancellation) => (
                  <View
                    key={cancellation.orderItemId}
                    style={{
                      borderBottomColor: tokens.colors.borderLight,
                      borderBottomWidth: 1,
                      gap: tokens.space.xxs,
                      paddingBottom: tokens.space.sm,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text
                        style={[
                          tokens.typography.bodyStrong,
                          { color: tokens.colors.text, flex: 1 },
                        ]}
                      >
                        {cancellation.tableLabel} · {cancellation.itemName}
                      </Text>
                      <Text style={[tokens.typography.label, { color: tokens.colors.warning }]}>
                        {formatMinor(
                          cancellation.excludedAmountMinor,
                          report.currencyCode,
                          language,
                        )}
                      </Text>
                    </View>
                    <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle }]}>
                      {cancellation.reasonName} · {cancellation.cancelledByDisplayName}
                    </Text>
                  </View>
                ))
              )}
            </ServiceSurface>

            <ServiceSurface style={{ gap: tokens.space.xs }} variant="outlined">
              <Text style={[tokens.typography.subtitle, { color: tokens.colors.text }]}>
                {copy.definitions}
              </Text>
              <Definition label={copy.revenueDefinition} />
              <Definition label={copy.contributionDefinition} />
              <Definition label={copy.paymentDefinition} />
              <Definition label={copy.activeTimeDefinition} />
            </ServiceSurface>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ReportChip({
  active = false,
  label,
  onPress,
}: {
  readonly active?: boolean;
  readonly label: string;
  readonly onPress: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole={active ? 'radio' : 'button'}
      accessibilityState={active ? { checked: true } : undefined}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: active ? tokens.colors.surfaceAlt : tokens.colors.surface,
        borderColor: active ? tokens.colors.primary : tokens.colors.border,
        borderRadius: tokens.radius.full,
        borderWidth: active ? 2 : 1,
        justifyContent: 'center',
        minHeight: tokens.sizing.minimumTarget,
        opacity: pressed ? 0.78 : 1,
        paddingHorizontal: tokens.space.md,
      })}
    >
      <Text
        style={[
          tokens.typography.label,
          { color: active ? tokens.colors.primary : tokens.colors.textSubtle },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Definition({ label }: { readonly label: string }) {
  const { tokens } = useTheme();
  return (
    <View style={{ flexDirection: 'row' }}>
      <Text style={[tokens.typography.body, { color: tokens.colors.primary }]}>• </Text>
      <Text style={[tokens.typography.caption, { color: tokens.colors.textSubtle, flex: 1 }]}>
        {label}
      </Text>
    </View>
  );
}

function managerKpis(
  report: ManagerReport,
  language: 'tr' | 'bg' | 'en',
  copy: ReturnType<typeof reportCopy>,
): readonly ManagerKpi[] {
  const summary = report.summary;
  const selected = report.selectedWaiterId !== undefined;
  return [
    {
      label: selected ? copy.waiterContribution : copy.confirmedRevenue,
      value: formatMinor(
        selected ? (summary.selectedWaiterContributionMinor ?? 0) : summary.confirmedRevenueMinor,
        report.currencyCode,
        language,
      ),
      helper: selected ? copy.itemAttribution : copy.confirmedOnly,
      icon: 'cash-outline',
      tone: 'primary',
    },
    {
      label: copy.receipts,
      value: `${summary.receiptCount}`,
      helper: `${summary.confirmedPaymentCount} ${copy.paymentsShort}`,
      icon: 'receipt-outline',
    },
    {
      label: copy.openTables,
      value: `${summary.currentOpenTableCount}`,
      helper: `${summary.currentPaymentPendingCount} ${copy.paymentPending}`,
      icon: 'restaurant-outline',
      tone: summary.currentPaymentPendingCount > 0 ? 'warning' : 'neutral',
    },
    {
      label: copy.openBalance,
      value: formatMinor(summary.currentOpenBalanceMinor, report.currencyCode, language),
      helper: `${summary.activeWaiterCount} ${copy.activeWaiters}`,
      icon: 'time-outline',
      tone: 'warning',
    },
    {
      label: copy.averageReceipt,
      value: formatMinor(summary.averageReceiptMinor, report.currencyCode, language),
      helper: `${summary.servedTableCount} ${copy.servedTables}`,
      icon: 'analytics-outline',
    },
    {
      label: copy.cancellations,
      value: `${summary.cancelledItemCount}`,
      helper: formatMinor(summary.cancelledValueMinor, report.currencyCode, language),
      icon: 'close-circle-outline',
      tone: summary.cancelledItemCount > 0 ? 'warning' : 'neutral',
    },
  ];
}

function reportCopy(language: 'tr' | 'bg' | 'en') {
  if (language === 'tr') {
    return {
      title: 'Yönetici raporu',
      subtitle: 'Canlı operasyonu ve garson katkısını doğrulanmış server kayıtlarıyla izle.',
      serverConfirmed: 'Server doğrulamalı',
      unavailable: 'Rapor kullanılamıyor',
      onlineRequired: 'Yönetici raporu için internet bağlantısı gerekli.',
      managerRequired: 'Bu rapor yalnız yöneticiler tarafından görüntülenebilir.',
      loadFailed: 'Yönetici raporu yüklenemedi.',
      branch: 'Şube',
      today: 'Bugün',
      sevenDays: '7 gün',
      thirtyDays: '30 gün',
      dateFrom: 'Başlangıç',
      dateTo: 'Bitiş',
      apply: 'Uygula',
      waiterFilter: 'Garson filtresi',
      allWaiters: 'Tüm garsonlar',
      invalidRange: 'Tarih aralığını kontrol et',
      tryAgain: 'Tekrar deneyin.',
      branchFailed: 'Şube değiştirilemedi',
      exportFailed: 'Rapor dışa aktarılamadı',
      retry: 'Tekrar dene',
      loading: 'Rapor yükleniyor',
      contributionView: 'katkı görünümü',
      branchOverview: 'Şube özeti',
      exportCsv: 'CSV indir',
      dailyContribution: 'Günlük garson katkısı',
      dailyRevenue: 'Günlük doğrulanmış ciro',
      waiterContributions: 'Garson katkıları',
      notLeaderboard: 'Bu liste puan tablosu değildir; satır ve ödeme kaynaklarını açıklar.',
      cancellationContext: 'İptal bağlamı',
      noCancellations: 'Seçili dönemde iptal işlemi yok.',
      definitions: 'Metrik tanımları',
      revenueDefinition:
        'Ciro yalnız issued fişlere bağlı confirmed payment allocation toplamıdır.',
      contributionDefinition:
        'Garson katkısı, iptal edilmemiş ürün satırının created_by alanına göre hesaplanır.',
      paymentDefinition:
        'Alınan ödeme ayrıca payment.created_by üzerinden gösterilir; masa tek garsona yazılmaz.',
      activeTimeDefinition:
        'Gözlenen süre bordro vardiyası değil, ilk ve son kayıtlı aksiyon arasındaki süredir.',
      waiterContribution: 'Garson ciro katkısı',
      confirmedRevenue: 'Doğrulanmış ciro',
      itemAttribution: 'Ürün satırı created_by',
      confirmedOnly: 'Yalnız confirmed ödemeler',
      receipts: 'Kapanan fiş',
      paymentsShort: 'ödeme',
      openTables: 'Açık masa',
      paymentPending: 'ödeme bekliyor',
      openBalance: 'Açık bakiye',
      activeWaiters: 'aktif garson',
      averageReceipt: 'Ortalama fiş',
      servedTables: 'servis verilen masa',
      cancellations: 'İptal',
    };
  }
  if (language === 'bg') {
    return {
      title: 'Управленски отчет',
      subtitle: 'Следете операцията и приноса чрез потвърдени сървърни данни.',
      serverConfirmed: 'Потвърдено от сървъра',
      unavailable: 'Отчетът не е достъпен',
      onlineRequired: 'За управленския отчет е необходим интернет.',
      managerRequired: 'Този отчет е само за мениджъри.',
      loadFailed: 'Отчетът не можа да се зареди.',
      branch: 'Обект',
      today: 'Днес',
      sevenDays: '7 дни',
      thirtyDays: '30 дни',
      dateFrom: 'Начало',
      dateTo: 'Край',
      apply: 'Приложи',
      waiterFilter: 'Филтър по сервитьор',
      allWaiters: 'Всички сервитьори',
      invalidRange: 'Проверете периода',
      tryAgain: 'Опитайте отново.',
      branchFailed: 'Обектът не можа да се смени',
      exportFailed: 'Отчетът не можа да се експортира',
      retry: 'Опитай отново',
      loading: 'Зареждане на отчет',
      contributionView: 'изглед на приноса',
      branchOverview: 'Обобщение за обекта',
      exportCsv: 'Изтегли CSV',
      dailyContribution: 'Дневен принос',
      dailyRevenue: 'Дневен потвърден оборот',
      waiterContributions: 'Принос на сервитьорите',
      notLeaderboard: 'Това не е класация; показва произхода на редовете и плащанията.',
      cancellationContext: 'Контекст на анулиранията',
      noCancellations: 'Няма анулирания за периода.',
      definitions: 'Дефиниции',
      revenueDefinition: 'Оборотът е сборът от потвърдени разпределения към издадени разписки.',
      contributionDefinition: 'Приносът е по created_by на неанулираните редове.',
      paymentDefinition:
        'Плащанията са отделно по payment.created_by; масата няма един собственик.',
      activeTimeDefinition:
        'Наблюдаваното време е между първото и последното действие, не работна смяна.',
      waiterContribution: 'Принос към оборота',
      confirmedRevenue: 'Потвърден оборот',
      itemAttribution: 'created_by на реда',
      confirmedOnly: 'Само потвърдени плащания',
      receipts: 'Разписки',
      paymentsShort: 'плащания',
      openTables: 'Отворени маси',
      paymentPending: 'чакат плащане',
      openBalance: 'Отворен баланс',
      activeWaiters: 'активни сервитьори',
      averageReceipt: 'Средна разписка',
      servedTables: 'обслужени маси',
      cancellations: 'Анулирания',
    };
  }
  return {
    title: 'Manager report',
    subtitle: 'Track live operations and waiter contribution from server-confirmed records.',
    serverConfirmed: 'Server confirmed',
    unavailable: 'Report unavailable',
    onlineRequired: 'An internet connection is required for manager reporting.',
    managerRequired: 'This report is available to managers only.',
    loadFailed: 'The manager report could not be loaded.',
    branch: 'Branch',
    today: 'Today',
    sevenDays: '7 days',
    thirtyDays: '30 days',
    dateFrom: 'Start',
    dateTo: 'End',
    apply: 'Apply',
    waiterFilter: 'Waiter filter',
    allWaiters: 'All waiters',
    invalidRange: 'Check the date range',
    tryAgain: 'Try again.',
    branchFailed: 'Branch could not be changed',
    exportFailed: 'Report could not be exported',
    retry: 'Try again',
    loading: 'Loading report',
    contributionView: 'contribution view',
    branchOverview: 'Branch overview',
    exportCsv: 'Download CSV',
    dailyContribution: 'Daily waiter contribution',
    dailyRevenue: 'Daily confirmed revenue',
    waiterContributions: 'Waiter contributions',
    notLeaderboard: 'This is not a leaderboard; it explains item and payment attribution.',
    cancellationContext: 'Cancellation context',
    noCancellations: 'No cancellation actions in this period.',
    definitions: 'Metric definitions',
    revenueDefinition: 'Revenue is confirmed payment allocations linked to issued receipts.',
    contributionDefinition: 'Waiter contribution follows created_by on non-cancelled item rows.',
    paymentDefinition:
      'Payments handled follow payment.created_by; a table is not assigned to one owner.',
    activeTimeDefinition: 'Observed time spans first to last action and is not a payroll shift.',
    waiterContribution: 'Waiter revenue contribution',
    confirmedRevenue: 'Confirmed revenue',
    itemAttribution: 'Item row created_by',
    confirmedOnly: 'Confirmed payments only',
    receipts: 'Closed receipts',
    paymentsShort: 'payments',
    openTables: 'Open tables',
    paymentPending: 'awaiting payment',
    openBalance: 'Open balance',
    activeWaiters: 'active waiters',
    averageReceipt: 'Average receipt',
    servedTables: 'tables served',
    cancellations: 'Cancellations',
  };
}
