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
import { useLocalization } from '../i18n';
import { useMenuStore } from '../stores';
import { PrimaryButton, SurfaceCard } from '../components';
import { RootStackParamList } from '../navigation/AppNavigator';

type AddMenuItemRouteProp = RouteProp<RootStackParamList, 'AddMenuItem'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AddMenuItemScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddMenuItemRouteProp>();
  const { colors } = useTheme();
  const { t, currency } = useLocalization();
  
  const { categories, addMenuItem } = useMenuStore();
  const { categoryId } = route.params || {};

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryId || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t.error, t.productNameRequired);
      return;
    }

    if (!price.trim()) {
      Alert.alert(t.error, t.priceRequired);
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert(t.error, t.categoryRequired);
      return;
    }

    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      Alert.alert(t.error, t.validPriceRequired);
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
      Alert.alert(t.error, t.itemAddError);
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
        <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ backgroundColor: colors.bg }}>
          <SurfaceCard style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
              {t.productName} *
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
              placeholder={t.enterProductName}
              placeholderTextColor={colors.textSubtle}
            />
          </SurfaceCard>

          <SurfaceCard style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
              {t.priceLabel} ({currency === 'TRY' ? '₺' : currency === 'BGN' ? 'лв' : '€'}) *
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
              {t.description}
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
              placeholder={t.productDescription}
              placeholderTextColor={colors.textSubtle}
              multiline
              textAlignVertical="top"
            />
          </SurfaceCard>

          <SurfaceCard style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 }}>
              {t.category} *
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

          </KeyboardAvoidingView>
        <View style={{ padding: 16, flexDirection: 'row', gap: 12 }}>
          <PrimaryButton
            title={t.cancel}
            variant="outline"
            onPress={() => navigation.goBack()}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            title={t.save}
            onPress={handleSave}
            loading={loading}
            style={{ flex: 1 }}
          />
        </View>
    </SafeAreaView>
  );
}
