import React, { useState } from 'react';
import { View, Text, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../i18n';
import { useMenuStore } from '../stores';
import { PrimaryButton, SurfaceCard } from '../components';
import { RootStackParamList } from '../navigation/AppNavigator';

type AddCategoryRouteProp = RouteProp<RootStackParamList, 'AddCategory'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AddCategoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddCategoryRouteProp>();
  const { colors } = useTheme();
  const { t } = useLocalization();
  
  const { addCategory, updateCategory, categories } = useMenuStore();
  
  // Check if we're editing an existing category
  const editingCategoryId = route.params?.categoryId;
  const editingCategory = editingCategoryId ? categories.find(c => c.id === editingCategoryId) : null;
  const isEditing = !!editingCategory;
  
  const [categoryName, setCategoryName] = useState(editingCategory?.name || '');

  const handleSave = () => {
    if (!categoryName.trim()) {
      Alert.alert(t.error, t.enterCategoryName);
      return;
    }

    try {
      if (isEditing && editingCategoryId) {
        updateCategory(editingCategoryId, { name: categoryName.trim() });
        Alert.alert(t.success, t.categoryUpdated);
      } else {
        addCategory({ name: categoryName.trim() });
        Alert.alert(t.success, t.categoryAdded);
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert(t.error, 'Bir hata oluştu');
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
            {isEditing ? t.editCategory : t.addCategory}
          </Text>
          
          <Text style={{ 
            fontSize: 14, 
            color: colors.textSubtle,
            marginBottom: 8
          }}>
            {t.categoryName} *
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
              marginBottom: 24
            }}
            placeholder={t.enterCategoryName}
            placeholderTextColor={colors.textSubtle}
            value={categoryName}
            onChangeText={setCategoryName}
            autoFocus
          />
          
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <PrimaryButton
              title={t.cancel}
              variant="outline"
              onPress={() => navigation.goBack()}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              title={isEditing ? t.save : t.add}
              onPress={handleSave}
              style={{ flex: 1 }}
            />
          </View>
        </SurfaceCard>
      </View>
    </SafeAreaView>
  );
}
