import React, { useState } from 'react';
import { View, Text, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../i18n';
import { useLayoutStore } from '../stores';
import { PrimaryButton, SurfaceCard } from '../components';
import { RootStackParamList } from '../navigation/AppNavigator';

type EditTableRouteProp = RouteProp<RootStackParamList, 'EditTable'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function EditTableScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditTableRouteProp>();
  const { colors } = useTheme();
  const { t } = useLocalization();
  
  const { updateTable, getTable } = useLayoutStore();
  
  const { tableId } = route.params;
  const table = getTable(tableId);
  
  const [tableName, setTableName] = useState(table?.label || '');

  if (!table) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom', 'left', 'right']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.text }}>{t.tableNotFound}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleSave = () => {
    try {
      updateTable(tableId, { label: tableName.trim() || undefined });
      Alert.alert(t.success, t.tableUpdated);
      navigation.goBack();
    } catch (error) {
      Alert.alert(t.error, t.genericError);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom', 'left', 'right']}>
      <View style={{ flex: 1, padding: 16, backgroundColor: colors.bg }}>
        <SurfaceCard style={{ marginBottom: 24 }}>
          <Text style={{ 
            fontSize: 18, 
            fontWeight: '600', 
            color: colors.text,
            marginBottom: 16
          }}>
            {t.editTable}
          </Text>
          
          <Text style={{ 
            fontSize: 14, 
            color: colors.textSubtle,
            marginBottom: 8
          }}>
            {t.tableName}
          </Text>
          
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 12,
              fontSize: 16,
              color: colors.text,
              backgroundColor: colors.surface,
              marginBottom: 8
            }}
            placeholder={t.enterNewTableName}
            placeholderTextColor={colors.textSubtle}
            value={tableName}
            onChangeText={setTableName}
            autoFocus
          />
          
          <Text style={{ 
            fontSize: 12, 
            color: colors.textSubtle,
            fontStyle: 'italic'
          }}>
            {t.tableNameHint.replace('{seq}', table.seq.toString())}
          </Text>
        </SurfaceCard>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <PrimaryButton
            title={t.cancel}
            variant="outline"
            onPress={() => navigation.goBack()}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            title={t.save}
            onPress={handleSave}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
