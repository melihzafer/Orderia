import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Servis modu, uygulamanın kime hizmet ettiğini değil, hangi ritimde çalıştığını anlatır.
 *
 * - `restaurant`: masa merkezli, oturmuş servis. Uygulamanın ana hedefi budur.
 * - `festival`: masa düzeninin gevşek, hızın belirleyici olduğu açık hava servisi.
 *
 * Mod yalnızca bir *ön ayar*dır: her yetenek tek tek açılıp kapanabildiği için
 * festival için yazılan özellikler restoran modunda da kullanılabilir. Böylece
 * festival sonrası ayrı bir "restorana uyarlama" işi çıkmaz.
 */
export type ServiceMode = 'restaurant' | 'festival';

/** Ana ekranda gösterilebilecek hızlı işlem kimlikleri. */
export type QuickActionId =
  'new_order' | 'last_order' | 'find_by_name' | 'open_checks' | 'take_payment' | 'day_summary';

export const quickActionIds: readonly QuickActionId[] = [
  'new_order',
  'last_order',
  'find_by_name',
  'open_checks',
  'take_payment',
  'day_summary',
];

export interface OperationsPreferences {
  /** Adisyona serbest bir görünen ad verilebilir ("Mehmet Ağa", "Çardak Altı"). */
  readonly namedOrders: boolean;
  /** Alan/masa dışında serbest konum notu tutulur. */
  readonly locationNotes: boolean;
  /** Aynı adisyon içinde kişi ve ortak hesaplar ayrılabilir. */
  readonly personAccounts: boolean;
  /** Sonradan eklenen ürünler ayrı "ek sipariş" partisi olarak işaretlenir. */
  readonly orderBatches: boolean;
  /** Sipariş özeti mutfak / içecek / doğrudan olarak gruplanır. */
  readonly fulfillmentSplit: boolean;
  /** İçecekler götürüldü hatırlatıcısı gösterilir. */
  readonly drinksReminder: boolean;
  /** Ürün iptalinde sebep zorunlu tutulur. */
  readonly requireVoidReason: boolean;
  /** Nakit ödemede hızlı tutar butonları ve para üstü hesabı gösterilir. */
  readonly quickCash: boolean;
  /** Adisyon kapatılmadan önce özet onayı istenir. */
  readonly confirmBeforeClose: boolean;
}

export interface AppearancePreferences {
  /** Ürün ve menü listelerinde fotoğraflar gösterilir. */
  readonly showItemPhotos: boolean;
  /** Personel menü ürününe fotoğraf ekleyebilir. */
  readonly allowPhotoUpload: boolean;
  /** Listeler sıkışık aralıklarla çizilir; küçük ekranda daha çok satır sığar. */
  readonly compactDensity: boolean;
}

export interface SettingsState extends OperationsPreferences, AppearancePreferences {
  readonly serviceMode: ServiceMode;
  readonly quickActions: readonly QuickActionId[];
  /** Ayarlar gibi ekranlarda satır açıklamalarının açık bırakıldığı bölüm anahtarları. */
  readonly revealedSectionDescriptions: readonly string[];

  setServiceMode: (mode: ServiceMode) => void;
  setOperationsFlag: (flag: keyof OperationsPreferences, value: boolean) => void;
  setAppearanceFlag: (flag: keyof AppearancePreferences, value: boolean) => void;
  toggleQuickAction: (id: QuickActionId) => void;
  setQuickActions: (ids: readonly QuickActionId[]) => void;
  toggleSectionDescriptions: (sectionKey: string) => void;
  resetToModeDefaults: () => void;
}

/**
 * Restoran ön ayarı: oturmuş servis. Kişi hesabı ve ek sipariş partisi burada da
 * değerlidir (hesap bölme, sonradan gelen tatlı) ama serbest adisyon adı ve
 * içecek hatırlatıcısı masa düzeni varken gürültü yaratır, kapalı gelir.
 */
