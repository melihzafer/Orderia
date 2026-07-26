import { secureSessionStorage } from '../secureSessionStorage.native';

const mockSecureValues = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockSecureValues.get(key) ?? null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockSecureValues.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    mockSecureValues.delete(key);
    return Promise.resolve();
  }),
}));

describe('native secure Supabase session storage', () => {
  beforeEach(() => mockSecureValues.clear());

  it('encrypts large sessions in recoverable SecureStore chunks', async () => {
    const session = JSON.stringify({
      access_token: 'a'.repeat(4_000),
      refresh_token: 'b'.repeat(1_000),
    });

    await secureSessionStorage.setItem('sb-auth-token', session);

    expect(mockSecureValues.get('sb-auth-token')).toMatch(/^orderia-secure-v1:/);
    expect([...mockSecureValues.keys()].filter((key) => key !== 'sb-auth-token').length).toBe(3);
    await expect(secureSessionStorage.getItem('sb-auth-token')).resolves.toBe(session);
  });

  it('replaces old chunks and removes the complete encrypted session', async () => {
    await secureSessionStorage.setItem('sb-auth-token', 'x'.repeat(4_000));
    const oldChunkKeys = [...mockSecureValues.keys()].filter((key) => key !== 'sb-auth-token');

    await secureSessionStorage.setItem('sb-auth-token', 'new-session');

    expect(oldChunkKeys.every((key) => !mockSecureValues.has(key))).toBe(true);
    await expect(secureSessionStorage.getItem('sb-auth-token')).resolves.toBe('new-session');
    await secureSessionStorage.removeItem('sb-auth-token');
    expect(mockSecureValues.size).toBe(0);
  });

  it('clears a corrupt partial session instead of returning a broken token', async () => {
    await secureSessionStorage.setItem('sb-auth-token', 'x'.repeat(4_000));
    const chunk = [...mockSecureValues.keys()].find((key) => key !== 'sb-auth-token');
    if (!chunk) throw new Error('Expected a secure chunk');
    mockSecureValues.delete(chunk);

    await expect(secureSessionStorage.getItem('sb-auth-token')).resolves.toBeNull();
    expect(mockSecureValues.has('sb-auth-token')).toBe(false);
  });
});
