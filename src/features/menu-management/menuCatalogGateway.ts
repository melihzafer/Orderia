import { SupabaseClient } from '@supabase/supabase-js';
import uuid from 'react-native-uuid';
import {
  BranchId,
  CurrencyCode,
  MenuCategoryId,
  MenuItemId,
  ModifierGroupId,
  ModifierOptionId,
  OrganizationId,
  toDomainId,
} from '../../domain';
import { Database, Json } from '../../services/supabase';
import {
  CatalogItem,
  CatalogModifierGroup,
  CatalogSnapshot,
  EditableCatalogItem,
  MenuAiDraft,
  MenuAiSuggestion,
  MenuLocale,
} from './menuManagementTypes';

interface MenuScope {
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
}

export class MenuCatalogGateway {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async load(scope: MenuScope): Promise<CatalogSnapshot> {
    const branchFilter = `branch_id.is.null,branch_id.eq.${scope.branchId}`;
    const [categoriesResult, itemsResult, groupsResult, optionsResult, translationsResult] =
      await Promise.all([
        this.client
          .from('menu_categories')
          .select('*')
          .eq('organization_id', scope.organizationId)
          .or(branchFilter)
          .is('deleted_at', null)
          .order('sort_order'),
        this.client
          .from('menu_items')
          .select('*')
          .eq('organization_id', scope.organizationId)
          .or(branchFilter)
          .is('deleted_at', null)
          .order('name'),
        this.client
          .from('modifier_groups')
          .select('*')
          .eq('organization_id', scope.organizationId)
          .or(branchFilter)
          .is('deleted_at', null)
          .order('sort_order'),
        this.client
          .from('modifier_options')
          .select('*')
          .eq('organization_id', scope.organizationId)
          .or(branchFilter)
          .is('deleted_at', null)
          .order('sort_order'),
        this.client
          .from('menu_item_translations')
          .select('*')
          .eq('organization_id', scope.organizationId)
          .or(branchFilter),
      ]);
    const error =
      categoriesResult.error ??
      itemsResult.error ??
      groupsResult.error ??
      optionsResult.error ??
      translationsResult.error;
    if (error) throw error;

    const optionsByGroup = new Map<string, CatalogModifierGroup['options']>();
    for (const option of optionsResult.data ?? []) {
      const mapped = {
        id: toDomainId<ModifierOptionId>(option.id),
        name: option.name,
        priceDeltaMinor: option.price_delta_minor,
        isDefault: option.is_default,
        isActive: option.is_active,
        sortOrder: option.sort_order,
      };
      optionsByGroup.set(option.modifier_group_id, [
        ...(optionsByGroup.get(option.modifier_group_id) ?? []),
        mapped,
      ]);
    }
    const groupsByItem = new Map<string, CatalogModifierGroup[]>();
    for (const group of groupsResult.data ?? []) {
      const mapped: CatalogModifierGroup = {
        id: toDomainId<ModifierGroupId>(group.id),
        name: group.name,
        selectionType: group.selection_type,
        minimumChoices: group.minimum_choices,
        maximumChoices: group.maximum_choices,
        isRequired: group.is_required,
        sortOrder: group.sort_order,
        options: optionsByGroup.get(group.id) ?? [],
      };
      groupsByItem.set(group.menu_item_id, [
        ...(groupsByItem.get(group.menu_item_id) ?? []),
        mapped,
      ]);
    }

    const items: CatalogItem[] = (itemsResult.data ?? []).map((item) => ({
      id: toDomainId<MenuItemId>(item.id),
      categoryId: toDomainId<MenuCategoryId>(item.category_id),
      name: item.name,
      ...(item.description ? { description: item.description } : {}),
      priceMinor: item.price_minor,
      currencyCode: item.currency_code as CurrencyCode,
      taxRateBasisPoints: item.tax_rate_basis_points,
      isActive: item.is_active,
      isAvailable: item.is_available,
      ...(item.prep_time_minutes !== null ? { prepTimeMinutes: item.prep_time_minutes } : {}),
      fulfillmentGroup: item.fulfillment_group ?? 'kitchen',
      isOrganizationWide: item.branch_id === null,
      version: item.version,
      translations: (translationsResult.data ?? [])
        .filter((translation) => translation.menu_item_id === item.id)
        .map((translation) => ({
          locale: translation.locale,
          name: translation.name,
          description: translation.description,
        })),
      modifierGroups: groupsByItem.get(item.id) ?? [],
    }));

