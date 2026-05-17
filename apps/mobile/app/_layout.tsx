import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../src/lib/supabase';

/**
 * Root layout — wires up:
 *   1. Supabase auth state listener → redirects between /sign-in and /
 *   2. Deep-link handler for magic-link callbacks (klarify://auth/callback?...)
 *
 * Deep link flow:
 *   User taps magic link in email
 *   → OS opens klarify://auth/callback#access_token=...&refresh_token=...
 *   → handleDeepLink extracts tokens and calls setSession()
 *   → onAuthStateChange fires with SIGNED_IN event
 *   → protectedRedirect sends user to / (home/dashboard)
 */
export default function RootLayout(): JSX.Element {
  const router = useRouter();
  const segments = useSegments();

  // ── 1. Auth state listener ───────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        protectedRedirect(session, segments, router);
      },
    );
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 2. Deep-link handler ─────────────────────────────────────────────
  useEffect(() => {
    // Handle cold-start deep link (app was not already running).
    Linking.getInitialURL().then((url) => {
      if (url) void handleDeepLink(url);
    });

    // Handle deep link while app is already running.
    const sub = Linking.addEventListener('url', ({ url }) => {
      void handleDeepLink(url);
    });
    return () => sub.remove();
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Extract tokens from the magic-link deep link and exchange them for a
 * session. Supabase magic links use the hash fragment:
 *   klarify://auth/callback#access_token=...&refresh_token=...&type=magiclink
 */
async function handleDeepLink(url: string): Promise<void> {
  if (!url.includes('auth/callback')) return;

  // Parse the fragment — expo-linking gives us the full URL string.
  const fragment = url.split('#')[1];
  if (!fragment) return;

  const params = new URLSearchParams(fragment);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (!accessToken || !refreshToken) return;

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    console.error('[deep-link] setSession error', error.message);
  }
  // onAuthStateChange will fire and call protectedRedirect automatically.
}

/**
 * Redirect users based on auth state. Called whenever the session changes.
 *
 * - No session + not on sign-in → push to /sign-in
 * - Active session + on sign-in → push to / (home)
 */
function protectedRedirect(
  session: Session | null,
  segments: string[],
  router: ReturnType<typeof useRouter>,
): void {
  const inAuthGroup = segments[0] === 'sign-in';

  if (!session && !inAuthGroup) {
    router.replace('/sign-in');
  } else if (session && inAuthGroup) {
    router.replace('/');
  }
}
