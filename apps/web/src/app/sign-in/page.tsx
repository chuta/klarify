import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { SignInTabs } from './_tabs';

interface SignInPageProps {
  searchParams: {
    sent?: string;
    error?: string;
    tab?: 'magic' | 'password';
  };
}

/**
 * /sign-in — supports two authentication paths:
 *   1. Magic link  — passwordless OTP email (quick login for any user)
 *   2. Password    — email + password for registered accounts
 *
 * States:
 *   default   → tab switcher with the active form
 *   ?sent=1   → "check your inbox" confirmation (magic link only)
 *   ?error=…  → inline error, form still visible
 *   ?tab=…    → pre-select magic|password tab via URL param
 *
 * Already-authenticated users are bounced to /dashboard immediately.
 */
export default async function SignInPage({
  searchParams,
}: SignInPageProps): Promise<JSX.Element> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  const sent      = searchParams.sent === '1';
  const error     = searchParams.error ? decodeURIComponent(searchParams.error) : null;
  const activeTab = searchParams.tab ?? 'magic';

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center">
          <Link href="/">
            <Image
              src="/klarify_logo.png"
              alt="Klarify"
              width={140}
              height={47}
              priority
              className="object-contain"
            />
          </Link>
          <p className="mt-3 text-sm text-[#555555]">
            Navigate Regulated Markets with Confidence
          </p>
        </div>

        <div className="rounded-2xl border border-[#CCCCCC] bg-white shadow-sm">
          {sent ? (
            /* ── Magic-link sent confirmation ── */
            <div className="p-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#E6F4F4]">
                <svg
                  className="h-7 w-7 text-[#0B6E6E]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h1 className="mb-2 text-xl font-semibold text-[#1A1A1A]">Check your inbox</h1>
              <p className="text-sm text-[#555555]">
                We sent you a magic link. Click it to sign in instantly. No password
                needed — the link expires in 60 minutes.
              </p>
              <a
                href="/sign-in"
                className="mt-6 inline-block text-sm font-medium text-[#0B6E6E] underline-offset-2 hover:underline"
              >
                Use a different email
              </a>
            </div>
          ) : (
            /* ── Tab form ── */
            <SignInTabs activeTab={activeTab} error={error} />
          )}
        </div>

        {/* Sign-up link */}
        <p className="mt-6 text-center text-sm text-[#555555]">
          Don&apos;t have an account?{' '}
          <Link
            href="/sign-up"
            className="font-medium text-[#0B6E6E] underline-offset-2 hover:underline"
          >
            Create one free →
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-[#CCCCCC]">
          By signing in you agree to our{' '}
          <a href="/legal/terms" className="underline">Terms of Service</a>{' '}
          and{' '}
          <a href="/legal/privacy" className="underline">Privacy Policy</a>.
        </p>
      </div>
    </main>
  );
}
