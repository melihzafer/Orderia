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
    toggleMenuItemActive,
    getCategoriesWithItems
  } = useMenuStore();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    categories.length > 0 ? categories[0].id : null
  );
  const [searchQuery, setSearchQuery] = useState('');

  const handleAddCategory = () => {
    Alert.prompt(
      'Kategori Ekle',
      'Kategori adını girin:',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Ekle',
          onPress: (name) => {
            if (name?.trim()) {
              const category = addCategory({ name: name.trim() });
              setSelectedCategoryId(category.id);
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const handleAddMenuItem = () => {
    if (!selectedCategoryId) {
      Alert.alert('Hata', 'Önce bir kategori seçin veya oluşturun.');
      return;
    }
    navigation.navigate('AddMenuItem', { categoryId: selectedCategoryId });
  };

  const handleDeleteMenuItem = (item: MenuItem) => {
    Alert.alert(
      'Ürünü Sil',
      `"${item.name}" ürününü silmek istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
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
    const itemCount = menuItems.filter(item => item.categoryId === category.id).length;

    return (
      <TouchableOpacity
        key={category.id}
        onPress={() => setSelectedCategoryId(category.id)}
        style={{
          paddingHorizontal: 16,
          paddingVertical: 8,
          marginRight: 8,
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1 }}>
        {/* Search Bar */}
        <View style={{ padding: 16, paddingBottom: 8 }}>
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
              placeholder="Ürün ara..."
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
                Kategori Ekle
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
                Henüz kategori eklenmemiş
              </Text>
              <PrimaryButton
                title="İlk Kategoriyi Ekle"
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
                {searchQuery ? 'Arama sonucu bulunamadı' : 'Bu kategoride henüz ürün yok'}
              </Text>
              {!searchQuery && (
                <PrimaryButton
                  title="İlk Ürünü Ekle"
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
              title="Yeni Ürün Ekle"
              onPress={handleAddMenuItem}
              fullWidth
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
