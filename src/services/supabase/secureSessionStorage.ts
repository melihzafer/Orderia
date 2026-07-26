export interface SupabaseSessionStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// Metro replaces this module with the platform-specific .native/.web implementation.
export const secureSessionStorage: SupabaseSessionStorage = {
  async getItem() {
    return null;
  },
  async setItem() {
    throw new Error('A platform session storage adapter was not selected');
  },
  async removeItem() {
    throw new Error('A platform session storage adapter was not selected');
  },
};
