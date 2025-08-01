import React, { useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  ScrollView,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../i18n';
import { useMenuStore } from '../stores';
import { PrimaryButton, SurfaceCard } from '../components';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Category, MenuItem } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MenuScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const { t, formatPrice } = useLocalization();
  
  const { 
    categories, 
    menuItems,
    addCategory,
    updateMenuItem,
    deleteMenuItem,
    deleteCategory,
    toggleMenuItemActive,
    getCategoriesWithItems
  } = useMenuStore();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    categories.length > 0 ? categories[0].id : null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showActionsForCategory, setShowActionsForCategory] = useState<string | null>(null);

  const handleAddCategory = () => {
    navigation.navigate('AddCategory', {});
  };

  const handleEditCategory = (categoryId: string) => {
    navigation.navigate('AddCategory', { categoryId });
  };

  const handleDeleteCategory = (category: Category) => {
    const itemCount = menuItems.filter(item => item.categoryId === category.id).length;
    const confirmMessage = itemCount > 0 
      ? `${t.deleteCategoryConfirm} Bu kategoride ${itemCount} ürün var ve hepsi silinecek.`
      : t.deleteCategoryConfirm;
      
    Alert.alert(
      t.deleteCategory,
      confirmMessage,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.delete,
          style: 'destructive',
          onPress: () => {
            deleteCategory(category.id);
            Alert.alert(t.success, t.categoryDeleted);
            // If we just deleted the selected category, reset selection
            if (selectedCategoryId === category.id) {
              setSelectedCategoryId(categories.length > 1 ? categories.find(c => c.id !== category.id)?.id || null : null);
            }
          }
        }
      ]
    );
  };

  const handleAddMenuItem = () => {
    if (!selectedCategoryId) {
      Alert.alert(t.error, t.selectCategoryFirst);
      return;
    }
    navigation.navigate('AddMenuItem', { categoryId: selectedCategoryId });
  };

  const handleDeleteMenuItem = (item: MenuItem) => {
    Alert.alert(
      t.deleteItem,
      `"${item.name}" ${t.deleteItemConfirm}`,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.delete,
          style: 'destructive',
          onPress: () => deleteMenuItem(item.id)
        }
      ]
    );
  };

  const filteredMenuItems = menuItems.filter(item => {
    const matchesCategory = !selectedCategoryId || item.categoryId === selectedCategoryId;
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  const renderCategoryTab = (category: Category) => {
    const isSelected = selectedCategoryId === category.id;
    const showActions = showActionsForCategory === category.id;
    const itemCount = menuItems.filter(item => item.categoryId === category.id).length;

    return (
      <View key={category.id} style={{ marginRight: 8, position: 'relative' }}>
        <TouchableOpacity
          onPress={() => {
            setSelectedCategoryId(category.id);
            setShowActionsForCategory(null); // Hide actions when selecting normally
          }}
          onLongPress={() => {
            setSelectedCategoryId(category.id);
            setShowActionsForCategory(showActions ? null : category.id); // Toggle actions
          }}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 20,
            borderRadius: 20,
            backgroundColor: isSelected ? colors.primary : colors.surfaceAlt,
            borderWidth: 1,
            borderColor: isSelected ? colors.primary : colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{
              color: isSelected ? '#FFFFFF' : colors.text,
              fontWeight: isSelected ? '600' : '400',
              fontSize: 14,
            }}>
              {category.name}
            </Text>
            {itemCount > 0 && (
              <View style={{
                backgroundColor: isSelected ? '#FFFFFF' : colors.primary,
                borderRadius: 10,
                minWidth: 18,
                height: 18,
                justifyContent: 'center',
                alignItems: 'center',
                marginLeft: 6,
              }}>
                <Text style={{
                  color: isSelected ? colors.primary : '#FFFFFF',
                  fontSize: 10,
                  fontWeight: '600',
                }}>
                  {itemCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        {showActions && (
          <View style={{ position: 'absolute', top: 4, right: -10, flexDirection: 'row', gap: 4, zIndex: 100,   }}>
            <TouchableOpacity
              onPress={() => {
                handleEditCategory(category.id);
                setShowActionsForCategory(null); // Hide actions after action
              }}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 100,
                padding: 10,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Ionicons name="pencil" size={10} color={colors.textSubtle} />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => {
                handleDeleteCategory(category);
                setShowActionsForCategory(null); // Hide actions after action
              }}
              style={{
                backgroundColor: '#FF4444',
                borderRadius: 100,
                padding: 10,
                borderWidth: 1,
                borderColor: '#FF4444',
              }}
            >
              <Ionicons name="trash" size={10} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderMenuItem = ({ item }: { item: MenuItem }) => {
    return (
      <SurfaceCard style={{ marginBottom: 8 }} variant="outlined">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: item.isActive ? colors.text : colors.textSubtle,
              textDecorationLine: item.isActive ? 'none' : 'line-through',
            }}>
              {item.name}
            </Text>
            
            {item.description && (
              <Text style={{
                fontSize: 14,
                color: colors.textSubtle,
                marginTop: 2,
              }}>
                {item.description}
              </Text>
            )}
            
            <Text style={{
              fontSize: 18,
              fontWeight: '700',
              color: colors.primary,
              marginTop: 4,
            }}>
              {formatPrice(item.price)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => toggleMenuItemActive(item.id)}
              style={{
                padding: 8,
                marginRight: 4,
              }}
            >
              <Ionicons 
                name={item.isActive ? 'eye' : 'eye-off'} 
                size={20} 
                color={item.isActive ? colors.primary : colors.textSubtle} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => handleDeleteMenuItem(item)}
              style={{
                padding: 8,
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </SurfaceCard>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom', 'left', 'right']}>
      <TouchableOpacity 
        style={{ flex: 1 }} 
        activeOpacity={1} 
        onPress={() => setShowActionsForCategory(null)}
      >
        <View style={{ flex: 1 }} onStartShouldSetResponder={() => true}>
        {/* Search Bar */}
        <View style={{ padding: 16, paddingBottom: 8, backgroundColor: colors.bg }}>
          <View style={{
            flexDirection: 'row',
            backgroundColor: colors.surfaceAlt,
            borderRadius: 8,
            paddingHorizontal: 12,
            alignItems: 'center',
          }}>
            <Ionicons name="search" size={20} color={colors.textSubtle} />
            <TextInput
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 8,
                fontSize: 16,
                color: colors.text,
              }}
              placeholder={t.searchItems}
              placeholderTextColor={colors.textSubtle}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Category Tabs */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 16 }}
          >
            {categories.map(renderCategoryTab)}
            <TouchableOpacity
              onPress={handleAddCategory}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: colors.surfaceAlt,
                borderWidth: 1,
                borderColor: colors.border,
                borderStyle: 'dashed',
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Ionicons name="add" size={16} color={colors.textSubtle} />
              <Text style={{
                color: colors.textSubtle,
                fontSize: 14,
                marginLeft: 4,
              }}>
                {t.addCategory}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Menu Items */}
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          {categories.length === 0 ? (
            <SurfaceCard style={{ padding: 32 }}>
              <Text style={{ 
                textAlign: 'center', 
                color: colors.textSubtle,
                fontSize: 16,
                marginBottom: 16
              }}>
                {t.noCategoriesYet}
              </Text>
              <PrimaryButton
                title={t.addFirstCategory}
                onPress={handleAddCategory}
                fullWidth
              />
            </SurfaceCard>
          ) : filteredMenuItems.length === 0 ? (
            <SurfaceCard style={{ padding: 32 }}>
              <Text style={{ 
                textAlign: 'center', 
                color: colors.textSubtle,
                fontSize: 16,
                marginBottom: 16
              }}>
                {searchQuery ? t.noItemsFound : t.noCategoryItems}
              </Text>
              {!searchQuery && (
                <PrimaryButton
                  title={t.addFirstItem}
                  onPress={handleAddMenuItem}
                  fullWidth
                />
              )}
            </SurfaceCard>
          ) : (
            <FlatList
              data={filteredMenuItems}
              renderItem={renderMenuItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Add Menu Item Button */}
        {categories.length > 0 && (
          <View style={{ padding: 16, paddingTop: 8 }}>
            <PrimaryButton
              title={t.addNewItem}
              onPress={handleAddMenuItem}
              fullWidth
            />
          </View>
        )}
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
