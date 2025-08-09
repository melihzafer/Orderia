import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import BottomSheet from '@gorhom/bottom-sheet';

import { useTheme } from "../contexts/ThemeContext";
import { useLocalization } from "../i18n";
import { useMenuStore } from "../stores";
import { PrimaryButton, SurfaceCard, ActionSheet, ActionSheetAction } from "../components";
import { RootStackParamList } from "../navigation/AppNavigator";
import { MenuItem } from "../types";

type AddMenuItemRouteProp = RouteProp<RootStackParamList, "AddMenuItem">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AddMenuItemScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddMenuItemRouteProp>();
  const { colors } = useTheme();
  const { t, currency } = useLocalization();

  const { categories, addMenuItem, menuItems, updateMenuItem, deleteMenuItem } = useMenuStore();
  const { categoryId, itemId } = route.params || {};

  // Check if we're editing an existing item
  const editingItem = itemId ? menuItems.find(item => item.id === itemId) : null;
  const isEditing = !!editingItem;

  const [name, setName] = useState(editingItem?.name || "");
  const [price, setPrice] = useState(editingItem?.price?.toString() || "");
  const [description, setDescription] = useState(editingItem?.description || "");
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    categoryId || editingItem?.categoryId || ""
  );
  const [loading, setLoading] = useState(false);

  // Action sheet for menu item actions
  const [showItemActions, setShowItemActions] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const actionSheetRef = useRef<BottomSheet>(null);

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
      if (isEditing && editingItem) {
        updateMenuItem(editingItem.id, {
          categoryId: selectedCategoryId,
          name: name.trim(),
          price: Math.round(priceValue * 100), // Convert to cents
          description: description.trim() || undefined,
        });
      } else {
        addMenuItem({
          categoryId: selectedCategoryId,
          name: name.trim(),
          price: Math.round(priceValue * 100), // Convert to cents
          description: description.trim() || undefined,
        });
      }

      // Clear form if adding new item
      if (!isEditing) {
        setName("");
        setPrice("");
        setDescription("");
        setSelectedCategoryId(categoryId || "");
      } else {
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert(t.error, t.itemAddError);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuItemLongPress = (item: MenuItem) => {
    setSelectedMenuItem(item);
    setShowItemActions(true);
  };

  const handleEditMenuItem = (item: MenuItem) => {
    setShowItemActions(false);
    setSelectedMenuItem(null);
    navigation.navigate('AddMenuItem', { categoryId: item.categoryId, itemId: item.id });
  };

  const handleDeleteMenuItem = (item: MenuItem) => {
    setShowItemActions(false);
    setSelectedMenuItem(null);
    
    Alert.alert(
      t.confirmDelete || 'Confirm Delete',
      `Are you sure you want to delete "${item.name}"?`,
      [
        {
          text: t.cancel || 'Cancel',
          style: 'cancel',
        },
        {
          text: t.delete || 'Delete',
          style: 'destructive',
          onPress: () => {
            try {
              deleteMenuItem(item.id);
            } catch (error) {
              Alert.alert(t.error, t.genericError);
            }
          }
        }
      ]
    );
  };

  const getMenuItemActions = (): ActionSheetAction[] => [
    {
      id: 'edit',
      title: t.edit || 'Edit',
      icon: 'pencil',
      onPress: () => selectedMenuItem && handleEditMenuItem(selectedMenuItem),
    },
    {
      id: 'delete',
      title: t.delete || 'Delete',
      icon: 'trash',
      destructive: true,
      onPress: () => selectedMenuItem && handleDeleteMenuItem(selectedMenuItem),
    },
  ];

  const renderMenuItem = ({ item }: { item: MenuItem }) => {
    const category = categories.find(cat => cat.id === item.categoryId);
    return (
      <TouchableOpacity onLongPress={() => handleMenuItemLongPress(item)}>
        <SurfaceCard style={{ marginBottom: 8 }} variant="outlined">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                {item.name}
              </Text>
              {category && (
                <Text style={{ fontSize: 12, color: colors.textSubtle, marginTop: 2 }}>
                  {category.name}
                </Text>
              )}
              {item.description && (
                <Text style={{ fontSize: 14, color: colors.textSubtle, marginTop: 4 }}>
                  {item.description}
                </Text>
              )}
            </View>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
              {currency}{(item.price / 100).toFixed(2)}
            </Text>
          </View>
        </SurfaceCard>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={["bottom", "left", "right"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={{ flex: 1, padding: 16, backgroundColor: colors.bg }}>
          
          {/* Add/Edit Form */}
          <SurfaceCard style={{ marginBottom: 16 }}>
            <Text style={{ 
              fontSize: 18, 
              fontWeight: '600', 
              color: colors.text,
              marginBottom: 16
            }}>
              {isEditing ? t.editMenuItem || 'Edit Menu Item' : t.addMenuItem || 'Add Menu Item'}
            </Text>

            <Text
              style={{
                fontSize: 14,
                color: colors.textSubtle,
                marginBottom: 8,
              }}
            >
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
                marginBottom: 16,
              }}
              value={name}
              onChangeText={setName}
              placeholder={t.enterProductName}
              placeholderTextColor={colors.textSubtle}
              autoFocus={isEditing}
            />

            <Text
              style={{
                fontSize: 14,
                color: colors.textSubtle,
                marginBottom: 8,
              }}
            >
              {t.priceLabel} ({currency === "TRY" ? "₺" : currency === "BGN" ? "лв" : "€"}) *
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
                marginBottom: 16,
              }}
              value={price}
              onChangeText={setPrice}
              placeholder="0.00"
              placeholderTextColor={colors.textSubtle}
              keyboardType="decimal-pad"
            />

            <Text
              style={{
                fontSize: 14,
                color: colors.textSubtle,
                marginBottom: 8,
              }}
            >
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
                marginBottom: 16,
                minHeight: 80,
              }}
              value={description}
              onChangeText={setDescription}
              placeholder={t.productDescription}
              placeholderTextColor={colors.textSubtle}
              multiline
              textAlignVertical="top"
            />

            <Text
              style={{
                fontSize: 14,
                color: colors.textSubtle,
                marginBottom: 8,
              }}
            >
              {t.category} *
            </Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}
            >
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={{
                    backgroundColor:
                      selectedCategoryId === category.id
                        ? colors.primary
                        : colors.surface,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 20,
                    marginRight: 8,
                    borderWidth: 1,
                    borderColor:
                      selectedCategoryId === category.id
                        ? colors.primary
                        : colors.border,
                  }}
                  onPress={() => setSelectedCategoryId(category.id)}
                >
                  <Text
                    style={{
                      color:
                        selectedCategoryId === category.id
                          ? colors.primaryContrast
                          : colors.text,
                      fontWeight: "600",
                    }}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <PrimaryButton
                title={t.cancel}
                variant="outline"
                onPress={() => navigation.goBack()}
                style={{ flex: 1 }}
              />
              <PrimaryButton
                title={isEditing ? t.update : t.save}
                onPress={handleSave}
                loading={loading}
                disabled={!name.trim() || !price.trim() || !selectedCategoryId}
                style={{ flex: 1 }}
              />
            </View>
          </SurfaceCard>

          {/* Existing Menu Items List */}
          {!isEditing && menuItems.length > 0 && (
            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '600', 
                color: colors.text,
                marginBottom: 12
              }}>
                Existing Menu Items
              </Text>
              <FlatList
                data={menuItems}
                renderItem={renderMenuItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
              />
            </View>
          )}

          {/* Action Sheet */}
          {selectedMenuItem && (
            <ActionSheet
              ref={actionSheetRef}
              title={selectedMenuItem.name}
              subtitle="Actions for this menu item"
              actions={getMenuItemActions()}
              isVisible={showItemActions}
              onClose={() => {
                setShowItemActions(false);
                setSelectedMenuItem(null);
              }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