const restaurantDefaults: OperationsPreferences = {
  namedOrders: false,
  locationNotes: false,
  personAccounts: true,
  orderBatches: true,
  fulfillmentSplit: false,
  drinksReminder: false,
  requireVoidReason: true,
  quickCash: true,
  confirmBeforeClose: true,
};

/** Festival ön ayarı: masa yok sayılabilir, isim ve hız her şeydir. */
const festivalDefaults: OperationsPreferences = {
  namedOrders: true,
  locationNotes: true,
  personAccounts: true,
  orderBatches: true,
  fulfillmentSplit: true,
  drinksReminder: true,
  requireVoidReason: true,
  quickCash: true,
  confirmBeforeClose: true,
};

const appearanceDefaults: AppearancePreferences = {
  showItemPhotos: false,
  allowPhotoUpload: false,
  compactDensity: true,
};

const defaultQuickActions: readonly QuickActionId[] = [
  'new_order',
  'last_order',
  'find_by_name',
  'open_checks',
  'take_payment',
  'day_summary',
];

export function operationsDefaultsFor(mode: ServiceMode): OperationsPreferences {
  return mode === 'festival' ? festivalDefaults : restaurantDefaults;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      serviceMode: 'restaurant',
      ...restaurantDefaults,
      ...appearanceDefaults,
      quickActions: defaultQuickActions,
      revealedSectionDescriptions: [],

      setServiceMode: (mode) => {
        set({ serviceMode: mode, ...operationsDefaultsFor(mode) });
      },

      setOperationsFlag: (flag, value) => {
        set({ [flag]: value } as unknown as Partial<SettingsState>);
      },

      setAppearanceFlag: (flag, value) => {
        // Fotoğraf gösterimi kapalıyken yükleme izni tek başına anlamsız kalmasın:
        // yükleme açıldığında gösterim de açılır.
        if (flag === 'allowPhotoUpload' && value) {
          set({ allowPhotoUpload: true, showItemPhotos: true });
          return;
        }
        set({ [flag]: value } as unknown as Partial<SettingsState>);
      },

      toggleQuickAction: (id) => {
        const current = get().quickActions;
        set({
          quickActions: current.includes(id)
            ? current.filter((entry) => entry !== id)
            : [...current, id],
        });
      },

      setQuickActions: (ids) => {
        set({ quickActions: ids.filter((id) => quickActionIds.includes(id)) });
      },

      toggleSectionDescriptions: (sectionKey) => {
        const current = get().revealedSectionDescriptions;
        set({
          revealedSectionDescriptions: current.includes(sectionKey)
            ? current.filter((key) => key !== sectionKey)
            : [...current, sectionKey],
        });
      },

      resetToModeDefaults: () => {
        set({ ...operationsDefaultsFor(get().serviceMode) });
      },
    }),
    {
      name: 'orderia-settings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 4,
      migrate: (persistedState, version) => {
        const persisted = persistedState as Partial<SettingsState>;
        const withQuickActions =
          version < 2 ? { ...persisted, quickActions: defaultQuickActions } : persisted;
        const withCompactDensity =
          version < 3 ? { ...withQuickActions, compactDensity: true } : withQuickActions;
        const withRevealedSections =
          version < 4
            ? { ...withCompactDensity, revealedSectionDescriptions: [] }
            : withCompactDensity;
        return withRevealedSections as SettingsState;
      },
      partialize: (state) => ({
        serviceMode: state.serviceMode,
        namedOrders: state.namedOrders,
        locationNotes: state.locationNotes,
        personAccounts: state.personAccounts,
        orderBatches: state.orderBatches,
        fulfillmentSplit: state.fulfillmentSplit,
        drinksReminder: state.drinksReminder,
        requireVoidReason: state.requireVoidReason,
        quickCash: state.quickCash,
        confirmBeforeClose: state.confirmBeforeClose,
        showItemPhotos: state.showItemPhotos,
        allowPhotoUpload: state.allowPhotoUpload,
        compactDensity: state.compactDensity,
        quickActions: state.quickActions,
        revealedSectionDescriptions: state.revealedSectionDescriptions,
      }),
    },
  ),
);
