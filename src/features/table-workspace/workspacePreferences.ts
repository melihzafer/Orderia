import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WorkspacePreferences {
  readonly favoriteProductIds: readonly string[];
  readonly selectedCategoryId?: string;
}

const defaultPreferences: WorkspacePreferences = {
  favoriteProductIds: [],
};

export async function loadWorkspacePreferences(key: string): Promise<WorkspacePreferences> {
  const stored = await AsyncStorage.getItem(storageKey(key));
  if (!stored) return defaultPreferences;

  try {
    const candidate = JSON.parse(stored) as {
      readonly favoriteProductIds?: unknown;
      readonly selectedCategoryId?: unknown;
    };
    return {
      favoriteProductIds: Array.isArray(candidate.favoriteProductIds)
        ? candidate.favoriteProductIds.filter(
            (value): value is string => typeof value === 'string' && value.length > 0,
          )
        : [],
      ...(typeof candidate.selectedCategoryId === 'string'
        ? { selectedCategoryId: candidate.selectedCategoryId }
        : {}),
    };
  } catch {
    return defaultPreferences;
  }
}

export async function saveWorkspacePreferences(
  key: string,
  preferences: WorkspacePreferences,
): Promise<void> {
  await AsyncStorage.setItem(storageKey(key), JSON.stringify(preferences));
}

function storageKey(key: string): string {
  return `orderia.workspace.preferences.${key}`;
}
