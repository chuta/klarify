/**
 * Supabase client for Expo (React Native).
 *
 * Uses expo-secure-store as the storage adapter so tokens are kept in
 * the device's encrypted keychain rather than AsyncStorage. This is the
 * mobile equivalent of the @supabase/ssr cookie adapter used in apps/web.
 *
 * Import from: import { supabase } from '@/lib/supabase';
 */
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are required. ' +
      'Add them to your .env.local or EAS secret store.',
  );
}

/**
 * SecureStore adapter for @supabase/supabase-js.
 *
 * Supabase's AsyncStorage adapter puts tokens in plaintext.  SecureStore
 * uses iOS Keychain / Android Keystore — required for NDPA §30 (data
 * protection) and MLPPA 2022 §25 (record security) compliance.
 *
 * Key length limit: SecureStore keys must be ≤ 255 chars and may only
 * contain [a-zA-Z0-9._-]. Supabase uses dot-prefixed keys which are
 * fine on iOS but cause issues on some Android versions — we base64-URL-
 * encode to a safe alphabet and truncate to 200 chars.
 */
const SecureStoreAdapter = {
  getItem(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(sanitiseKey(key));
  },
  setItem(key: string, value: string): Promise<void> {
    return SecureStore.setItemAsync(sanitiseKey(key), value);
  },
  removeItem(key: string): Promise<void> {
    return SecureStore.deleteItemAsync(sanitiseKey(key));
  },
};

function sanitiseKey(key: string): string {
  // Replace any character that isn't alphanumeric, dot, dash, or underscore.
  return key.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

export const supabase = createClient(url, anon, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Deep link handled manually in _layout.tsx
  },
});
