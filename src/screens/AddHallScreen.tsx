import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../i18n';
import { useLayoutStore } from '../stores';
import { PrimaryButton, SurfaceCard } from '../components';
import { RootStackParamList } from '../navigation/AppNavigator';

type AddHallRouteProp = RouteProp<RootStackParamList, 'AddHall'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AddHallScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddHallRouteProp>();
  const { colors } = useTheme();
  const { t } = useLocalization();
  
  const { addHall, updateHall, halls } = useLayoutStore();
  
  // Check if we're editing an existing hall
  const editingHallId = route.params?.hallId;
  const editingHall = editingHallId ? halls.find(h => h.id === editingHallId) : null;
  const isEditing = !!editingHall;

  const [name, setName] = useState(editingHall?.name || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t.error, t.enterHallName);
      return;
    }

    setLoading(true);
    try {
      if (isEditing && editingHallId) {
        updateHall(editingHallId, { name: name.trim() });
        Alert.alert(t.success, t.hallUpdated);
      } else {
        addHall({ name: name.trim() });
        Alert.alert(t.success, t.hallAdded);
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert(t.error, 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{ flex: 1, padding: 16, backgroundColor: colors.bg }}>
          <SurfaceCard style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 16 }}>
              {isEditing ? t.editHall : t.addHall}
            </Text>
            
            <Text style={{ fontSize: 14, color: colors.textSubtle, marginBottom: 8 }}>
              {t.hallName} *
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 16,
                color: colors.text,
                backgroundColor: colors.surface,
              }}
              value={name}
              onChangeText={setName}
              placeholder={t.enterHallName}
              placeholderTextColor={colors.textSubtle}
              autoFocus
            />
            <Text style={{ 
              fontSize: 14, 
              color: colors.textSubtle, 
              marginTop: 8,
              fontStyle: 'italic'
            }}>
              {t.hallNameHint}
            </Text>
          </SurfaceCard>

          <Text style={{ 
            fontSize: 14, 
            color: colors.textSubtle,
            textAlign: 'center',
            marginBottom: 24
          }}>
            {t.hallExamples}
          </Text>
        </View>

        <View style={{ padding: 16, flexDirection: 'row', gap: 12 }}>
          <PrimaryButton
            title={t.cancel}
            variant="outline"
            onPress={() => navigation.goBack()}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            title={isEditing ? t.save : t.add}
            onPress={handleSave}
            loading={loading}
            style={{ flex: 1 }}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
