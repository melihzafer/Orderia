import React from 'react';
import { View, Text, Switch, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization, Language, Currency } from '../i18n';
import { SurfaceCard } from '../components';
import { brand } from '../constants/branding';
import { useLayoutStore } from '../stores/layoutStore';
import { useMenuStore } from '../stores/menuStore';
import { useOrderStore } from '../stores/orderStore';
import { useHistoryStore } from '../stores/historyStore';

export default function SettingsScreen() {
  const { colors, colorMode, toggleColorMode } = useTheme();
  const { t, language, currency, setLanguage, setCurrency } = useLocalization();
  
  // Store hooks
  const layoutStore = useLayoutStore();
  const menuStore = useMenuStore();
  const orderStore = useOrderStore();
  const historyStore = useHistoryStore();

  const languages: Array<{ code: Language; name: string; flag: string }> = [
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    { code: 'bg', name: 'Български', flag: '🇧🇬' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
  ];

  const currencies: Array<{ code: Currency; name: string; symbol: string }> = [
    { code: 'TRY', name: t.turkish_lira, symbol: '₺' },
    { code: 'BGN', name: t.bulgarian_lev, symbol: 'лв' },
    { code: 'EUR', name: t.euro, symbol: '€' },
  ];

  const handleDataExport = async () => {
    try {
      // Collect all data from stores
      const exportData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        data: {
          halls: layoutStore.halls,
          tables: layoutStore.tables,
          categories: menuStore.categories,
          menuItems: menuStore.menuItems,
          openTickets: orderStore.openTickets,
          dailyHistory: historyStore.dailyHistory,
          settings: {
            language,
            currency,
            colorMode
          }
        }
      };

      // Create JSON string
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // Create file name with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `orderia-backup-${timestamp}.json`;
      
      // Save to device
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, jsonString);
      
      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: t.dataExport
        });
      }
      
      Alert.alert(t.success, t.dataExported, [{ text: t.ok }]);
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert(t.error, t.exportFailed, [{ text: t.ok }]);
    }
  };

  const handleDataImport = async () => {
    try {
      // Pick a file
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true
      });

      if (result.canceled) return;

      // Read the file
      const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const importData = JSON.parse(fileContent);

      // Validate data structure
      if (!importData.data || !importData.version) {
        throw new Error('Invalid backup file format');
      }

      // Show confirmation dialog
      Alert.alert(
        t.dataImport,
        t.importWarning,
        [
          { text: t.cancel, style: 'cancel' },
          {
            text: t.import,
            style: 'destructive',
            onPress: () => performImport(importData.data)
          }
        ]
      );
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert(t.error, t.importFailed, [{ text: t.ok }]);
    }
  };

  const performImport = (data: any) => {
    try {
      // Clear existing data and import new data
      if (data.halls) {
        layoutStore.halls = data.halls;
      }
      if (data.tables) {
        layoutStore.tables = data.tables;
      }
      if (data.categories) {
        menuStore.categories = data.categories;
      }
      if (data.menuItems) {
        menuStore.menuItems = data.menuItems;
      }
      if (data.openTickets) {
        orderStore.openTickets = data.openTickets;
      }
      if (data.dailyHistory) {
        historyStore.dailyHistory = data.dailyHistory;
      }
      if (data.settings) {
        if (data.settings.language) setLanguage(data.settings.language);
        if (data.settings.currency) setCurrency(data.settings.currency);
        if (data.settings.colorMode && data.settings.colorMode !== colorMode) {
          toggleColorMode();
        }
      }

      Alert.alert(t.success, t.dataImported, [{ text: t.ok }]);
    } catch (error) {
      console.error('Import processing error:', error);
      Alert.alert(t.error, t.importProcessingFailed, [{ text: t.ok }]);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom', 'left', 'right']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, backgroundColor: colors.bg }}>
        
        {/* Language Settings */}
        <SurfaceCard style={{ marginBottom: 16 }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginBottom: 16 
          }}>
            <Ionicons 
              name="language-outline" 
              size={24} 
              color={colors.primary} 
              style={{ marginRight: 12 }}
            />
            <Text style={{ 
              fontSize: 18, 
              fontWeight: '600', 
              color: colors.text 
            }}>
              {t.language}
            </Text>
          </View>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              onPress={() => setLanguage(lang.code)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: language === lang.code ? colors.primary + '20' : 'transparent',
                borderRadius: 8,
                marginBottom: 8,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 20, marginRight: 12 }}>{lang.flag}</Text>
                <Text style={{ 
                  fontSize: 16, 
                  color: colors.text,
                  fontWeight: language === lang.code ? '600' : '400'
                }}>
                  {lang.name}
                </Text>
              </View>
              {language === lang.code && (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </SurfaceCard>

        {/* Currency Settings */}
        <SurfaceCard style={{ marginBottom: 16 }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginBottom: 16 
          }}>
            <Ionicons 
              name="card-outline" 
              size={24} 
              color={colors.primary} 
              style={{ marginRight: 12 }}
            />
            <Text style={{ 
              fontSize: 18, 
              fontWeight: '600', 
              color: colors.text 
            }}>
              {t.currency}
            </Text>
          </View>
          {currencies.map((curr) => (
            <TouchableOpacity
              key={curr.code}
              onPress={() => setCurrency(curr.code)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: currency === curr.code ? colors.primary + '20' : 'transparent',
                borderRadius: 8,
                marginBottom: 8,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ 
                  fontSize: 18, 
                  marginRight: 12,
                  fontWeight: '600',
                  color: colors.accent
                }}>
                  {curr.symbol}
                </Text>
                <Text style={{ 
                  fontSize: 16, 
                  color: colors.text,
                  fontWeight: currency === curr.code ? '600' : '400'
                }}>
                  {curr.name}
                </Text>
              </View>
              {currency === curr.code && (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </SurfaceCard>

        {/* Theme Settings */}
        <SurfaceCard style={{ marginBottom: 16 }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginBottom: 16 
          }}>
            <Ionicons 
              name="color-palette-outline" 
              size={24} 
              color={colors.primary} 
              style={{ marginRight: 12 }}
            />
            <Text style={{ 
              fontSize: 18, 
              fontWeight: '600', 
              color: colors.text 
            }}>
              {t.theme}
            </Text>
          </View>
          
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 12,
              paddingHorizontal: 16,
              backgroundColor: colors.surface,
              borderRadius: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons 
                name={colorMode === 'light' ? 'sunny-outline' : 'moon-outline'} 
                size={20} 
                color={colors.text} 
                style={{ marginRight: 12 }}
              />
              <Text style={{ 
                fontSize: 16, 
                color: colors.text,
                fontWeight: '500'
              }}>
                {colorMode === 'light' ? t.lightMode : t.darkMode}
              </Text>
            </View>
            <Switch
              value={colorMode === 'dark'}
              onValueChange={toggleColorMode}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colorMode === 'dark' ? '#FFFFFF' : colors.surface}
            />
          </View>
        </SurfaceCard>

        {/* Data Export */}
        <SurfaceCard style={{ marginBottom: 16 }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginBottom: 16 
          }}>
            <Ionicons 
              name="cloud-upload-outline" 
              size={24} 
              color={colors.primary} 
              style={{ marginRight: 12 }}
            />
            <Text style={{ 
              fontSize: 18, 
              fontWeight: '600', 
              color: colors.text 
            }}>
              {t.dataManagement}
            </Text>
          </View>
          
          <TouchableOpacity
            onPress={handleDataExport}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              paddingHorizontal: 16,
              backgroundColor: colors.surface,
              borderRadius: 8,
              marginBottom: 8,
            }}
          >
            <Ionicons 
              name="download-outline" 
              size={20} 
              color={colors.text} 
              style={{ marginRight: 12 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: 16, 
                color: colors.text,
                fontWeight: '500'
              }}>
                {t.dataExport}
              </Text>
              <Text style={{ 
                fontSize: 12, 
                color: colors.textSubtle,
                marginTop: 2
              }}>
                {t.backupData}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDataImport}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              paddingHorizontal: 16,
              backgroundColor: colors.surface,
              borderRadius: 8,
            }}
          >
            <Ionicons 
              name="cloud-upload-outline" 
              size={20} 
              color={colors.text} 
              style={{ marginRight: 12 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: 16, 
                color: colors.text,
                fontWeight: '500'
              }}>
                {t.dataImport}
              </Text>
              <Text style={{ 
                fontSize: 12, 
                color: colors.textSubtle,
                marginTop: 2
              }}>
                {t.restorePreviousData}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
          </TouchableOpacity>
        </SurfaceCard>

        {/* App Info */}
        <SurfaceCard>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginBottom: 16 
          }}>
            <Ionicons 
              name="information-circle-outline" 
              size={24} 
              color={colors.primary} 
              style={{ marginRight: 12 }}
            />
            <Text style={{ 
              fontSize: 18, 
              fontWeight: '600', 
              color: colors.text 
            }}>
              {t.appInfo}
            </Text>
          </View>
          
          <View style={{ paddingHorizontal: 16 }}>
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: colors.primary }}>
                {brand.name}
              </Text>
              <Text style={{ fontSize: 14, color: colors.textSubtle, marginTop: 4 }}>
                {brand.tagline}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSubtle, marginTop: 8 }}>
                {t.version} 1.0.0 - OMNI Tech Solutions
              </Text>
            </View>
          </View>
        </SurfaceCard>
      </ScrollView>
    </SafeAreaView>
  );
}
