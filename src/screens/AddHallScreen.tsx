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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '../contexts/ThemeContext';
import { useLayoutStore } from '../stores';
import { PrimaryButton, SurfaceCard } from '../components';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AddHallScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  
  const { addHall } = useLayoutStore();

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Hata', 'Salon adı gereklidir.');
      return;
    }

    setLoading(true);
    try {
      addHall({ name: name.trim() });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Hata', 'Salon eklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{ flex: 1, padding: 16 }}>
          <SurfaceCard style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
              Salon Adı *
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
              placeholder="Salon adını girin..."
              placeholderTextColor={colors.textSubtle}
              autoFocus
            />
            <Text style={{ 
              fontSize: 14, 
              color: colors.textSubtle, 
              marginTop: 8,
              fontStyle: 'italic'
            }}>
              Salon oluşturduktan sonra masalar ekleyebilirsiniz.
            </Text>
          </SurfaceCard>

          <Text style={{ 
            fontSize: 14, 
            color: colors.textSubtle,
            textAlign: 'center',
            marginBottom: 24
          }}>
            Örnekler: "Ana Salon", "Teras", "Üst Kat", "Bahçe"
          </Text>
        </View>

        <View style={{ padding: 16, flexDirection: 'row', gap: 12 }}>
          <PrimaryButton
            title="İptal"
            variant="outline"
            onPress={() => navigation.goBack()}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            title="Kaydet"
            onPress={handleSave}
            loading={loading}
            style={{ flex: 1 }}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
