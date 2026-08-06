import {
  operationsDefaultsFor,
  quickActionIds,
  useSettingsStore,
  type QuickActionId,
} from '../settingsStore';

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      serviceMode: 'restaurant',
      ...operationsDefaultsFor('restaurant'),
      showItemPhotos: false,
      allowPhotoUpload: false,
      compactDensity: false,
      quickActions: ['new_order', 'find_by_name', 'open_checks', 'take_payment'],
    });
  });

  it('keeps restaurant as the primary preset while allowing festival defaults', () => {
    expect(operationsDefaultsFor('restaurant')).toMatchObject({
      namedOrders: false,
      personAccounts: true,
      orderBatches: true,
    });

    useSettingsStore.getState().setServiceMode('festival');

    expect(useSettingsStore.getState()).toMatchObject({
      serviceMode: 'festival',
      namedOrders: true,
      fulfillmentSplit: true,
      drinksReminder: true,
    });
  });

  it('enables photo display when photo uploads are allowed', () => {
    useSettingsStore.getState().setAppearanceFlag('allowPhotoUpload', true);

    expect(useSettingsStore.getState()).toMatchObject({
      allowPhotoUpload: true,
      showItemPhotos: true,
    });
  });

  it('filters quick-action ids when restoring a saved preference', () => {
    useSettingsStore
      .getState()
      .setQuickActions(['new_order', 'not-a-real-action' as QuickActionId]);

    expect(useSettingsStore.getState().quickActions).toEqual(['new_order']);
    expect(quickActionIds).toContain('take_payment');
  });
});
