import 'react-native-url-polyfill/auto';

import { SupabaseClient, createClient, processLock } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { readSupabaseEnvironment } from '../../config/environment';
import { Database } from './database.types';
import { secureSessionStorage } from './secureSessionStorage';

let supabaseClient: SupabaseClient<Database> | null | undefined;

export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (supabaseClient !== undefined) return supabaseClient;

  const environment = readSupabaseEnvironment();
  if (!environment) {
    supabaseClient = null;
    return null;
  }

  supabaseClient = createClient<Database>(environment.url, environment.publishableKey, {
    auth: {
      ...(Platform.OS === 'web' ? {} : { storage: secureSessionStorage }),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  });
  return supabaseClient;
}

export function subscribeToNativeAuthAutoRefresh(client: SupabaseClient<Database>): () => void {
  if (Platform.OS === 'web') return () => undefined;

  const updateRefreshState = (state: string) => {
    if (state === 'active') {
      client.auth.startAutoRefresh();
    } else {
      client.auth.stopAutoRefresh();
    }
  };
  updateRefreshState(AppState.currentState);
  const subscription = AppState.addEventListener('change', updateRefreshState);

  return () => {
    subscription.remove();
    client.auth.stopAutoRefresh();
  };
}
