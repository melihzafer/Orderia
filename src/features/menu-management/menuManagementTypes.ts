import {
  BranchId,
  CurrencyCode,
  MenuCategoryId,
  MenuItemId,
  ModifierGroupId,
  ModifierOptionId,
  OrganizationId,
  FulfillmentGroup,
} from '../../domain';

export type MenuLocale = 'tr' | 'bg' | 'en';
export type AllergenPresence = 'contains' | 'may_contain' | 'free_from';

export interface MenuTranslationDraft {
  readonly locale: MenuLocale;
  readonly name: string;
  readonly description: string | null;
}

export interface MenuModifierOptionDraft {
  readonly name: string;
  readonly priceDeltaMinor: number;
  readonly isDefault: boolean;
  readonly sortOrder: number;
}

export interface MenuModifierGroupDraft {
  readonly name: string;
  readonly selectionType: 'single' | 'multiple';
  readonly minimumChoices: number;
  readonly maximumChoices: number | null;
  readonly isRequired: boolean;
  readonly sortOrder: number;
  readonly options: readonly MenuModifierOptionDraft[];
}

export interface MenuAllergenSuggestion {
  readonly code: string;
  readonly status: 'unknown';
  readonly reason: string;
}

export interface ConfirmedMenuAllergen {
  readonly code: string;
  readonly presence: AllergenPresence;
}

export interface MenuAiSuggestion {
  readonly schemaVersion: 1;
  readonly item: {
    readonly name: string;
    readonly description: string | null;
    readonly priceMinor: number;
    readonly currencyCode: CurrencyCode;
    readonly categoryName: string;
    readonly prepTimeMinutes: number | null;
    readonly fulfillmentGroup?: FulfillmentGroup;
  };
  readonly translations: readonly MenuTranslationDraft[];
  readonly modifierGroups: readonly MenuModifierGroupDraft[];
  readonly allergenSuggestions: readonly MenuAllergenSuggestion[];
  readonly warnings: readonly string[];
}

export interface EditableCatalogItem {
  readonly categoryId?: MenuCategoryId;
  readonly categoryName?: string;
  readonly name: string;
  readonly description: string | null;
  readonly priceMinor: number;
  readonly currencyCode: CurrencyCode;
  readonly taxRateBasisPoints: number;
  readonly isActive: boolean;
  readonly isAvailable: boolean;
  readonly prepTimeMinutes: number | null;
  readonly fulfillmentGroup: FulfillmentGroup;
  readonly translations: readonly MenuTranslationDraft[];
  readonly modifierGroups: readonly MenuModifierGroupDraft[];
  readonly confirmedAllergens: readonly ConfirmedMenuAllergen[];
}

export interface CatalogCategory {
  readonly id: MenuCategoryId;
  readonly name: string;
  readonly sortOrder: number;
  readonly isActive: boolean;
}

export interface CatalogModifierOption extends MenuModifierOptionDraft {
  readonly id: ModifierOptionId;
  readonly isActive: boolean;
}

export interface CatalogModifierGroup extends Omit<MenuModifierGroupDraft, 'options'> {
  readonly id: ModifierGroupId;
  readonly options: readonly CatalogModifierOption[];
}

export interface CatalogItem {
  readonly id: MenuItemId;
  readonly categoryId: MenuCategoryId;
  readonly name: string;
  readonly description?: string;
  readonly priceMinor: number;
  readonly currencyCode: CurrencyCode;
  readonly taxRateBasisPoints: number;
  readonly isActive: boolean;
  readonly isAvailable: boolean;
  readonly prepTimeMinutes?: number;
  readonly fulfillmentGroup: FulfillmentGroup;
  readonly isOrganizationWide: boolean;
  readonly version: number;
  readonly translations: readonly MenuTranslationDraft[];
  readonly modifierGroups: readonly CatalogModifierGroup[];
}

export interface CatalogSnapshot {
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly categories: readonly CatalogCategory[];
  readonly items: readonly CatalogItem[];
}

export interface MenuAiDraft {
  readonly id: string;
  readonly status: 'ready';
  readonly version: number;
  readonly suggestion: MenuAiSuggestion;
  readonly replayed: boolean;
}

export function editableItemFromSuggestion(suggestion: MenuAiSuggestion): EditableCatalogItem {
  return {
    categoryName: suggestion.item.categoryName,
    name: suggestion.item.name,
    description: suggestion.item.description,
    priceMinor: suggestion.item.priceMinor,
    currencyCode: suggestion.item.currencyCode,
    taxRateBasisPoints: 0,
    isActive: true,
    isAvailable: true,
    prepTimeMinutes: suggestion.item.prepTimeMinutes,
    fulfillmentGroup: suggestion.item.fulfillmentGroup ?? 'kitchen',
    translations: suggestion.translations,
    modifierGroups: suggestion.modifierGroups,
    confirmedAllergens: [],
  };
}
