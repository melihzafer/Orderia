import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../i18n';
import { useQRMenu } from '../contexts/QRMenuContext';
import { useLayoutStore } from '../stores';
import {
  haptic,
  ServiceButton,
  ServiceEmptyState,
  ServiceListRow,
  ServiceRowGroup,
  ServiceSectionHeader,
  ServiceStatusPill,
  ServiceSurface,
  useAdaptiveLayout,
  useSnackbar,
} from '../design-system';

export default function QRMenuScreenModern() {
  const { tokens } = useTheme();
  const { t } = useLocalization();
  const layout = useAdaptiveLayout();
  const {
    settings,
    updateSettings,
    generateQRCode,
    shareQRCode,
    shareAllQRCodes,
    getMenuUrl,
    exportQRCodesAsPDF,
  } = useQRMenu();
  const tables = useLayoutStore((state) => state.tables);
  const { show } = useSnackbar();
  const [selectedTableId, setSelectedTableId] = useState<string>();
  const [qrCodeUri, setQrCodeUri] = useState<string>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tables.length > 0 && !selectedTableId) setSelectedTableId(tables[0].id);
  }, [selectedTableId, tables]);

  const selectedTable = tables.find((table) => table.id === selectedTableId);
  const selectedTableLabel = selectedTable
    ? (selectedTable.label ?? `${t.table} ${selectedTable.seq}`)
    : undefined;

  const showError = (_error: unknown, fallback: string) => {
    haptic('error');
    show({ message: fallback, tone: 'error' });
  };

  const handleGenerate = async () => {
    if (!selectedTable) return;
    setLoading(true);
    try {
      setQrCodeUri(await generateQRCode(selectedTable.id));
    } catch (error) {
      showError(error, t.qrGenerationError || 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!selectedTable) return;
    try {
      await shareQRCode(selectedTable.id);
    } catch (error) {
      showError(error, t.shareError || 'Failed to share QR code');
    }
  };

  const handleShareAll = async () => {
    setLoading(true);
    try {
      await shareAllQRCodes();
    } catch (error) {
      showError(error, t.shareAllError || 'Failed to share all QR codes');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      await exportQRCodesAsPDF();
      haptic('success');
      show({ message: t.pdfExported || 'PDF exported successfully', tone: 'success' });
    } catch (error) {
      showError(error, t.pdfExportError || 'Failed to export PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left', 'right']}
      style={{ backgroundColor: tokens.colors.bg, flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{
          alignSelf: 'center',
          gap: tokens.space.lg,
          maxWidth: tokens.sizing.contentMaximumWidth,
          paddingBottom: tokens.space.md,
          paddingHorizontal: layout.horizontalPadding,
          paddingTop: tokens.space.lg,
          width: '100%',
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'flex-end' }}>
          <ServiceStatusPill
            icon={settings.enabled ? 'qr-code' : 'qr-code-outline'}
            label={settings.enabled ? t.enableQRMenu : t.qrMenuDisabled}
            tone={settings.enabled ? 'success' : 'neutral'}
          />
        </View>

        <ServiceSectionHeader
          caption={t.enableQRMenuDescription || 'Control what guests can see and do.'}
          title={t.qrMenuSettings || 'QR menu settings'}
        />
        <ServiceRowGroup>
          <ServiceListRow
            accessory="switch"
            icon="qr-code-outline"
            onValueChange={(enabled) => void updateSettings({ enabled })}
            subtitle={t.enableQRMenuDescription || 'Allow customers to view the menu by QR code.'}
            switchValue={settings.enabled}
            title={t.enableQRMenu || 'Enable QR menu'}
          />
          <ServiceListRow
            accessory="switch"
            icon="cart-outline"
            onValueChange={(allowDirectOrdering) => void updateSettings({ allowDirectOrdering })}
            subtitle={
              t.allowDirectOrderingDescription || 'Customers can send an order from the menu.'
            }
            switchValue={settings.allowDirectOrdering}
            title={t.allowDirectOrdering || 'Allow direct ordering'}
          />
          <ServiceListRow
            accessory="switch"
            icon="pricetag-outline"
            last
            onValueChange={(showPrices) => void updateSettings({ showPrices })}
            subtitle={t.showPricesDescription || 'Display item prices in the QR menu.'}
            switchValue={settings.showPrices}
            title={t.showPrices || 'Show prices'}
          />
        </ServiceRowGroup>

        {!settings.enabled ? (
          <ServiceEmptyState
            body={
              t.qrMenuDisabledDescription ||
              'Enable QR menu to generate table codes and let guests open the digital menu.'
            }
            icon="qr-code-outline"
            title={t.qrMenuDisabled || 'QR menu is disabled'}
          />
        ) : tables.length === 0 ? (
          <ServiceEmptyState
            body={t.noTablesConfigured || 'Create at least one table before generating a QR code.'}
            icon="grid-outline"
            title={t.noTables || 'No tables configured'}
          />
        ) : (
          <>
            <ServiceSectionHeader title={t.selectTable || 'Select a table'} />
            <ScrollView
              horizontal
              accessibilityRole="tablist"
              contentContainerStyle={{ gap: tokens.space.xs }}
              showsHorizontalScrollIndicator={false}
            >
              {tables.map((table) => {
                const label = table.label ?? `${t.table} ${table.seq}`;
                return (
                  <TableChip
                    key={table.id}
                    label={label}
                    onPress={() => {
                      setSelectedTableId(table.id);
                      setQrCodeUri(undefined);
                    }}
                    selected={table.id === selectedTableId}
                  />
                );
              })}
            </ScrollView>

            {selectedTable && selectedTableLabel ? (
              <QRCodeCard
                loading={loading}
                menuUrl={getMenuUrl(selectedTable.id)}
                onGenerate={() => void handleGenerate()}
                onShare={() => void handleShare()}
                qrCodeUri={qrCodeUri}
                tableLabel={selectedTableLabel}
                t={t}
              />
            ) : null}

            <ServiceSectionHeader title={t.bulkActions || 'Bulk actions'} />
            <ServiceSurface style={{ gap: tokens.space.sm }}>
              <ServiceButton
                fullWidth
                icon="share-social-outline"
                label={t.shareAllQRCodes || 'Share all QR codes'}
                loading={loading}
                onPress={() => void handleShareAll()}
                variant="secondary"
              />
              <ServiceButton
                fullWidth
                icon="document-outline"
                label={t.exportPDF || 'Export as PDF'}
                loading={loading}
                onPress={() => void handleExport()}
                variant="outline"
              />
            </ServiceSurface>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TableChip({
  label,
  onPress,
  selected,
}: {
  readonly label: string;
  readonly onPress: () => void;
  readonly selected: boolean;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: selected ? tokens.colors.primary : tokens.colors.surface,
        borderColor: selected ? tokens.colors.primary : tokens.colors.border,
        borderRadius: tokens.radius.full,
        borderWidth: 1,
        minHeight: tokens.sizing.minimumTarget,
        opacity: pressed ? 0.8 : 1,
        paddingHorizontal: tokens.space.md,
        justifyContent: 'center',
      })}
    >
      <Text
        style={[
          tokens.typography.label,
          { color: selected ? tokens.colors.primaryContrast : tokens.colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function QRCodeCard({
  loading,
  menuUrl,
  onGenerate,
  onShare,
  qrCodeUri,
  tableLabel,
  t,
}: {
  readonly loading: boolean;
  readonly menuUrl: string;
  readonly onGenerate: () => void;
  readonly onShare: () => void;
  readonly qrCodeUri?: string;
  readonly tableLabel: string;
  readonly t: ReturnType<typeof useLocalization>['t'];
}) {
  const { tokens } = useTheme();
  return (
    <ServiceSurface
      padding="large"
      style={{ alignItems: 'center', gap: tokens.space.md }}
      variant="raised"
    >
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: tokens.space.xs }}>
        <Ionicons color={tokens.colors.primary} name="qr-code-outline" size={22} />
        <Text style={[tokens.typography.sectionTitle, { color: tokens.colors.text }]}>
          {tableLabel} · {t.qrCode || 'QR code'}
        </Text>
      </View>

      <View
        style={{
          alignItems: 'center',
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.borderLight,
          borderRadius: tokens.radius.large,
          borderWidth: 1,
          padding: tokens.space.lg,
        }}
      >
        {qrCodeUri ? (
          <Image
            accessibilityLabel={`${tableLabel} ${t.qrCode || 'QR code'}`}
            resizeMode="contain"
            source={{ uri: qrCodeUri }}
            style={{ height: 210, width: 210 }}
          />
        ) : (
          <QRCode
            backgroundColor={tokens.colors.surface}
            color={tokens.colors.text}
            logoBorderRadius={4}
            logoSize={40}
            logoMargin={2}
            size={210}
            value={menuUrl}
          />
        )}
      </View>

      <Text
        selectable
        style={[
          tokens.typography.caption,
          { color: tokens.colors.textSubtle, textAlign: 'center' },
        ]}
      >
        {menuUrl}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs, width: '100%' }}>
        <ServiceButton
          icon="share-outline"
          label={t.share || 'Share'}
          onPress={onShare}
          style={{ flexBasis: 0, flexGrow: 1 }}
          variant="outline"
        />
        <ServiceButton
          icon="refresh-outline"
          label={t.regenerate || 'Generate'}
          loading={loading}
          onPress={onGenerate}
          style={{ flexBasis: 0, flexGrow: 1 }}
        />
      </View>
    </ServiceSurface>
  );
}
