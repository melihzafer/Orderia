import { readSupabaseEnvironment } from '../environment';

const originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const originalKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

describe('Supabase environment', () => {
  afterEach(() => {
    restoreEnvironmentValue('EXPO_PUBLIC_SUPABASE_URL', originalUrl);
    restoreEnvironmentValue('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', originalKey);
  });

  it('keeps the legacy local mode when no cloud variables are configured', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    expect(readSupabaseEnvironment()).toBeNull();
  });

  it('rejects partial cloud configuration instead of silently using it', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    expect(() => readSupabaseEnvironment()).toThrow(/Both/);
  });

  it('normalizes a complete cloud configuration', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co/';
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable-key';

    expect(readSupabaseEnvironment()).toEqual({
      url: 'https://example.supabase.co',
      publishableKey: 'publishable-key',
    });
  });
});

function restoreEnvironmentValue(
  key: 'EXPO_PUBLIC_SUPABASE_URL' | 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  value: string | undefined,
): void {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
