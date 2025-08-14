import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { 
  View, 
  TextInput, 
  FlatList, 
  Text, 
  TouchableOpacity, 
  Keyboard,
  Dimensions,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../i18n';
import { MenuItem, Category } from '../types';
import { spacing, radius } from '../constants/branding';
import { createTextMatcher } from '../utils/searchUtils';

interface ProductSearchProps {
  items: MenuItem[];
  categories: Category[];
  onSelectItem: (item: MenuItem) => void;
  onClose: () => void;
  isVisible: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function ProductSearch({ 
  items, 
  categories, 
  onSelectItem, 
  onClose,
  isVisible,
  placeholder,
  autoFocus = true
}: ProductSearchProps) {
  const { colors } = useTheme();
  const { t, formatPrice } = useLocalization();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isKeyboardNavigating, setIsKeyboardNavigating] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  const searchInputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);
  const screenWidth = Dimensions.get('window').width;
  
  // Debounce search query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setSelectedIndex(0);
      setIsKeyboardNavigating(false);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);
  
  // Filtered items with optimized search
  const filteredItems = useMemo(() => {
    let filtered = items.filter(item => item.isActive !== false); // Only show active items
    
    // Category filter
    if (selectedCategoryId) {
      filtered = filtered.filter(item => item.categoryId === selectedCategoryId);
    }
    
    // Search filter
    if (debouncedQuery.trim()) {
      const matcher = createTextMatcher(debouncedQuery);
      filtered = filtered.filter(item => 
        matcher(item.name) ||
        matcher(item.description) ||
        matcher(categories.find(cat => cat.id === item.categoryId)?.name)
      );
    }
    
    return filtered;
  }, [items, categories, selectedCategoryId, debouncedQuery]);
  
  // Keyboard navigation handler
  const handleKeyPress = useCallback((event: any) => {
    const { key } = event.nativeEvent;
    
    switch (key) {
      case 'ArrowDown':
        event.preventDefault();
        setIsKeyboardNavigating(true);
        setSelectedIndex(prev => 
          prev < filteredItems.length - 1 ? prev + 1 : prev
        );
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        setIsKeyboardNavigating(true);
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
        
      case 'Enter':
        event.preventDefault();
        if (filteredItems[selectedIndex]) {
          onSelectItem(filteredItems[selectedIndex]);
        }
        break;
        
      case 'Escape':
        event.preventDefault();
        onClose();
        break;
    }
  }, [filteredItems, selectedIndex, onSelectItem, onClose]);
  
  // Auto-scroll to selected item in keyboard navigation
  useEffect(() => {
    if (isKeyboardNavigating && flatListRef.current && filteredItems.length > 0) {
      flatListRef.current.scrollToIndex({
        index: selectedIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }
  }, [selectedIndex, isKeyboardNavigating, filteredItems.length]);
  
  // Category filter component
  const renderCategoryFilter = () => (
    <View style={{
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    }}>
      <Text style={{
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.sm,
      }}>
        {t.categories || 'Categories'}
      </Text>
      
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[{ id: null, name: t.all || 'All' }, ...categories]}
        keyExtractor={item => item.id || 'all'}
        renderItem={({ item }) => {
          const isSelected = selectedCategoryId === item.id;
          return (
            <TouchableOpacity
              onPress={() => setSelectedCategoryId(item.id)}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                marginRight: spacing.sm,
                borderRadius: radius.full,
                backgroundColor: isSelected ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: isSelected ? colors.primary : colors.border,
              }}
              accessibilityRole="button"
              accessibilityLabel={`${t.category || 'Category'}: ${item.name}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={{
                color: isSelected ? colors.primaryContrast : colors.text,
                fontSize: 14,
                fontWeight: '500',
              }}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
  
  // Search input component
  const renderSearchInput = () => (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      margin: spacing.md,
      paddingHorizontal: spacing.md,
    }}>
      <Ionicons name="search" size={20} color={colors.textSubtle} />
      <TextInput
        ref={searchInputRef}
        value={searchQuery}
        onChangeText={setSearchQuery}
        onKeyPress={handleKeyPress}
        placeholder={placeholder || t.searchProducts || 'Search products...'}
        placeholderTextColor={colors.textSubtle}
        style={{
          flex: 1,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.sm,
          fontSize: 16,
          color: colors.text,
        }}
        autoFocus={autoFocus}
        accessibilityLabel={t.searchProducts || 'Search products'}
        accessibilityHint={t.searchProductsHint || 'Type to search products, use arrow keys to navigate, Enter to select'}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity
          onPress={() => setSearchQuery('')}
          accessibilityRole="button"
          accessibilityLabel={t.clearSearch || 'Clear search'}
          style={{
            padding: spacing.xs,
          }}
        >
          <Ionicons name="close-circle" size={20} color={colors.textSubtle} />
        </TouchableOpacity>
      )}
    </View>
  );
  
  // Empty state component
  const renderEmptyState = () => (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
    }}>
      <Ionicons 
        name={searchQuery ? "search" : "restaurant"} 
        size={64} 
        color={colors.textSubtle} 
      />
      <Text style={{
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginTop: spacing.md,
        textAlign: 'center',
      }}>
        {searchQuery 
          ? t.noSearchResults || 'No products found'
          : selectedCategoryId 
            ? t.noProductsInCategory || 'No products in this category'
            : t.noProducts || 'No products available'
        }
      </Text>
      <Text style={{
        fontSize: 14,
        color: colors.textSubtle,
        marginTop: spacing.xs,
        textAlign: 'center',
        lineHeight: 20,
      }}>
        {searchQuery 
          ? t.tryDifferentSearch || 'Try a different search term or browse categories'
          : t.selectDifferentCategory || 'Try selecting a different category or add some products'
        }
      </Text>
    </View>
  );
  
  // Product item component
  const renderItem = ({ item, index }: { item: MenuItem; index: number }) => {
    const isSelected = index === selectedIndex && isKeyboardNavigating;
    const category = categories.find(cat => cat.id === item.categoryId);
    
    return (
      <TouchableOpacity
        onPress={() => onSelectItem(item)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.md,
          backgroundColor: isSelected ? colors.primary + '10' : colors.surface,
          borderLeftWidth: isSelected ? 3 : 0,
          borderLeftColor: colors.primary,
          marginHorizontal: spacing.md,
          marginVertical: spacing.xs,
          borderRadius: radius.md,
          ...(isSelected && {
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
          }),
        }}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${formatPrice(item.price)}, ${item.description || ''}`}
        accessibilityHint={t.tapToAddItem || 'Tap to add this item'}
      >
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
            marginBottom: spacing.xs,
          }}>
            {item.name}
          </Text>
          {item.description && (
            <Text style={{
              fontSize: 14,
              color: colors.textSubtle,
              marginBottom: spacing.xs,
              lineHeight: 20,
            }} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '700',
              color: colors.primary,
            }}>
              {formatPrice(item.price)}
            </Text>
            {category && (
              <Text style={{
                fontSize: 12,
                color: colors.textSubtle,
                backgroundColor: colors.surfaceAlt,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                borderRadius: radius.sm,
              }}>
                {category.name}
              </Text>
            )}
          </View>
        </View>
        <View style={{
          marginLeft: spacing.md,
          padding: spacing.sm,
          borderRadius: radius.full,
          backgroundColor: colors.primary + (isSelected ? '20' : '10'),
        }}>
          <Ionicons name="add" size={20} color={colors.primary} />
        </View>
      </TouchableOpacity>
    );
  };
  
  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '700',
            color: colors.text,
          }}>
            {t.selectProduct || 'Select Product'}
          </Text>
        <TouchableOpacity
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t.close || 'Close'}
          style={{
            padding: spacing.sm,
            borderRadius: radius.sm,
          }}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      
      {/* Search Input */}
      {renderSearchInput()}
      
      {/* Category Filter */}
      {categories.length > 0 && renderCategoryFilter()}
      
      {/* Results Count */}
      <View style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
      }}>
        <Text style={{
          fontSize: 14,
          color: colors.textSubtle,
        }}>
          {filteredItems.length} {t.itemsFound || 'items found'}
        </Text>
      </View>
      
      {/* Product List */}
      {filteredItems.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          ref={flatListRef}
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => {
            Keyboard.dismiss();
            setIsKeyboardNavigating(false);
          }}
          getItemLayout={(data, index) => ({
            length: 80, // Approximate item height
            offset: 80 * index,
            index,
          })}
          onScrollToIndexFailed={(info) => {
            // Handle scroll to index failure gracefully
            console.warn('Scroll to index failed:', info);
          }}
        />
      )}
      </SafeAreaView>
    </Modal>
  );
}
