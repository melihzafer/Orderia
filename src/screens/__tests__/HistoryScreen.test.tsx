/* eslint-disable import/first -- Ekran importları jest.mock çağrılarından sonra gelmeli; mock'lar hoist edilir. */
import { cleanup } from '@testing-library/react-native';
import { InMemoryLocalDatabase } from '../../data/testing/inMemoryLocalDatabase';
import {
  createTestDatabase,
  mockAuth,
  mockOrderiaData,
  renderWithProviders,
} from '../../test-support/renderScreen';

/**
 * RTQ-002 regresyon testi: cihaz bir bulut işletmesine hiç bağlanmamışken
 * ("local_only") fiş arşivi ekranı yanlış olan "internet gerekli" mesajı
 * yerine bulut bağlantısının hiç kurulmadığını söylemeli.
 */

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
}));
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockContext.auth,
}));
jest.mock('../../data/runtime', () => ({
  useOrderiaData: () => mockContext.data,
}));

import HistoryScreen from '../HistoryScreen';

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

test('device never connected to a cloud business shows a cloud-connection message, not "internet required"', async () => {
  mockContext.data = mockOrderiaData(createTestDatabase(), {
    mode: 'local_only',
    sync: {
      online: true,
      pendingCount: 0,
      conflictCount: 0,
      syncing: false,
      hasError: false,
      state: 'synced',
    },
  });

  const screen = await renderWithProviders(<HistoryScreen />);

  expect(
    await screen.findByText(
      "Bu cihaz bir bulut işletmesine bağlı değil. Fiş arşivini görmek için Ayarlar'dan bulut hesabına bağlanın.",
    ),
  ).toBeTruthy();
  expect(
    screen.queryByText('Tüm arşivde arama yapmak için internet bağlantısı gerekli.'),
  ).toBeNull();
});

test('cloud-connected but offline device shows the internet-required message', async () => {
  mockContext.data = mockOrderiaData(createTestDatabase(), {
    mode: 'cloud',
    sync: {
      online: false,
      pendingCount: 0,
      conflictCount: 0,
      syncing: false,
      hasError: false,
      state: 'offline',
    },
  });

  const screen = await renderWithProviders(<HistoryScreen />);

  expect(
    await screen.findByText('Tüm arşivde arama yapmak için internet bağlantısı gerekli.'),
  ).toBeTruthy();
});
