import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getOptionalUser } from '@/lib/supabase/server';
import { resolveUserSetupState } from '@/lib/teamService';
import { SignUpForm } from './_form';
import { Envelope } from '@/components/icons';

interface SignUpPageProps {
  searchParams: { sent?: string; error?: string; next?: string };
}

/**
 * /sign-up — create a new Klarify account.
 *
 * States:
 *   default  → registration form (name + email + password + confirm)
 *   ?sent=1  → email confirmation sent
 *   ?error=… → inline validation / server error, form stays visible
 *
 * Already-authenticated users are bounced to /dashboard.
 */
export default async function SignUpPage({
  searchParams,
}: SignUpPageProps): Promise<JSX.Element> {
  const user = await getOptionalUser();
  if (user) {
    if (searchParams.next) redirect(searchParams.next);
    const setup = await resolveUserSetupState(user.id, user.email ?? '');
    redirect(setup.redirect);
  }

  const sent  = searchParams.sent === '1';
  const error = searchParams.error ? decodeURIComponent(searchParams.error) : null;
  const nextUrl = searchParams.next ?? null;

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
          <p className="mt-3 text-sm text-[#555555]">Navigate Regulated Markets with Confidence</p>
        </div>

        <div className="rounded-2xl border border-[#CCCCCC] bg-white p-8 shadow-sm">
          {sent ? (
            /* ── Email confirmation sent ── */
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#E6F4F4]">
                <Envelope className="text-[#0B6E6E]" />
              </div>
              <h1 className="mb-2 text-xl font-semibold text-[#1A1A1A]">
                Confirm your email
              </h1>
              <p className="text-sm text-[#555555]">
                We sent a confirmation link to your inbox. Click it to activate your account and
                start your Regulatory Readiness Score.
              </p>
              <Link
                href="/sign-up"
                className="mt-6 inline-block text-sm font-medium text-[#0B6E6E] underline-offset-2 hover:underline"
              >
                Use a different email
              </Link>
            </div>
          ) : (
            /* ── Registration form ── */
            <>
              <h1 className="mb-1 text-xl font-semibold text-[#1A1A1A]">Create your account</h1>
              <p className="mb-6 text-sm text-[#555555]">
                Free to start. No credit card required.
              </p>

              <SignUpForm error={error} nextUrl={nextUrl} />
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-[#555555]">
          Already have an account?{' '}
          <Link
            href="/sign-in"
            className="font-medium text-[#0B6E6E] underline-offset-2 hover:underline"
          >
            Sign in
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-[#CCCCCC]">
        © 2026 Blockspace Technologies Limited. All rights reserved. By creating an account you agree to our{' '}
          <Link href="/legal/terms" className="underline">Terms of Service</Link>{' '}
          and{' '}
          <Link href="/legal/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </div>
    </main>
  );
}
