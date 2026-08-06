import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface ProductPhotoState {
  readonly photoUris: Readonly<Record<string, string>>;
  setPhotoUri: (productId: string, uri: string) => void;
  removePhotoUri: (productId: string) => void;
}

/**
 * Product photos are kept separate from the menu record. They are a
 * presentation preference for the current device, so enabling photos in
 * Settings does not change shared pricing or catalog data.
 */
export const useProductPhotoStore = create<ProductPhotoState>()(
  persist(
    (set) => ({
      photoUris: {},
      setPhotoUri: (productId, uri) =>
        set((state) => ({ photoUris: { ...state.photoUris, [productId]: uri } })),
      removePhotoUri: (productId) =>
        set((state) => {
          const { [productId]: _removed, ...remaining } = state.photoUris;
          return { photoUris: remaining };
        }),
    }),
    {
      name: 'orderia-product-photos',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ photoUris: state.photoUris }),
    },
  ),
);
