import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../i18n';
import { useHistoryStore } from '../stores';
import { SurfaceCard, PrimaryButton } from '../components';
import { exportToCSV, exportToPDF, prepareExportData } from '../utils/exportUtils';

export default function HistoryScreen() {
  const { colors } = useTheme();
  const { t, formatPrice, formatDate } = useLocalization();
  const { dailyHistory, getHistoryDates } = useHistoryStore();
  const [exporting, setExporting] = useState(false);

  const historyDates = getHistoryDates();

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const exportData = prepareExportData(dailyHistory);
      const success = await exportToCSV(exportData);
      
      if (success) {
        Alert.alert('Başarılı', 'Rapor CSV formatında dışa aktarıldı');
      } else {
        Alert.alert('Hata', 'Rapor dışa aktarılırken bir hata oluştu');
      }
    } catch (error) {
      Alert.alert('Hata', 'Rapor dışa aktarılırken bir hata oluştu');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const exportData = prepareExportData(dailyHistory);
      const success = await exportToPDF(exportData);
      
      if (success) {
        Alert.alert('Başarılı', 'Rapor PDF formatında dışa aktarıldı');
      } else {
        Alert.alert('Hata', 'Rapor dışa aktarılırken bir hata oluştu');
      }
    } catch (error) {
      Alert.alert('Hata', 'Rapor dışa aktarılırken bir hata oluştu');
    } finally {
      setExporting(false);
    }
  };

  const renderHistoryItem = ({ item: date }: { item: string }) => {
    const history = dailyHistory[date];
    if (!history) return null;

    return (
      <SurfaceCard style={{ marginBottom: 12 }} variant="outlined">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
              {formatDate(new Date(date).getTime())}
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSubtle, marginTop: 2 }}>
              {history.tickets.length} sipariş
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primary }}>
              {formatPrice(history.totals.gross)}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSubtle }}>
              Toplam Satış
            </Text>
          </View>
        </View>
      </SurfaceCard>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom', 'left', 'right']}>
      <View style={{ flex: 1, padding: 16, backgroundColor: colors.bg }}>
        {/* Export Buttons */}
        {historyDates.length > 0 && (
          <SurfaceCard style={{ marginBottom: 16 }} variant="outlined">
            <Text style={{ 
              fontSize: 16, 
              fontWeight: '600', 
              color: colors.text,
              marginBottom: 12
            }}>
              Raporu Dışa Aktar
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={handleExportCSV}
                disabled={exporting}
                style={{
                  flex: 1,
                  backgroundColor: colors.primary,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: exporting ? 0.6 : 1,
                }}
              >
                <Ionicons 
                  name="document-text-outline" 
                  size={16} 
                  color="#FFFFFF" 
                  style={{ marginRight: 8 }}
                />
                <Text style={{ 
                  color: '#FFFFFF', 
                  fontSize: 14, 
                  fontWeight: '600' 
                }}>
                  CSV
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleExportPDF}
                disabled={exporting}
                style={{
                  flex: 1,
                  backgroundColor: colors.accent,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: exporting ? 0.6 : 1,
                }}
              >
                <Ionicons 
                  name="document-outline" 
                  size={16} 
                  color="#FFFFFF" 
                  style={{ marginRight: 8 }}
                />
                <Text style={{ 
                  color: '#FFFFFF', 
                  fontSize: 14, 
                  fontWeight: '600' 
                }}>
                  PDF
                </Text>
              </TouchableOpacity>
            </View>
          </SurfaceCard>
        )}

        {historyDates.length === 0 ? (
          <SurfaceCard style={{ padding: 32 }}>
            <Text style={{ 
              textAlign: 'center', 
              color: colors.textSubtle,
              fontSize: 16
            }}>
              Henüz satış tarihçesi yok
            </Text>
          </SurfaceCard>
        ) : (
          <FlatList
            data={historyDates}
            renderItem={renderHistoryItem}
            keyExtractor={(item) => item}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
