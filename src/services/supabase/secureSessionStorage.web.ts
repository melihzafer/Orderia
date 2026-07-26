import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupabaseSessionStorage } from './secureSessionStorage';

export const secureSessionStorage: SupabaseSessionStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};
