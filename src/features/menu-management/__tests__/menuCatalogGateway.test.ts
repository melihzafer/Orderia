import { EditableCatalogItem, MenuAiDraft } from '../menuManagementTypes';
import { MenuCatalogGateway } from '../menuCatalogGateway';

describe('MenuCatalogGateway', () => {
  it('generates a schema-validated draft through the protected Edge Function', async () => {
    const invoke = jest.fn().mockResolvedValue({ data: draft, error: null });
    const gateway = new MenuCatalogGateway({ functions: { invoke } } as never);

    await expect(
      gateway.generateDraft({
        organizationId: 'organization-1' as never,
        branchId: 'branch-1' as never,
        text: 'Patates kızartması - 4 euro',
        currencyCode: 'EUR' as never,
        locale: 'tr',
        clientRequestId: 'request-1',
      }),
    ).resolves.toEqual(draft);
    expect(invoke).toHaveBeenCalledWith('menu-ai-draft', {
      body: {
        organizationId: 'organization-1',
        branchId: 'branch-1',
        clientRequestId: 'request-1',
        input: 'Patates kızartması - 4 euro',
        currencyCode: 'EUR',
        locale: 'tr',
      },
    });
  });

  it('rejects a draft that presents an AI allergen suggestion as verified', async () => {
    const invoke = jest.fn().mockResolvedValue({
      data: {
        ...draft,
        suggestion: {
          ...draft.suggestion,
          allergenSuggestions: [{ code: 'MILK', status: 'contains', reason: 'AI guess' }],
        },
      },
      error: null,
    });
    const gateway = new MenuCatalogGateway({ functions: { invoke } } as never);

    await expect(
      gateway.generateDraft({
        organizationId: 'organization-1' as never,
        branchId: 'branch-1' as never,
        text: 'Cheese fries',
        currencyCode: 'EUR' as never,
        locale: 'en',
      }),
    ).rejects.toThrow('invalid draft');
  });

  it('publishes only the manager-reviewed payload and supports bulk availability', async () => {
    const rpc = jest
      .fn()
      .mockResolvedValueOnce({
        data: { status: 'published', item: { id: 'item-1' } },
        error: null,
      })
      .mockResolvedValueOnce({ data: 2, error: null });
    const gateway = new MenuCatalogGateway({ rpc } as never);

    await expect(
      gateway.publishDraft(
        {
          organizationId: 'organization-1' as never,
          branchId: 'branch-1' as never,
        },
        'draft-1',
        2,
        reviewedItem,
      ),
    ).resolves.toEqual({ itemId: 'item-1', status: 'published' });
    expect(rpc).toHaveBeenNthCalledWith(
      1,
      'publish_menu_ai_draft',
      expect.objectContaining({
        requested_request_id: 'draft-1',
        requested_expected_version: 2,
        requested_reviewed_payload: reviewedItem,
      }),
    );

    await expect(
      gateway.setAvailability(
        {
          organizationId: 'organization-1' as never,
          branchId: 'branch-1' as never,
        },
        ['item-1' as never, 'item-2' as never],
        false,
      ),
    ).resolves.toBe(2);
  });
});

const draft: MenuAiDraft = {
  id: 'draft-1',
  status: 'ready',
  version: 2,
  replayed: false,
  suggestion: {
    schemaVersion: 1,
    item: {
      name: 'Patates kızartması',
      description: 'Çıtır patates',
      priceMinor: 400,
      currencyCode: 'EUR' as never,
      categoryName: 'Atıştırmalık',
      prepTimeMinutes: 8,
    },
    translations: [
      { locale: 'tr', name: 'Patates kızartması', description: 'Çıtır patates' },
      { locale: 'bg', name: 'Пържени картофи', description: null },
      { locale: 'en', name: 'French fries', description: null },
    ],
    modifierGroups: [],
    allergenSuggestions: [
      { code: 'MILK', status: 'unknown', reason: 'Verify optional cheese with supplier data.' },
    ],
    warnings: ['Verify allergens before publishing.'],
  },
};

const reviewedItem: EditableCatalogItem = {
  categoryName: 'Atıştırmalık',
  name: 'Patates kızartması',
  description: 'Çıtır patates',
  priceMinor: 400,
  currencyCode: 'EUR' as never,
  taxRateBasisPoints: 0,
  isActive: true,
  isAvailable: true,
  prepTimeMinutes: 8,
  translations: draft.suggestion.translations,
  modifierGroups: [],
  confirmedAllergens: [{ code: 'MILK', presence: 'may_contain' }],
};