    return {
      ...scope,
      categories: (categoriesResult.data ?? []).map((category) => ({
        id: toDomainId<MenuCategoryId>(category.id),
        name: category.name,
        sortOrder: category.sort_order,
        isActive: category.is_active,
      })),
      items,
    };
  }

  async generateDraft(
    input: MenuScope & {
      readonly text: string;
      readonly currencyCode: CurrencyCode;
      readonly locale: MenuLocale;
      readonly clientRequestId?: string;
    },
  ): Promise<MenuAiDraft> {
    const clientRequestId = input.clientRequestId ?? String(uuid.v4());
    const { data, error } = await this.client.functions.invoke('menu-ai-draft', {
      body: {
        organizationId: input.organizationId,
        branchId: input.branchId,
        clientRequestId,
        input: input.text,
        currencyCode: input.currencyCode,
        locale: input.locale,
      },
    });
    if (error) throw new Error(error.message || 'Menu assistant is unavailable');
    if (!isMenuAiDraft(data)) throw new Error('Menu assistant returned an invalid draft');
    return data;
  }

  async publishDraft(
    scope: MenuScope,
    draftId: string,
    expectedVersion: number,
    item: EditableCatalogItem,
  ): Promise<{ readonly itemId: MenuItemId; readonly status: 'published' }> {
    const { data, error } = await this.client.rpc('publish_menu_ai_draft_with_fulfillment', {
      requested_organization_id: scope.organizationId,
      requested_branch_id: scope.branchId,
      requested_request_id: draftId,
      requested_expected_version: expectedVersion,
      requested_reviewed_payload: item as unknown as Json,
    });
    if (error) throw error;
    if (!isRecord(data) || data.status !== 'published' || !isRecord(data.item)) {
      throw new Error('Published catalog item response is invalid');
    }
    return {
      itemId: toDomainId<MenuItemId>(requiredString(data.item.id)),
      status: 'published',
    };
  }

  async saveItem(
    scope: MenuScope,
    item: EditableCatalogItem,
    existing?: { readonly id: MenuItemId; readonly version: number },
  ): Promise<MenuItemId> {
    const { data, error } = await this.client.rpc('save_catalog_item_with_fulfillment', {
      requested_organization_id: scope.organizationId,
      requested_branch_id: scope.branchId,
      requested_item_id: existing?.id ?? null,
      requested_expected_version: existing?.version ?? null,
      requested_payload: item as unknown as Json,
    });
    if (error) throw error;
    if (!isRecord(data)) throw new Error('Saved catalog item response is invalid');
    return toDomainId<MenuItemId>(requiredString(data.id));
  }

  async setAvailability(
    scope: MenuScope,
    itemIds: readonly MenuItemId[],
    isAvailable: boolean,
  ): Promise<number> {
    const { data, error } = await this.client.rpc('bulk_set_menu_item_availability', {
      requested_organization_id: scope.organizationId,
      requested_branch_id: scope.branchId,
      requested_item_ids: [...itemIds],
      requested_is_available: isAvailable,
    });
    if (error) throw error;
    return data;
  }
}

function isMenuAiDraft(value: unknown): value is MenuAiDraft {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.status === 'ready' &&
    typeof value.version === 'number' &&
    typeof value.replayed === 'boolean' &&
    isMenuAiSuggestion(value.suggestion)
  );
}

function isMenuAiSuggestion(value: unknown): value is MenuAiSuggestion {
  return (
    isRecord(value) &&
    value.schemaVersion === 1 &&
    isRecord(value.item) &&
    typeof value.item.name === 'string' &&
    typeof value.item.categoryName === 'string' &&
    typeof value.item.priceMinor === 'number' &&
    typeof value.item.currencyCode === 'string' &&
    Array.isArray(value.translations) &&
    Array.isArray(value.modifierGroups) &&
    Array.isArray(value.allergenSuggestions) &&
    value.allergenSuggestions.every(
      (allergen) => isRecord(allergen) && allergen.status === 'unknown',
    ) &&
    Array.isArray(value.warnings)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('Required catalog response field is missing');
  }
  return value;
}
