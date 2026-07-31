import React from 'react';
import { View, Text, Switch, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
import { useAuth } from '../contexts/AuthContext';
import { accessibleBranches } from '../contexts/authTypes';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { PwaStatusCard } from '../features/pwa';
import { LegacyMigrationCard } from '../features/legacy-migration';

export default function SettingsScreen() {
  const { colors, colorMode, toggleColorMode } = useTheme();
  const { t, language, currency, setLanguage, setCurrency } = useLocalization();
  const auth = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Store hooks
  const layoutStore = useLayoutStore();
  const menuStore = useMenuStore();
  const orderStore = useOrderStore();
  const historyStore = useHistoryStore();

  const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    { code: 'bg', name: 'Български', flag: '🇧🇬' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
  ];

  const currencies: { code: Currency; name: string; symbol: string }[] = [
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
            colorMode,
          },
        },
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
          dialogTitle: t.dataExport,
        });
      }

      Alert.alert(t.success, t.dataExported, [{ text: t.ok }]);
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert(t.error, t.exportFailed, [{ text: t.ok }]);
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={['bottom', 'left', 'right']}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, backgroundColor: colors.bg }}
      >
        <PwaStatusCard />
        {auth.status === 'ready' && auth.workspace && auth.activeBranch ? (
          <SurfaceCard style={{ marginBottom: 16 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Ionicons
                name="business-outline"
                size={24}
                color={colors.primary}
                style={{ marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 18,
                    fontWeight: '600',
                  }}
                >
                  {auth.activeBranch.name}
                </Text>
                <Text style={{ color: colors.textSubtle, marginTop: 2 }}>
                  {auth.activeOrganization?.name} · {auth.activeMembership?.role}
                </Text>
              </View>
            </View>

            {accessibleBranches(auth.workspace).length > 1 ? (
              <View style={{ marginBottom: 8 }}>
                {accessibleBranches(auth.workspace).map((branch) => (
                  <TouchableOpacity
                    key={branch.id}
                    onPress={() => {
                      void auth.switchBranch(branch.id);
                    }}
                    style={{
                      alignItems: 'center',
                      backgroundColor:
                        branch.id === auth.activeBranch?.id
                          ? colors.primary + '20'
                          : colors.surfaceAlt,
                      borderRadius: 8,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                      padding: 12,
                    }}
                  >
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{branch.name}</Text>
                    {branch.id === auth.activeBranch?.id ? (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {auth.activeMembership?.role === 'manager' ? (
              <>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Devices')}
                  style={{
                    alignItems: 'center',
                    borderBottomColor: colors.border,
                    borderBottomWidth: 1,
                    flexDirection: 'row',
                    paddingVertical: 12,
                  }}
                >
                  <Ionicons
                    name="phone-portrait-outline"
                    size={21}
                    color={colors.textSubtle}
                    style={{ marginRight: 10 }}
                  />
                  <Text style={{ color: colors.text, flex: 1, fontSize: 15 }}>
                    Authorized devices
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Approvals')}
                  style={{
                    alignItems: 'center',
                    flexDirection: 'row',
                    paddingVertical: 12,
                  }}
                >
                  <Ionicons
                    name="people-outline"
                    size={21}
                    color={colors.textSubtle}
                    style={{ marginRight: 10 }}
                  />
                  <Text style={{ color: colors.text, flex: 1, fontSize: 15 }}>
                    {t.approvalsTitle}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </>
            ) : null}

            <TouchableOpacity
              onPress={() => {
                void auth.signOut();
              }}
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                paddingTop: 14,
              }}
            >
              <Ionicons
                name="log-out-outline"
                size={21}
                color={colors.error}
                style={{ marginRight: 10 }}
              />
              <Text style={{ color: colors.error, fontSize: 15, fontWeight: '600' }}>Sign out</Text>
            </TouchableOpacity>
          </SurfaceCard>
        ) : null}

        {/* Language Settings */}
        <SurfaceCard style={{ marginBottom: 16 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Ionicons
              name="language-outline"
              size={24}
              color={colors.primary}
              style={{ marginRight: 12 }}
            />
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: colors.text,
              }}
            >
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
                <Text
                  style={{
                    fontSize: 16,
                    color: colors.text,
                    fontWeight: language === lang.code ? '600' : '400',
                  }}
                >
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
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Ionicons
              name="card-outline"
              size={24}
              color={colors.primary}
              style={{ marginRight: 12 }}
            />
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: colors.text,
              }}
            >
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
                <Text
                  style={{
                    fontSize: 18,
                    marginRight: 12,
                    fontWeight: '600',
                    color: colors.accent,
                  }}
                >
                  {curr.symbol}
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: colors.text,
                    fontWeight: currency === curr.code ? '600' : '400',
                  }}
                >
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
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Ionicons
              name="color-palette-outline"
              size={24}
              color={colors.primary}
              style={{ marginRight: 12 }}
            />
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: colors.text,
              }}
            >
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
              <Text
                style={{
                  fontSize: 16,
                  color: colors.text,
                  fontWeight: '500',
                }}
              >
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
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Ionicons
              name="cloud-upload-outline"
              size={24}
              color={colors.primary}
              style={{ marginRight: 12 }}
            />
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: colors.text,
              }}
            >
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
              <Text
                style={{
                  fontSize: 16,
                  color: colors.text,
                  fontWeight: '500',
                }}
              >
                {t.dataExport}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textSubtle,
                  marginTop: 2,
                }}
              >
                {t.backupData}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
          </TouchableOpacity>
        </SurfaceCard>

        <LegacyMigrationCard />

        {/* App Info */}
        <SurfaceCard>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Ionicons
              name="information-circle-outline"
              size={24}
              color={colors.primary}
              style={{ marginRight: 12 }}
            />
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: colors.text,
              }}
            >
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
