import React, { useState, useRef } from 'react';
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
import BottomSheet from '@gorhom/bottom-sheet';

import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../i18n';
import { useMenuStore } from '../stores';
import { PrimaryButton, SurfaceCard, ActionSheet, ActionSheetAction, ProductSearch } from '../components';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Category, MenuItem } from '../types';
import { useDebounceSearch, searchMenuItems } from '../utils/searchUtils';

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
  
  // Use debounced search for better performance
  const { searchQuery, setSearchQuery, debouncedQuery } = useDebounceSearch('', 300);
  
  // Product search modal state
  const [showProductSearch, setShowProductSearch] = useState(false);
  
  // Action sheet for menu items
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [showItemActions, setShowItemActions] = useState(false);
  const actionSheetRef = useRef<BottomSheet>(null);

  // Action sheet for categories
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showCategoryActions, setShowCategoryActions] = useState(false);
  const categoryActionSheetRef = useRef<BottomSheet>(null);

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

  const handleEditMenuItem = (menuItem: MenuItem) => {
    navigation.navigate('AddMenuItem', { categoryId: menuItem.categoryId, itemId: menuItem.id });
    setShowItemActions(false);
  };

  const handleToggleItemStatus = (menuItem: MenuItem) => {
    updateMenuItem(menuItem.id, { isActive: !menuItem.isActive });
    setShowItemActions(false);
  };

  const handleItemLongPress = (menuItem: MenuItem) => {
    setSelectedMenuItem(menuItem);
    setShowItemActions(true);
  };

  const handleCategoryLongPress = (category: Category) => {
    setSelectedCategory(category);
    setShowCategoryActions(true);
  };

  // Define action sheet actions for menu items
  const getItemActions = (menuItem: MenuItem): ActionSheetAction[] => [
    {
      id: 'edit',
      title: t.edit || 'Edit',
      icon: 'pencil',
      onPress: () => handleEditMenuItem(menuItem),
    },
    {
      id: 'toggle',
      title: menuItem.isActive ? 'Deactivate' : 'Activate',
      icon: menuItem.isActive ? 'eye-off' : 'eye',
      onPress: () => handleToggleItemStatus(menuItem),
    },
    {
      id: 'delete',
      title: t.delete || 'Delete',
      icon: 'trash',
      destructive: true,
      onPress: () => handleDeleteMenuItem(menuItem),
    },
  ];

  // Define action sheet actions for categories
  const getCategoryActions = (category: Category): ActionSheetAction[] => [
    {
      id: 'edit',
      title: t.edit || 'Edit',
      icon: 'pencil',
      onPress: () => {
        handleEditCategory(category.id);
        setShowCategoryActions(false);
      },
    },
    {
      id: 'delete',
      title: t.delete || 'Delete',
      icon: 'trash',
      destructive: true,
      onPress: () => {
        handleDeleteCategory(category);
        setShowCategoryActions(false);
      },
    },
  ];

  // Use improved search with debouncing
  const filteredMenuItems = searchMenuItems(
    menuItems,
    debouncedQuery,
    selectedCategoryId || undefined
  );

  const renderCategoryTab = (category: Category) => {
    const isSelected = selectedCategoryId === category.id;
    const itemCount = menuItems.filter(item => item.categoryId === category.id).length;

    return (
      <View key={category.id} style={{ marginRight: 8, position: 'relative' }}>
        <TouchableOpacity
          onPress={() => {
            setSelectedCategoryId(category.id);
          }}
          onLongPress={() => handleCategoryLongPress(category)}
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
      </View>
    );
  };

  const renderMenuItem = ({ item }: { item: MenuItem }) => {
    return (
      <TouchableOpacity
        onLongPress={() => handleItemLongPress(item)}
        activeOpacity={0.7}
      >
        <SurfaceCard style={{ marginBottom: 8 }} variant="outlined">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: item.isActive ? colors.text : colors.textSubtle,
                  textDecorationLine: item.isActive ? 'none' : 'line-through',
                  flex: 1,
                }}>
                  {item.name}
                </Text>
                {!item.isActive && (
                  <View style={{
                    backgroundColor: colors.textSubtle + '20',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                    marginLeft: 8,
                  }}>
                    <Text style={{
                      fontSize: 10,
                      color: colors.textSubtle,
                      fontWeight: '600',
                    }}>
                      INACTIVE
                    </Text>
                  </View>
                )}
              </View>
              
              {item.description && (
                <Text style={{
                  fontSize: 14,
                  color: colors.textSubtle,
                  marginBottom: 4,
                }}>
                  {item.description}
                </Text>
              )}
              
              <Text style={{
                fontSize: 18,
                fontWeight: '700',
                color: colors.primary,
              }}>
                {formatPrice(item.price)}
              </Text>
            </View>

            <View style={{ alignItems: 'center' }}>
              <Ionicons 
                name="ellipsis-vertical" 
                size={20} 
                color={colors.textSubtle} 
              />
              <Text style={{
                fontSize: 10,
                color: colors.textSubtle,
                marginTop: 2,
              }}>
                Hold
              </Text>
            </View>
          </View>
        </SurfaceCard>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom', 'left', 'right']}>
      <View style={{ flex: 1 }}>
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
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={{ 
                  padding: 4,
                  marginLeft: 4,
                  borderRadius: 12,
                  backgroundColor: colors.textSubtle + '20',
                }}
              >
                <Ionicons name="close" size={16} color={colors.textSubtle} />
              </TouchableOpacity>
            )}
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
              <View style={{ alignItems: 'center' }}>
                <Ionicons 
                  name={debouncedQuery ? "search" : "restaurant-outline"} 
                  size={48} 
                  color={colors.textSubtle} 
                  style={{ marginBottom: 16 }} 
                />
                <Text style={{ 
                  textAlign: 'center', 
                  color: colors.textSubtle,
                  fontSize: 16,
                  marginBottom: 8
                }}>
                  {debouncedQuery ? t.noItemsFound : t.noCategoryItems}
                </Text>
                {debouncedQuery ? (
                  <Text style={{ 
                    textAlign: 'center', 
                    color: colors.textSubtle,
                    fontSize: 14,
                    fontStyle: 'italic'
                  }}>
                    Try adjusting your search query
                  </Text>
                ) : (
                  <PrimaryButton
                    title={t.addFirstItem}
                    onPress={handleAddMenuItem}
                    fullWidth
                  />
                )}
              </View>
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

      {/* Action Sheet for Menu Items */}
      {selectedMenuItem && (
        <ActionSheet
          ref={actionSheetRef}
          title={selectedMenuItem.name}
          subtitle={`Actions for this menu item`}
          actions={getItemActions(selectedMenuItem)}
          isVisible={showItemActions}
          onClose={() => {
            setShowItemActions(false);
            setSelectedMenuItem(null);
          }}
        />
      )}

      {/* Action Sheet for Categories */}
      {selectedCategory && (
        <ActionSheet
          ref={categoryActionSheetRef}
          title={selectedCategory.name}
          subtitle={`Actions for this category`}
          actions={getCategoryActions(selectedCategory)}
          isVisible={showCategoryActions}
          onClose={() => {
            setShowCategoryActions(false);
            setSelectedCategory(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}
