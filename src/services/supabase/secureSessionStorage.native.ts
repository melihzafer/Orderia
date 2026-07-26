import * as SecureStore from 'expo-secure-store';
import { SupabaseSessionStorage } from './secureSessionStorage';

const manifestPrefix = 'orderia-secure-v1:';
const chunkSize = 1_800;
const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

interface ChunkManifest {
  readonly version: 1;
  readonly generation: string;
  readonly count: number;
}

export const secureSessionStorage: SupabaseSessionStorage = {
  async getItem(key) {
    const stored = await SecureStore.getItemAsync(key, secureStoreOptions);
    if (stored === null || !stored.startsWith(manifestPrefix)) return stored;

    const manifest = parseManifest(stored);
    if (!manifest) {
      await SecureStore.deleteItemAsync(key, secureStoreOptions);
      return null;
    }

    const chunks = await Promise.all(
      Array.from({ length: manifest.count }, (_, index) =>
        SecureStore.getItemAsync(chunkKey(key, manifest.generation, index), secureStoreOptions),
      ),
    );
    if (chunks.some((chunk) => chunk === null)) {
      await removeGeneration(key, manifest);
      await SecureStore.deleteItemAsync(key, secureStoreOptions);
      return null;
    }
    return chunks.join('');
  },

  async setItem(key, value) {
    const oldManifest = parseManifest(await SecureStore.getItemAsync(key, secureStoreOptions));
    const generation = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const chunks = value.match(new RegExp(`.{1,${chunkSize}}`, 'gs')) ?? [''];
    await Promise.all(
      chunks.map((chunk, index) =>
        SecureStore.setItemAsync(chunkKey(key, generation, index), chunk, secureStoreOptions),
      ),
    );
    const manifest: ChunkManifest = {
      version: 1,
      generation,
      count: chunks.length,
    };
    await SecureStore.setItemAsync(
      key,
      `${manifestPrefix}${JSON.stringify(manifest)}`,
      secureStoreOptions,
    );
    if (oldManifest) await removeGeneration(key, oldManifest);
  },

  async removeItem(key) {
    const manifest = parseManifest(await SecureStore.getItemAsync(key, secureStoreOptions));
    await SecureStore.deleteItemAsync(key, secureStoreOptions);
    if (manifest) await removeGeneration(key, manifest);
  },
};

function parseManifest(value: string | null): ChunkManifest | null {
  if (!value?.startsWith(manifestPrefix)) return null;
  try {
    const parsed = JSON.parse(value.slice(manifestPrefix.length)) as Partial<ChunkManifest>;
    if (
      parsed.version !== 1 ||
      typeof parsed.generation !== 'string' ||
      !/^[a-z0-9-]+$/.test(parsed.generation) ||
      !Number.isSafeInteger(parsed.count) ||
      (parsed.count ?? 0) < 1 ||
      (parsed.count ?? 0) > 64
    ) {
      return null;
    }
    return parsed as ChunkManifest;
  } catch {
    return null;
  }
}

async function removeGeneration(key: string, manifest: ChunkManifest): Promise<void> {
  await Promise.all(
    Array.from({ length: manifest.count }, (_, index) =>
      SecureStore.deleteItemAsync(chunkKey(key, manifest.generation, index), secureStoreOptions),
    ),
  );
}

function chunkKey(key: string, generation: string, index: number): string {
  return `${key}__${generation}__${index}`;
}
