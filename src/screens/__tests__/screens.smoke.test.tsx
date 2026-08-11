/* eslint-disable @typescript-eslint/no-require-imports -- Jest native component factories are hoisted. */
/* eslint-disable import/first -- Ekran importları jest.mock çağrılarından sonra gelmeli; mock'lar hoist edilir. */
import { cleanup } from '@testing-library/react-native';
import React from 'react';
import { InMemoryLocalDatabase } from '../../data/testing/inMemoryLocalDatabase';
import { seedTableWorkspace } from '../../test-support/seedTableWorkspace';
import {
  createTestDatabase,
  mockAuth,
  mockOrderiaData,
  renderWithProviders,
} from '../../test-support/renderScreen';

/**
 * Her ekranın çökmeden render olduğunu doğrular.
 *
 * Neden bu kadar geniş ve bu kadar sığ: yaşanan çökme (`BottomSheetModal`)
 * herhangi bir iddiayı değil, render'ın kendisini düşürüyordu. Bu paket tek bir
 * şey soruyor — "ekran patlıyor mu?" — ama bunu `src/screens/index.ts`'teki
 * BÜTÜN ekranlar için soruyor. Yeni bir ekran barrel'a eklendiği anda
 * kendiliğinden kapsama giriyor; kimsenin test yazmayı hatırlaması gerekmiyor.
 *
 * Derin davranış testleri bilerek burada değil; onlar ekranın kendi test
 * dosyasına ait (bkz. `TableDetailScreen.test.tsx`).
 */

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

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  setParams: jest.fn(),
  replace: jest.fn(),
  push: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  setOptions: jest.fn(),
  canGoBack: jest.fn(() => true),
  dispatch: jest.fn(),
};
const mockContext: {
  auth: ReturnType<typeof mockAuth>;
  data: ReturnType<typeof mockOrderiaData>;
} = {
  auth: mockAuth(),
  data: mockOrderiaData(new InMemoryLocalDatabase()),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  // Ekranların istediği bütün parametreleri tek bir nesnede topluyoruz;
  // fazlası zararsız, eksiği ekranı düşürür.
  useRoute: () => ({
    params: {
      tableId: 'table-1',
      hallId: 'hall-1',
      categoryId: 'category-1',
      itemId: 'product-1',
    },
  }),
  useIsFocused: () => true,
  useFocusEffect: () => undefined,
}));
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockContext.auth,
}));
jest.mock('../../data/runtime', () => ({
  useOrderiaData: () => mockContext.data,
}));

import * as screens from '../index';

let database: InMemoryLocalDatabase;

/**
 * Bazı ekranlar zorunlu prop alıyor (örn. `WelcomeScreen`'in `onSignIn`'i).
 * Duman testi davranışı değil yalnızca "render oluyor mu"yu sorduğu için
 * hepsine boş prop veriyoruz; tipi burada tek noktada gevşetiyoruz.
 */
const screenEntries: readonly [string, React.ComponentType<Record<string, never>>][] =
  Object.entries(screens)
    .filter(([, value]) => typeof value === 'function')
    .map(([name, value]) => [name, value as React.ComponentType<Record<string, never>>]);

beforeEach(async () => {
  database = createTestDatabase();
  await seedTableWorkspace(database);
  mockContext.auth = mockAuth();
  mockContext.data = mockOrderiaData(database);
});

afterEach(() => {
  cleanup();
});

describe('every exported screen renders without crashing', () => {
  it('exports the screens it is meant to cover', () => {
    // Barrel boşalır veya yeniden adlandırılırsa bu paket sessizce sıfır ekran
    // sınamaya başlardı; sayıyı bir alt sınırla bağlıyoruz.
    expect(screenEntries.length).toBeGreaterThanOrEqual(20);
  });

  it.each(screenEntries)('%s', async (_name, Screen) => {
    const screen = await renderWithProviders(<Screen {...({} as Record<string, never>)} />);
    expect(screen.toJSON()).toBeTruthy();
  });
});
