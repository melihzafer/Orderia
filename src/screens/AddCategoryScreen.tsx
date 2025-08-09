import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Alert, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BottomSheet from '@gorhom/bottom-sheet';

import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../i18n';
import { useMenuStore } from '../stores';
import { PrimaryButton, SurfaceCard, ActionSheet, ActionSheetAction } from '../components';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Category } from '../types';

type AddCategoryRouteProp = RouteProp<RootStackParamList, 'AddCategory'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AddCategoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddCategoryRouteProp>();
  const { colors } = useTheme();
  const { t } = useLocalization();
  
  const { addCategory, updateCategory, categories, deleteCategory } = useMenuStore();
  
  // Check if we're editing an existing category
  const editingCategoryId = route.params?.categoryId;
  const editingCategory = editingCategoryId ? categories.find(c => c.id === editingCategoryId) : null;
  const isEditing = !!editingCategory;
  
  const [categoryName, setCategoryName] = useState(editingCategory?.name || '');
  
  // Action sheet for category actions
  const [showCategoryActions, setShowCategoryActions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const actionSheetRef = useRef<BottomSheet>(null);

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
        setCategoryName(''); // Clear form for next entry
      }
      if (isEditing) {
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert(t.error, 'Bir hata oluştu');
    }
  };

  const handleCategoryLongPress = (category: Category) => {
    setSelectedCategory(category);
    setShowCategoryActions(true);
  };

  const handleEditCategory = (category: Category) => {
    navigation.navigate('AddCategory', { categoryId: category.id });
    setShowCategoryActions(false);
  };

  const handleDeleteCategory = (category: Category) => {
    Alert.alert(
      t.deleteCategory || 'Delete Category',
      `Are you sure you want to delete "${category.name}"?`,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.delete,
          style: 'destructive',
          onPress: () => {
            try {
              deleteCategory(category.id);
              setShowCategoryActions(false);
              setSelectedCategory(null);
              Alert.alert(t.success, t.categoryDeleted || 'Category deleted');
            } catch (error) {
              Alert.alert(t.error, t.genericError);
            }
          }
        }
      ]
    );
  };

  const getCategoryActions = (): ActionSheetAction[] => [
    {
      id: 'edit',
      title: t.edit || 'Edit',
      icon: 'pencil',
      onPress: () => selectedCategory && handleEditCategory(selectedCategory),
    },
    {
      id: 'delete',
      title: t.delete || 'Delete',
      icon: 'trash',
      destructive: true,
      onPress: () => selectedCategory && handleDeleteCategory(selectedCategory),
    },
  ];

  const renderCategory = ({ item }: { item: Category }) => {
    return (
      <TouchableOpacity onLongPress={() => handleCategoryLongPress(item)}>
        <SurfaceCard style={{ marginBottom: 8 }} variant="outlined">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
              {item.name}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSubtle }}>
              Hold for options
            </Text>
          </View>
        </SurfaceCard>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom', 'left', 'right']}>
      <View style={{ flex: 1, padding: 16, backgroundColor: colors.bg }}>
        
        {/* Add/Edit Form */}
        <SurfaceCard style={{ marginBottom: 16 }}>
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
              marginBottom: 16
            }}
            placeholder={t.enterCategoryName}
            placeholderTextColor={colors.textSubtle}
            value={categoryName}
            onChangeText={setCategoryName}
            autoFocus={isEditing}
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

        {/* Existing Categories List (only show when not editing) */}
        {!isEditing && categories.length > 0 && (
          <View style={{ flex: 1 }}>
            <Text style={{ 
              fontSize: 16, 
              fontWeight: '600', 
              color: colors.text,
              marginBottom: 12
            }}>
              Existing Categories
            </Text>
            <FlatList
              data={categories}
              renderItem={renderCategory}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}

        {/* Action Sheet */}
        {selectedCategory && (
          <ActionSheet
            ref={actionSheetRef}
            title={selectedCategory.name}
            subtitle="Actions for this category"
            actions={getCategoryActions()}
            isVisible={showCategoryActions}
            onClose={() => {
              setShowCategoryActions(false);
              setSelectedCategory(null);
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
