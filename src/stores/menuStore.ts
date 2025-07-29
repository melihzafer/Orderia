import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Category, MenuItem, CreateCategoryData, CreateMenuItemData } from '../types';
import { generateId } from '../constants/branding';

interface MenuState {
  categories: Category[];
  menuItems: MenuItem[];
  
  // Category actions
  addCategory: (data: CreateCategoryData) => Category;
  updateCategory: (id: string, data: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  
  // Menu item actions
  addMenuItem: (data: CreateMenuItemData) => MenuItem;
  updateMenuItem: (id: string, data: Partial<MenuItem>) => void;
  deleteMenuItem: (id: string) => void;
  toggleMenuItemActive: (id: string) => void;
  
  // Selectors
  getCategoriesWithItems: () => Array<Category & { items: MenuItem[] }>;
  getActiveMenuItems: () => MenuItem[];
  getMenuItemsByCategory: (categoryId: string) => MenuItem[];
}

export const useMenuStore = create<MenuState>()(
  persist(
    (set, get) => ({
      categories: [],
      menuItems: [],

      // Category actions
      addCategory: (data) => {
        const category: Category = {
          id: generateId(),
          name: data.name,
          order: data.order ?? get().categories.length,
        };
        
        set((state) => ({
          categories: [...state.categories, category].sort((a, b) => a.order - b.order)
        }));
        
        return category;
      },

      updateCategory: (id, data) => {
        set((state) => ({
          categories: state.categories.map((cat) =>
            cat.id === id ? { ...cat, ...data } : cat
          ).sort((a, b) => a.order - b.order)
        }));
      },

      deleteCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter((cat) => cat.id !== id),
          menuItems: state.menuItems.filter((item) => item.categoryId !== id)
        }));
      },

      // Menu item actions
      addMenuItem: (data) => {
        const menuItem: MenuItem = {
          id: generateId(),
          categoryId: data.categoryId,
          name: data.name,
          price: data.price,
          description: data.description,
          isActive: true,
        };
        
        set((state) => ({
          menuItems: [...state.menuItems, menuItem]
        }));
        
        return menuItem;
      },

      updateMenuItem: (id, data) => {
        set((state) => ({
          menuItems: state.menuItems.map((item) =>
            item.id === id ? { ...item, ...data } : item
          )
        }));
      },

      deleteMenuItem: (id) => {
        set((state) => ({
          menuItems: state.menuItems.filter((item) => item.id !== id)
        }));
      },

      toggleMenuItemActive: (id) => {
        set((state) => ({
          menuItems: state.menuItems.map((item) =>
            item.id === id ? { ...item, isActive: !item.isActive } : item
          )
        }));
      },

      // Selectors
      getCategoriesWithItems: () => {
        const { categories, menuItems } = get();
        return categories.map((category) => ({
          ...category,
          items: menuItems.filter((item) => item.categoryId === category.id)
        }));
      },

      getActiveMenuItems: () => {
        return get().menuItems.filter((item) => item.isActive);
      },

      getMenuItemsByCategory: (categoryId) => {
        return get().menuItems.filter((item) => item.categoryId === categoryId);
      },
    }),
    {
      name: 'menu-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        categories: state.categories,
        menuItems: state.menuItems,
      }),
    }
  )
);
