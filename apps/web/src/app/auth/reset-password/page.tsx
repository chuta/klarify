import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { ResetPasswordForm } from './_form';

interface ResetPasswordPageProps {
  searchParams: { error?: string };
}

/**
 * /auth/reset-password
 *
 * Landing page after the user clicks the reset link in their email.
 *
 * Supabase's reset-password email link points to /auth/callback?code=…
 * (PKCE) which exchanges the code for a "recovery session" and then
 * redirects here. We require that a session exists — otherwise the link
 * was expired or invalid and we bounce back to sign-in with a friendly
 * error.
 */
export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps): Promise<JSX.Element> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      '/sign-in?error=' +
      encodeURIComponent('Your reset link has expired or is invalid. Please request a new one.'),
    );
  }

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

        <div className="rounded-2xl border border-[#CCCCCC] bg-white shadow-sm p-8">
          <h1 className="mb-1 text-xl font-semibold text-[#1A1A1A]">Set a new password</h1>
          <p className="mb-6 text-sm text-[#555555]">
            Choose a new password for <strong>{user.email}</strong>. Minimum 8 characters.
          </p>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <ResetPasswordForm />
        </div>
      </div>
    </main>
  );
}
