import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getOptionalUser } from '@/lib/supabase/server';
import { resolveUserSetupState } from '@/lib/teamService';
import { SignInTabs } from './_tabs';
import { Envelope } from '@/components/icons';

interface SignInPageProps {
  searchParams: {
    sent?: string;
    error?: string;
    tab?: 'magic' | 'password';
    next?: string;
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
  const user = await getOptionalUser();
  if (user) {
    if (searchParams.next) redirect(searchParams.next);
    const setup = await resolveUserSetupState(user.id, user.email ?? '');
    redirect(setup.redirect);
  }

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
                <Envelope className="text-[#0B6E6E]" />
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
            <SignInTabs activeTab={activeTab} error={error} nextUrl={searchParams.next ?? null} />
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
        © 2026 Blockspace Technologies Limited. All rights reserved. By signing in you agree to our{' '}
          <Link href="/legal/terms" className="underline">Terms of Service</Link>{' '}
          and{' '}
          <Link href="/legal/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </div>
    </main>
  );
}
