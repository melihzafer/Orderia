import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../i18n';
import { useQRMenu } from '../contexts/QRMenuContext';
import { useLayoutStore } from '../stores';
import { SurfaceCard, PrimaryButton, FloatingActionButton } from '../components';
import { brand, elevation, radius, spacing } from '../constants/branding';

export default function QRMenuScreen() {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const { 
    settings, 
    updateSettings, 
    generateQRCode, 
    shareQRCode, 
    shareAllQRCodes, 
    getMenuUrl,
    exportQRCodesAsPDF 
  } = useQRMenu();
  const { tables } = useLayoutStore();

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [qrCodeUri, setQrCodeUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    if (tables.length > 0 && !selectedTableId) {
      setSelectedTableId(tables[0].id);
    }
  }, [tables]);

  const handleGenerateQRCode = async (tableId: string) => {
    setLoading(true);
    try {
      const uri = await generateQRCode(tableId);
      setQrCodeUri(uri);
    } catch (error) {
      Alert.alert(t.error || 'Error', t.qrGenerationError || 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleShareQRCode = async (tableId: string) => {
    try {
      await shareQRCode(tableId);
    } catch (error) {
      Alert.alert(t.error || 'Error', t.shareError || 'Failed to share QR code');
    }
  };

  const handleShareAllQRCodes = async () => {
    setLoading(true);
    try {
      await shareAllQRCodes();
    } catch (error) {
      Alert.alert(t.error || 'Error', t.shareAllError || 'Failed to share all QR codes');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleQRMenu = () => {
    updateSettings({ enabled: !settings.enabled });
  };

  const selectedTable = tables.find(t => t.id === selectedTableId);

  const renderQRMenuSettings = () => (
    <SurfaceCard variant="elevated" padding="medium" style={{ marginHorizontal: spacing.md, marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
        <Ionicons name="settings-outline" size={20} color={colors.primary} />
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginLeft: spacing.sm }}>
          {t.qrMenuSettings || 'QR Menu Settings'}
        </Text>
      </View>

      {/* Enable/Disable QR Menu */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
      }}>
        <View>
          <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>
            {t.enableQRMenu || 'Enable QR Menu'}
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSubtle, marginTop: 2 }}>
            {t.enableQRMenuDescription || 'Allow customers to view menu via QR code'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleToggleQRMenu}
          style={{
            width: 50,
            height: 30,
            borderRadius: 15,
            backgroundColor: settings.enabled ? colors.success : colors.border,
            padding: 2,
            justifyContent: 'center',
          }}
        >
          <View style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: colors.primaryContrast,
            alignSelf: settings.enabled ? 'flex-end' : 'flex-start',
            ...elevation.sm,
          }} />
        </TouchableOpacity>
      </View>

      {/* Direct Ordering */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
      }}>
        <View>
          <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>
            {t.allowDirectOrdering || 'Allow Direct Ordering'}
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSubtle, marginTop: 2 }}>
            {t.allowDirectOrderingDescription || 'Customers can place orders directly'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => updateSettings({ allowDirectOrdering: !settings.allowDirectOrdering })}
          style={{
            width: 50,
            height: 30,
            borderRadius: 15,
            backgroundColor: settings.allowDirectOrdering ? colors.success : colors.border,
            padding: 2,
            justifyContent: 'center',
          }}
        >
          <View style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: colors.primaryContrast,
            alignSelf: settings.allowDirectOrdering ? 'flex-end' : 'flex-start',
            ...elevation.sm,
          }} />
        </TouchableOpacity>
      </View>

      {/* Show Prices */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        paddingVertical: spacing.md,
      }}>
        <View>
          <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>
            {t.showPrices || 'Show Prices'}
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSubtle, marginTop: 2 }}>
            {t.showPricesDescription || 'Display item prices in QR menu'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => updateSettings({ showPrices: !settings.showPrices })}
          style={{
            width: 50,
            height: 30,
            borderRadius: 15,
            backgroundColor: settings.showPrices ? colors.success : colors.border,
            padding: 2,
            justifyContent: 'center',
          }}
        >
          <View style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: colors.primaryContrast,
            alignSelf: settings.showPrices ? 'flex-end' : 'flex-start',
            ...elevation.sm,
          }} />
        </TouchableOpacity>
      </View>
    </SurfaceCard>
  );

  const renderTableSelector = () => (
    <SurfaceCard variant="elevated" padding="medium" style={{ marginHorizontal: spacing.md, marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
        <Ionicons name="restaurant-outline" size={20} color={colors.primary} />
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginLeft: spacing.sm }}>
          {t.selectTable || 'Select Table'}
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {tables.map((table) => (
            <TouchableOpacity
              key={table.id}
              onPress={() => setSelectedTableId(table.id)}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radius.md,
                backgroundColor: selectedTableId === table.id ? colors.primary : colors.surfaceAlt,
                borderWidth: 1,
                borderColor: selectedTableId === table.id ? colors.primary : colors.border,
              }}
            >
              <Text style={{
                color: selectedTableId === table.id ? colors.primaryContrast : colors.text,
                fontWeight: selectedTableId === table.id ? '600' : '400',
                fontSize: 14,
              }}>
                {t.table || 'Table'} {table.seq}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SurfaceCard>
  );

  const renderQRCodeDisplay = () => {
    if (!selectedTable || !settings.enabled) return null;

    const menuUrl = getMenuUrl(selectedTable.id);

    return (
      <SurfaceCard variant="elevated" padding="large" style={{ marginHorizontal: spacing.md, marginBottom: spacing.md, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
          <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginLeft: spacing.sm }}>
            {t.table || 'Table'} {selectedTable.seq} {t.qrCode || 'QR Code'}
          </Text>
        </View>

        {/* QR Code */}
        <View style={{ 
          backgroundColor: colors.primaryContrast, 
          padding: spacing.lg,
          borderRadius: radius.md,
          ...elevation.md,
          marginBottom: spacing.lg,
        }}>
          <QRCode
            value={menuUrl}
            size={200}
            color={colors.text}
            backgroundColor={colors.primaryContrast}
            logoSize={40}
            logoMargin={2}
            logoBorderRadius={4}
          />
        </View>

        {/* URL Display */}
        <View style={{ 
          backgroundColor: colors.surfaceAlt, 
          padding: spacing.md,
          borderRadius: radius.sm,
          width: '100%',
          marginBottom: spacing.lg,
        }}>
          <Text style={{ 
            fontSize: 12, 
            color: colors.textSubtle, 
            textAlign: 'center',
            fontFamily: 'monospace',
          }}>
            {menuUrl}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, width: '100%' }}>
          <PrimaryButton
            title={t.share || 'Share'}
            icon="share-outline"
            onPress={() => handleShareQRCode(selectedTable.id)}
            style={{ flex: 1 }}
            variant="outline"
          />
          <PrimaryButton
            title={t.regenerate || 'Regenerate'}
            icon="refresh-outline"
            onPress={() => handleGenerateQRCode(selectedTable.id)}
            style={{ flex: 1 }}
            loading={loading}
          />
        </View>
      </SurfaceCard>
    );
  };

  const renderBulkActions = () => (
    <SurfaceCard variant="elevated" padding="medium" style={{ marginHorizontal: spacing.md, marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
        <Ionicons name="layers-outline" size={20} color={colors.primary} />
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginLeft: spacing.sm }}>
          {t.bulkActions || 'Bulk Actions'}
        </Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        <PrimaryButton
          title={t.shareAllQRCodes || 'Share All QR Codes'}
          icon="share-social-outline"
          onPress={handleShareAllQRCodes}
          loading={loading}
          variant="secondary"
          fullWidth
        />
        
        <PrimaryButton
          title={t.exportPDF || 'Export as PDF'}
          icon="document-outline"
          onPress={async () => {
            try {
              setLoading(true);
              await exportQRCodesAsPDF();
              Alert.alert(t.success || 'Success', t.pdfExported || 'PDF exported successfully');
            } catch (error) {
              Alert.alert(t.error || 'Error', t.pdfExportError || 'Failed to export PDF');
            } finally {
              setLoading(false);
            }
          }}
          loading={loading}
          variant="outline"
          fullWidth
        />
      </View>
    </SurfaceCard>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom', 'left', 'right']}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* QR Menu Settings */}
        {renderQRMenuSettings()}

        {settings.enabled && (
          <>
            {/* Table Selector */}
            {renderTableSelector()}

            {/* QR Code Display */}
            {renderQRCodeDisplay()}

            {/* Bulk Actions */}
            {renderBulkActions()}
          </>
        )}

        {!settings.enabled && (
          <SurfaceCard variant="outlined" padding="xl" style={{ marginHorizontal: spacing.md, alignItems: 'center' }}>
            <Ionicons name="qr-code-outline" size={64} color={colors.textMuted} />
            <Text style={{ 
              fontSize: 18, 
              fontWeight: '600', 
              color: colors.textSubtle, 
              textAlign: 'center',
              marginTop: spacing.md,
              marginBottom: spacing.sm,
            }}>
              {t.qrMenuDisabled || 'QR Menu is Disabled'}
            </Text>
            <Text style={{ 
              fontSize: 14, 
              color: colors.textSubtle, 
              textAlign: 'center',
              lineHeight: 20,
            }}>
              {t.qrMenuDisabledDescription || 'Enable QR Menu to generate QR codes for your tables and allow customers to view your menu digitally.'}
            </Text>
          </SurfaceCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
