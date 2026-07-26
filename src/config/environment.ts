export interface SupabaseEnvironment {
  readonly publishableKey: string;
  readonly url: string;
}

export function readSupabaseEnvironment(): SupabaseEnvironment | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url && !publishableKey) return null;

  if (!url || !publishableKey) {
    throw new Error(
      'Both EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required',
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL must be a valid URL');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL must use HTTP or HTTPS');
  }

  return {
    url: parsedUrl.toString().replace(/\/$/, ''),
    publishableKey,
  };
}
