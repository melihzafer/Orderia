/* eslint-disable @typescript-eslint/no-require-imports -- Jest native component factories are hoisted. */
/* eslint-disable import/first -- Ekran importları jest.mock çağrılarından sonra gelmeli; mock'lar hoist edilir. */
import { cleanup, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { InMemoryLocalDatabase } from '../../data/testing/inMemoryLocalDatabase';
import { useWorkspaceDraftStore } from '../../features/table-workspace/draftStore';
import { sendOrderBatch } from '../../features/table-workspace/orderCommands';
import { loadTableWorkspace } from '../../features/table-workspace/workspaceModel';
import {
  seedIds,
  seedScope,
  seedTableWorkspace,
  sequentialIds,
} from '../../test-support/seedTableWorkspace';
import {
  createTestDatabase,
  mockAuth,
  mockOrderiaData,
  renderWithProviders,
} from '../../test-support/renderScreen';

/**
 * Bulut masa ekranının ilk render testleri.
 *
 * Bu dosyanın var oluş sebebi somut: "..." işlemler menüsü `BottomSheetModal`
 * ile yazılmıştı, PWA'da açılınca çöküyordu ve hiçbir test bunu görmedi —
 * çünkü hiçbir test bu ekranı render etmiyordu. Buradaki "işlemler menüsü
 * açılıyor" testi, o çökmeyi yakalayan testtir.
 *
 * Sorgularda `findBy*` kullanılır, `waitFor(() => getBy*)` değil: ekran açılışta
 * bir yükleme durumundan geçiyor ve yalnızca `findBy*` efektleri turlar arasında
 * düzgün boşaltıyor.
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

// jest.mock fabrikaları hoist edilir; dışarıdan yalnızca `mock` önekli
// değişkenlere erişebilirler.
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
jest.mock('../../features/table-workspace/checkCommands', () => {
  const actual = jest.requireActual('../../features/table-workspace/checkCommands');
  return {
    ...actual,
    renameCheck: jest.fn(actual.renameCheck),
    voidCheck: jest.fn(actual.voidCheck),
  };
});

import TableDetailScreen from '../TableDetailScreen';
import { renameCheck, voidCheck } from '../../features/table-workspace/checkCommands';

let database: InMemoryLocalDatabase;

async function seedOpenCheck(checkName = 'Sipariş 1') {
  const workspace = await loadTableWorkspace(database, seedScope, seedIds.tableId);
  return sendOrderBatch({
    database,
    scope: seedScope,
    deviceId: seedIds.deviceId,
    actorUserId: seedIds.userId,
    tableId: seedIds.tableId,
    checkName,
    lines: [
      {
        id: 'draft-1',
        product: workspace!.products.find((product) => product.id === seedIds.plainProductId)!,
        quantity: 2,
        selectedOptionIds: [],
      },
    ],
    createUuid: sequentialIds('seed'),
  });
}

/** Onaylanmış nakit ödeme ekler; silme yolunun kapanmasını sınamak için. */
async function addConfirmedPayment(checkId: string, tableSessionId: string) {
  await database.transaction(async (transaction) => {
    await transaction.repository('payments').put(seedScope, {
      id: 'payment-1',
      ...seedScope,
      tableSessionId,
      method: 'cash',
      status: 'confirmed',
      amountMinor: 300,
      currencyCode: 'EUR',
      createdBy: seedIds.userId,
      createdAt: '2026-07-26T18:10:00.000Z',
      idempotencyKey: 'payment-1',
      deviceId: seedIds.deviceId,
      syncStatus: 'synced',
    } as never);
    await transaction.repository('paymentAllocations').put(seedScope, {
      id: 'allocation-1',
      paymentId: 'payment-1',
      checkId,
      amountMinor: 300,
    } as never);
  });
}

beforeEach(async () => {
  // Taslak deposu bir modül singleton'ı: sıfırlanmazsa bir testin sepeti
  // bir sonrakine sızar.
  useWorkspaceDraftStore.setState({ draftsByTable: {}, undoByTable: {} });
  database = createTestDatabase();
  await seedTableWorkspace(database);
  mockContext.auth = mockAuth();
  mockContext.data = mockOrderiaData(database);
});

afterEach(() => {
  // Ekranlar açılışta 4-5 sn'lik bildirim zamanlayıcıları kuruyor. Sökülmeyen
  // bir ağaç bu zamanlayıcıları canlı tutuyor ve birkaç testten sonra sonraki
  // testlerin render'ı hiç tamamlanmıyordu.
  cleanup();
  jest.clearAllTimers();
});

describe('TableDetailScreen (cloud)', () => {
  it('renders the check with its order lines', async () => {
    await seedOpenCheck();
    const screen = await renderWithProviders(<TableDetailScreen />);

    expect(await screen.findByText('Masa 4')).toBeTruthy();
    // Ürün adı hem adisyon satırında hem palette geçebilir; varlığı yeterli.
    expect((await screen.findAllByText(/Çay/)).length).toBeGreaterThan(0);
  });

  /**
   * Yaşanan çökmenin regresyon testi. İşlemler menüsü `BottomSheetModal`'a
   * geri döndürülürse bu test kırılır.
   */
  it('opens the actions menu without crashing and lists every action', async () => {
    await seedOpenCheck();
    const screen = await renderWithProviders(<TableDetailScreen />);
    await screen.findByText('Masa 4');

    fireEvent.press(screen.getByLabelText('İşlemler'));

    expect(await screen.findByText('Hesabı yeniden adlandır')).toBeTruthy();
    // "Ödeme al" adisyon panelinde de var; menüdeki kopya yeterli.
    expect(screen.getAllByText('Ödeme al').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Hesabı böl').length).toBeGreaterThan(0);
    expect(screen.getByText('Masayı taşı veya birleştir')).toBeTruthy();
    expect(screen.getByText('Hesabı sil')).toBeTruthy();
  });

  it('renames the selected check through the actions menu', async () => {
    const sent = await seedOpenCheck('Sipariş 1');
    const screen = await renderWithProviders(<TableDetailScreen />);
    await screen.findByText('Masa 4');

    fireEvent.press(screen.getByLabelText('İşlemler'));
    fireEvent.press(await screen.findByText('Hesabı yeniden adlandır'));

    fireEvent.changeText(await screen.findByLabelText('Hesap adı'), 'Teras masası');
    // Kaydet'e basmadan önce yazının gerçekten state'e işlendiğini bekle;
    // aksi halde komut eski adla çalışıp sessizce hiçbir şey değiştirmiyor.
    await waitFor(() =>
      expect(screen.getByLabelText('Hesap adı').props.value).toBe('Teras masası'),
    );
    fireEvent.press(screen.getByText('Kaydet'));

    await waitFor(() => expect(renameCheck).toHaveBeenCalled());
    // Yeni ad hem hesap şeridinde hem adisyon başlığında görünüyor.
    expect((await screen.findAllByText('Teras masası')).length).toBeGreaterThan(0);
    const stored = await database.repository('checks').getById(seedScope, sent.check.id);
    expect(stored?.name).toBe('Teras masası');
  });

  it('voids the selected check once a cancellation reason is chosen', async () => {
    const sent = await seedOpenCheck();
    const screen = await renderWithProviders(<TableDetailScreen />);
    await screen.findByText('Masa 4');

    fireEvent.press(screen.getByLabelText('İşlemler'));
    fireEvent.press(await screen.findByText('Hesabı sil'));
    fireEvent.press(await screen.findByText('Müşteri vazgeçti'));

    await waitFor(() => expect(voidCheck).toHaveBeenCalled());
    const storedCheck = await database.repository('checks').getById(seedScope, sent.check.id);
    expect(storedCheck?.status).toBe('voided');
    const storedItem = await database.repository('orderItems').getById(seedScope, sent.items[0].id);
    expect(storedItem?.status).toBe('cancelled');
  });

  it('refuses to void a check that carries a confirmed payment', async () => {
    const sent = await seedOpenCheck();
    await addConfirmedPayment(sent.check.id, sent.check.tableSessionId);

    const screen = await renderWithProviders(<TableDetailScreen />);
    await screen.findByText('Masa 4');

    fireEvent.press(screen.getByLabelText('İşlemler'));
    fireEvent.press(await screen.findByText('Hesabı sil'));
    fireEvent.press(await screen.findByText('Müşteri vazgeçti'));

    expect(await screen.findByText('Hesap silinemedi')).toBeTruthy();
    expect(voidCheck).not.toHaveBeenCalled();
    const storedCheck = await database.repository('checks').getById(seedScope, sent.check.id);
    expect(storedCheck?.status).toBe('open');
  });

  /** "+ Yeni hesap" butonunun görünürde hiçbir şey yapmaması hatasının testi. */
  it('shows a pending check chip after tapping new check even when named orders are off', async () => {
    await seedOpenCheck();
    const screen = await renderWithProviders(<TableDetailScreen />);
    await screen.findByText('Masa 4');
    expect(screen.queryAllByText('Yeni hesap')).toHaveLength(1);

    fireEvent.press(screen.getByRole('button', { name: 'Yeni hesap' }));

    await waitFor(() => expect(screen.queryAllByText('Yeni hesap').length).toBeGreaterThan(1));
  });
});
