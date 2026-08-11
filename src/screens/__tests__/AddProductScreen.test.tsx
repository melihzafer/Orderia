/* eslint-disable @typescript-eslint/no-require-imports -- Jest native component factories are hoisted. */
/* eslint-disable import/first -- Ekran importları jest.mock çağrılarından sonra gelmeli; mock'lar hoist edilir. */
import { cleanup, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { InMemoryLocalDatabase } from '../../data/testing/inMemoryLocalDatabase';
import { useWorkspaceDraftStore } from '../../features/table-workspace/draftStore';
import { loadTableWorkspace } from '../../features/table-workspace/workspaceModel';
import { seedIds, seedScope, seedTableWorkspace } from '../../test-support/seedTableWorkspace';
import {
  createTestDatabase,
  mockAuth,
  mockOrderiaData,
  renderWithProviders,
} from '../../test-support/renderScreen';

/**
 * Ürün ekleme ekranının render testleri.
 *
 * Buradaki asıl regresyon "eklenen ürünler görünüyor mu": sepet şeridi
 * eskiden yalnızca bir sayaç gösteriyordu, eklenen satırları görmek için ayrı
 * bir modal açmak gerekiyordu ve kullanıcı bunu eksik olarak bildirdi.
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
  useRoute: () => ({ params: { tableId: 'table-1' } }),
}));
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockContext.auth,
}));
jest.mock('../../data/runtime', () => ({
  useOrderiaData: () => mockContext.data,
}));

import AddProductScreen from '../AddProductScreen';

let database: InMemoryLocalDatabase;

beforeEach(async () => {
  useWorkspaceDraftStore.setState({ draftsByTable: {}, undoByTable: {} });
  database = createTestDatabase();
  await seedTableWorkspace(database);
  mockContext.auth = mockAuth();
  mockContext.data = mockOrderiaData(database);
});

afterEach(() => {
  cleanup();
});

describe('AddProductScreen', () => {
  it('renders the product palette for the table', async () => {
    const screen = await renderWithProviders(<AddProductScreen />);

    expect(await screen.findByText('Ürün ekle: Masa 4')).toBeTruthy();
    expect(await screen.findByText('Çay')).toBeTruthy();
  });

  /** Kullanıcının bildirdiği eksiğin regresyon testi. */
  it('lists the added products in the cart strip instead of only counting them', async () => {
    const screen = await renderWithProviders(<AddProductScreen />);
    await screen.findByText('Ürün ekle: Masa 4');

    fireEvent.press(screen.getByText('Çay'));

    // Sepet sayacı artıyor…
    expect(await screen.findByText('1 Ürün')).toBeTruthy();
    // …ve satırın kendisi ayrı bir modal açmadan görünür oluyor.
    await waitFor(() => expect(screen.getAllByText('Çay').length).toBeGreaterThan(1));
  });

  it('writes the draft to the shared store rather than local screen state', async () => {
    const screen = await renderWithProviders(<AddProductScreen />);
    await screen.findByText('Ürün ekle: Masa 4');

    fireEvent.press(screen.getByText('Çay'));
    await screen.findByText('1 Ürün');

    // Taslak ekran state'inde değil, masaya göre paylaşılan depoda.
    expect(useWorkspaceDraftStore.getState().draftsByTable[seedIds.tableId]).toHaveLength(1);
  });

  /**
   * Yukarıdakinin diğer yarısı: depoda taslak varken ekran onunla açılıyor.
   * İkisi birlikte "geri dönünce sepet duruyor" davranışını kanıtlar; aynı
   * testte söküp yeniden kurmak `cleanup()`'ın bekleyen sorguları iptal
   * etmesi yüzünden kırılgan oluyor.
   */
  it('restores an existing draft when the screen opens', async () => {
    const workspace = await loadTableWorkspace(database, seedScope, seedIds.tableId);
    const product = workspace!.products.find((item) => item.id === seedIds.plainProductId)!;
    useWorkspaceDraftStore.setState({
      draftsByTable: {
        [seedIds.tableId]: [{ id: 'draft-1', product, quantity: 3, selectedOptionIds: [] }],
      },
    });

    const screen = await renderWithProviders(<AddProductScreen />);

    expect(await screen.findByText('3 Ürün')).toBeTruthy();
  });
});
