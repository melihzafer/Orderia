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
      // Google ile giris webde/PWA'da sayfayi Supabase'e yollayip geri
      // dondurur; donusteki kodu yalnizca web otomatik takas eder. Native
      // tarafta derin baglantiyi biz ele aliriz.
      detectSessionInUrl: Platform.OS === 'web',
      flowType: 'pkce',
      lock: processLock,
    },
  });
  return supabaseClient;
}

/**
 * Google donusunun URL'de biraktigi izleri temizler. Aksi halde adres
 * cubugunda kod kalir ve garson sayfayi yenilediginde "kod tekrar
 * kullanildi" hatasi alir.
 */
export function clearAuthRedirectParams(): void {
  if (Platform.OS !== 'web') return;
  const globalWindow = globalThis as unknown as {
    readonly location?: { readonly pathname?: string; readonly href?: string };
    readonly history?: { replaceState?: (data: unknown, title: string, url: string) => void };
  };
  const href = globalWindow.location?.href;
  if (!href || !/[?#].*(code=|access_token=|error=)/.test(href)) return;
  globalWindow.history?.replaceState?.({}, '', globalWindow.location?.pathname ?? '/');
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
