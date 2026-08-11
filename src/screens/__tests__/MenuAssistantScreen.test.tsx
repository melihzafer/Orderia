/* eslint-disable import/first -- Ekran importları jest.mock çağrılarından sonra gelmeli; mock'lar hoist edilir. */
import { cleanup } from '@testing-library/react-native';
import { InMemoryLocalDatabase } from '../../data/testing/inMemoryLocalDatabase';
import { createTestDatabase, mockAuth, mockOrderiaData, renderWithProviders } from '../../test-support/renderScreen';

/**
 * RTQ-005 regresyon testi: cihaz bir bulut işletmesine hiç bağlanmamışken
 * ("local_only") AI menü asistanı yanlış olan "internet gerekli" mesajı
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

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockContext.auth,
}));
jest.mock('../../data/runtime', () => ({
  useOrderiaData: () => mockContext.data,
}));

import MenuAssistantScreen from '../MenuAssistantScreen';

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

test('device never connected to a cloud business shows a cloud-connection warning, not "internet required"', async () => {
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

  const screen = await renderWithProviders(<MenuAssistantScreen />);

  expect(
    await screen.findByText(
      "Bu cihaz bir bulut işletmesine bağlı değil. AI taslağı için Ayarlar'dan bulut hesabına bağlanın.",
    ),
  ).toBeTruthy();
  expect(screen.queryByText('AI taslağı için internet bağlantısı gerekli.')).toBeNull();
});

test('cloud-connected but offline device shows the internet-required warning', async () => {
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

  const screen = await renderWithProviders(<MenuAssistantScreen />);

  expect(await screen.findByText('AI taslağı için internet bağlantısı gerekli.')).toBeTruthy();
});
