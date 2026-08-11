/* eslint-disable @typescript-eslint/no-require-imports -- Jest native component factories are hoisted. */
import { render } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../contexts/ThemeContext';
import { QRMenuProvider } from '../contexts/QRMenuContext';
import { SnackbarProvider } from '../design-system';
import { LocalizationProvider } from '../i18n';
import type { AuthContextValue } from '../contexts/authTypes';
import type { OrderiaDataContextValue } from '../data/runtime';
import { InMemoryLocalDatabase } from '../data/testing/inMemoryLocalDatabase';
import { seedIds, seedScope } from './seedTableWorkspace';

/**
 * Ekran testleri için ortak kabuk.
 *
 * Neden var: `src/screens/` altındaki 28 ekranın hiçbirinin testi yoktu ve
 * Playwright paketi Supabase'i bilerek kapattığı için bulut yolu (`mode:
 * 'cloud'`) hiçbir otomasyonda bir kez bile render edilmiyordu. "..." menüsünün
 * bozuk hâlde üretime çıkabilmesinin sebebi tam olarak buydu. Buradaki
 * yardımcılar o boşluğu kapatır: gerçek bir `InMemoryLocalDatabase` üstünde
 * bulut modunu taklit ederler, böylece ekran testte de üretimdeki kod yolunu
 * çalıştırır.
 */

/**
 * Testte anlamsız olan yerel bileşenleri sadeleştirir.
 *
 * `PaymentSheet.test.tsx` ve `TableOperationSheet.test.tsx` bu blokları
 * kendi içlerinde birebir tekrar ediyordu; üçüncü bir kopya çıkarmak yerine
 * tek yere alındı. `applyNativeComponentMocks()` çağıran dosyanın en üstünde,
 * `import` satırlarından sonra çağrılır.
 */
export function applyNativeComponentMocks(): void {
  jest.mock('react-native/Libraries/Components/ActivityIndicator/ActivityIndicator', () => ({
    __esModule: true,
    default: 'ActivityIndicator',
  }));
  jest.mock('react-native/Libraries/Modal/Modal', () => {
    const ReactModule = require('react') as typeof React;
    function MockModal({
      children,
      visible,
    }: {
      readonly children: React.ReactNode;
      readonly visible: boolean;
    }) {
      return visible ? ReactModule.createElement('Modal', null, children) : null;
    }
    return { __esModule: true, default: MockModal };
  });
}

/** Sabit, testler arası paylaşılmayan bir bellek içi veritabanı. */
export function createTestDatabase(): InMemoryLocalDatabase {
  return new InMemoryLocalDatabase();
}

/**
 * `useOrderiaData` için bulut modunda bir bağlam değeri.
 *
 * Yalnızca ekranların gerçekten çağırdığı alanlar davranışlı; kalanlar test
 * sırasında çağrılırsa sessizce çözülen jest.fn()'ler. Bir ekran beklenmedik
 * bir alanı çağırırsa test bunu `undefined is not a function` ile bildirir —
 * bu istenen davranış: sessizce yanlış çalışmasındansa görünür şekilde düşsün.
 */
export function mockOrderiaData(
  database: InMemoryLocalDatabase,
  overrides: Partial<OrderiaDataContextValue> = {},
): OrderiaDataContextValue {
  return {
    database,
    mode: 'cloud',
    readiness: 'ready',
    scope: seedScope,
    revision: 1,
    sync: {
      online: true,
      pendingCount: 0,
      conflictCount: 0,
      syncing: false,
      hasError: false,
      state: 'synced',
    },
    refresh: jest.fn().mockResolvedValue(undefined),
    resolveProfileNames: jest.fn().mockResolvedValue({}),
    resolveActiveParticipants: jest.fn().mockResolvedValue([]),
    confirmCheckPayments: jest.fn(),
    transferOrMergeTableSession: jest.fn(),
    reopenTableSession: jest.fn(),
    setManagerActionPin: jest.fn(),
    prepareReceiptPdf: jest.fn(),
    searchReceiptArchive: jest.fn().mockResolvedValue({ items: [], nextCursor: undefined }),
    loadReceiptTimeline: jest.fn().mockResolvedValue([]),
    loadManagerReport: jest.fn(),
    loadCatalog: jest.fn().mockResolvedValue({ categories: [], items: [] }),
    generateMenuAiDraft: jest.fn(),
    publishMenuAiDraft: jest.fn(),
    saveCatalogItem: jest.fn(),
    setCatalogAvailability: jest.fn().mockResolvedValue(0),
    inspectLegacyMigration: jest.fn(),
    applyLegacyMigration: jest.fn(),
    ...overrides,
  } as OrderiaDataContextValue;
}

/** `useAuth` için giriş yapmış, şubesi seçili bir kullanıcı. */
export function mockAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    status: 'ready',
    cloudEnabled: true,
    session: { user: { id: seedIds.userId } },
    workspace: null,
    activeBranch: { id: seedIds.branchId, organization_id: seedIds.organizationId },
    activeOrganization: null,
    activeMembership: { role: 'waiter' },
    onboardingRole: null,
    currentDeviceId: seedIds.deviceId,
    devices: [],
    pendingApprovals: [],
    signIn: jest.fn(),
    signUp: jest.fn(),
    selectOnboardingRole: jest.fn(),
    resetOnboardingRole: jest.fn(),
    joinRestaurant: jest.fn(),
    createRestaurant: jest.fn(),
    finishOnboarding: jest.fn(),
    signOut: jest.fn(),
    refreshApprovals: jest.fn(),
    approveSignup: jest.fn(),
    rejectSignup: jest.fn(),
    retry: jest.fn(),
    switchBranch: jest.fn(),
    refreshDevices: jest.fn(),
    revokeDevice: jest.fn(),
    ...overrides,
  } as unknown as AuthContextValue;
}

/**
 * Tema ve yerelleştirme sağlayıcılarıyla render eder.
 *
 * `await` şart: bu kurulumda `render` beklenebilir bir değer döndürüyor ve
 * beklenmezse `screen.getByText is not a function` ile düşüyor. Mevcut
 * `PaymentSheet.test.tsx` de aynı sebeple `await render(...)` yazıyor.
 */
export async function renderWithProviders(ui: React.ReactElement) {
  // Sağlayıcı sırası `App.tsx` ile aynı; farklı bir sıra, testte üretimde
  // olmayan bir ağaç kurar ve yanlış güven verir. `initialMetrics` şart:
  // gerçek cihaz ölçümü olmadan `SafeAreaProvider` çocuklarını hiç çizmiyor.
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <LocalizationProvider>
        <ThemeProvider>
          <SnackbarProvider>
            <QRMenuProvider>{ui}</QRMenuProvider>
          </SnackbarProvider>
        </ThemeProvider>
      </LocalizationProvider>
    </SafeAreaProvider>,
  );
}
