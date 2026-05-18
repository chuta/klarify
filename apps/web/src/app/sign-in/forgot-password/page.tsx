import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { requestPasswordReset } from './actions';

interface ForgotPasswordPageProps {
  searchParams: {
    sent?: string;
    error?: string;
  };
}

/**
 * /sign-in/forgot-password
 *
 * Step 1 of the password-reset flow: user enters their email, we ask
 * Supabase to send a reset email (using our branded "Reset Password"
 * template). The user clicks the link in the email and lands on
 * /auth/reset-password where they choose a new password.
 *
 * States:
 *   default   → email entry form
 *   ?sent=1   → "check your inbox" confirmation (always shown,
 *                regardless of whether the email exists)
 *   ?error=…  → inline error
 *
 * Already-authenticated users are bounced to /dashboard immediately.
 */
export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps): Promise<JSX.Element> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  const sent  = searchParams.sent === '1';
  const error = searchParams.error ? decodeURIComponent(searchParams.error) : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-4 py-12">
      <div className="w-full max-w-md">
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
            <div className="p-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#E6F4F4]">
                <svg className="h-7 w-7 text-[#0B6E6E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="mb-2 text-xl font-semibold text-[#1A1A1A]">Check your inbox</h1>
              <p className="text-sm text-[#555555]">
                If an account exists for that email, we&apos;ve sent a link to
                reset your password. The link expires in 60 minutes.
              </p>
              <Link
                href="/sign-in"
                className="mt-6 inline-block text-sm font-medium text-[#0B6E6E] underline-offset-2 hover:underline"
              >
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <div className="p-8">
              <h1 className="mb-1 text-xl font-semibold text-[#1A1A1A]">Reset your password</h1>
              <p className="mb-6 text-sm text-[#555555]">
                Enter the email address you use for Klarify and we&apos;ll send
                you a secure link to set a new password.
              </p>

              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form action={requestPasswordReset} className="space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@company.com"
                    className="w-full rounded-lg border border-[#CCCCCC] px-4 py-2.5 text-sm text-[#1A1A1A] placeholder-[#CCCCCC] outline-none transition focus:border-[#0B6E6E] focus:ring-2 focus:ring-[#0B6E6E]/20"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-lg bg-[#0B6E6E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0D2B45] active:scale-[0.98]"
                >
                  Send reset link
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-[#555555]">
                Remembered it?{' '}
                <Link
                  href="/sign-in?tab=password"
                  className="font-medium text-[#0B6E6E] underline-offset-2 hover:underline"
                >
                  Back to sign in
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
