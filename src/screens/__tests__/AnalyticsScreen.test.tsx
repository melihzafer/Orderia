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
 * ("local_only") ekran gerçekte yanlış olan "internet bağlantısı gerekli"
 * mesajını göstermemeli — cihazın gerçekten interneti olabilir, sorun bulut
 * bağlantısının hiç kurulmamış olması. İki durum ayrı mesajlarla ayrılır.
 */

const mockContext: {
  auth: ReturnType<typeof mockAuth>;
  data: ReturnType<typeof mockOrderiaData>;
} = {
  auth: mockAuth({
    activeMembership: {
      id: 'membership-1',
      organization_id: 'org-1',
      branch_id: 'branch-1',
      user_id: 'user-1',
      role: 'manager',
      status: 'active',
      created_at: new Date(0).toISOString(),
      deleted_at: null,
    },
  }),
  data: mockOrderiaData(new InMemoryLocalDatabase()),
};

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockContext.auth,
}));
jest.mock('../../data/runtime', () => ({
  useOrderiaData: () => mockContext.data,
}));

import AnalyticsScreen from '../AnalyticsScreen';

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

  const screen = await renderWithProviders(<AnalyticsScreen />);

  expect(
    await screen.findByText(
      "Bu cihaz bir bulut işletmesine bağlı değil. Rapor görmek için Ayarlar'dan bulut hesabına bağlanın.",
    ),
  ).toBeTruthy();
  expect(screen.queryByText('Yönetici raporu için internet bağlantısı gerekli.')).toBeNull();
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

  const screen = await renderWithProviders(<AnalyticsScreen />);

  expect(await screen.findByText('Yönetici raporu için internet bağlantısı gerekli.')).toBeTruthy();
});
