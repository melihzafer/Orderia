import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '../contexts/ThemeContext';
import { useMenuStore } from '../stores';
import { PrimaryButton, SurfaceCard } from '../components';
import { RootStackParamList } from '../navigation/AppNavigator';

type AddMenuItemRouteProp = RouteProp<RootStackParamList, 'AddMenuItem'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AddMenuItemScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddMenuItemRouteProp>();
  const { colors } = useTheme();
  
  const { categories, addMenuItem } = useMenuStore();
  const { categoryId } = route.params || {};

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryId || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Hata', 'Ürün adı gereklidir.');
      return;
    }

    if (!price.trim()) {
      Alert.alert('Hata', 'Fiyat gereklidir.');
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert('Hata', 'Kategori seçmelisiniz.');
      return;
    }

    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      Alert.alert('Hata', 'Geçerli bir fiyat girin.');
      return;
    }

    setLoading(true);
    try {
      addMenuItem({
        categoryId: selectedCategoryId,
        name: name.trim(),
        price: Math.round(priceValue * 100), // Convert to cents
        description: description.trim() || undefined,
      });

      navigation.goBack();
    } catch (error) {
      Alert.alert('Hata', 'Ürün eklenirken bir hata oluştu.');
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
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <SurfaceCard style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
              Ürün Adı *
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
              placeholder="Ürün adını girin..."
              placeholderTextColor={colors.textSubtle}
            />
          </SurfaceCard>

          <SurfaceCard style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
              Fiyat (₺) *
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
              value={price}
              onChangeText={setPrice}
              placeholder="0.00"
              placeholderTextColor={colors.textSubtle}
              keyboardType="decimal-pad"
            />
          </SurfaceCard>

          <SurfaceCard style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
              Açıklama
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
                height: 80,
              }}
              value={description}
              onChangeText={setDescription}
              placeholder="Ürün açıklaması (opsiyonel)..."
              placeholderTextColor={colors.textSubtle}
              multiline
              textAlignVertical="top"
            />
          </SurfaceCard>

          <SurfaceCard style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 }}>
              Kategori *
            </Text>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                onPress={() => setSelectedCategoryId(category.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  backgroundColor: selectedCategoryId === category.id ? colors.primary + '20' : 'transparent',
                  marginBottom: 4,
                }}
              >
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: selectedCategoryId === category.id ? colors.primary : colors.border,
                  backgroundColor: selectedCategoryId === category.id ? colors.primary : 'transparent',
                  marginRight: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  {selectedCategoryId === category.id && (
                    <View style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#FFFFFF',
                    }} />
                  )}
                </View>
                <Text style={{
                  fontSize: 16,
                  color: selectedCategoryId === category.id ? colors.primary : colors.text,
                  fontWeight: selectedCategoryId === category.id ? '600' : '400',
                }}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </SurfaceCard>
        </ScrollView>

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
