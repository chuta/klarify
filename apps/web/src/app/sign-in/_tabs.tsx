'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { createClient } from '@/lib/supabase/client';
import { signInWithPassword } from './actions';

interface SignInTabsProps {
  activeTab: 'magic' | 'password';
  error: string | null;
}

export function SignInTabs({ activeTab: initialTab, error: initialError }: SignInTabsProps): JSX.Element {
  const [tab, setTab] = useState<'magic' | 'password'>(initialTab);

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex border-b border-[#CCCCCC]">
        <button
          type="button"
          onClick={() => setTab('magic')}
          className={[
            'flex-1 py-4 text-sm font-medium transition',
            tab === 'magic'
              ? 'border-b-2 border-[#0B6E6E] text-[#0B6E6E]'
              : 'text-[#555555] hover:text-[#1A1A1A]',
          ].join(' ')}
        >
          Magic link
        </button>
        <button
          type="button"
          onClick={() => setTab('password')}
          className={[
            'flex-1 py-4 text-sm font-medium transition',
            tab === 'password'
              ? 'border-b-2 border-[#0B6E6E] text-[#0B6E6E]'
              : 'text-[#555555] hover:text-[#1A1A1A]',
          ].join(' ')}
        >
          Password
        </button>
      </div>

      <div className="p-8">
        {initialError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {initialError}
          </div>
        )}

        {tab === 'magic' ? (
          <MagicLinkForm />
        ) : (
          <PasswordForm />
        )}
      </div>
    </div>
  );
}

function MagicLinkForm(): JSX.Element {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string | null)?.trim().toLowerCase() ?? '';
    if (!email) {
      setError('Please enter a valid email address.');
      setPending(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // Browser client stores the PKCE verifier in cookies — required for
          // /auth/callback exchangeCodeForSession to succeed.
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (otpError) {
        setError(mapMagicLinkError(otpError.message));
        return;
      }

      router.push('/sign-in?sent=1');
      router.refresh();
    } catch {
      setError('We could not send the sign-in link. Please try again or use the password tab.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <h1 className="mb-1 text-xl font-semibold text-[#1A1A1A]">Sign in with magic link</h1>
      <p className="mb-6 text-sm text-[#555555]">
        Enter your email and we&apos;ll send you a one-click sign-in link. No password needed.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="magic-email" className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
            Email address
          </label>
          <input
            id="magic-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            className="w-full rounded-lg border border-[#CCCCCC] px-4 py-2.5 text-sm text-[#1A1A1A] placeholder-[#CCCCCC] outline-none transition focus:border-[#0B6E6E] focus:ring-2 focus:ring-[#0B6E6E]/20"
          />
        </div>

        <p className="text-xs text-[#999]">
          Open the link in the same browser where you request it (not an in-app email preview).
        </p>

        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0B6E6E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0D2B45] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Sending your link…' : 'Send magic link'}
        </button>
      </form>
    </>
  );
}

function mapMagicLinkError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'You requested a link too recently. Please wait a minute and try again.';
  }
  if (m.includes('invalid') && m.includes('email')) {
    return 'That email address looks invalid. Please double-check and try again.';
  }
  if (m.includes('sending') || m.includes('smtp') || m.includes('delivery')) {
    return 'We could not send the sign-in link right now. Try the password tab, or try again in a minute.';
  }
  return 'We could not send the sign-in link. Please try again or use the password tab.';
}

function PasswordForm(): JSX.Element {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData): Promise<void> {
    setError(null);
    try {
      await signInWithPassword(formData);
    } catch (e) {
      // Server action redirects on success — catch is for client-visible errors.
      const msg = e instanceof Error ? e.message : 'Sign-in failed. Please try again.';
      setError(msg);
    }
  }

  return (
    <>
      <h1 className="mb-1 text-xl font-semibold text-[#1A1A1A]">Sign in with password</h1>
      <p className="mb-6 text-sm text-[#555555]">
        Use the email and password from your Klarify account.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form action={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="pw-email" className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
            Email address
          </label>
          <input
            id="pw-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            className="w-full rounded-lg border border-[#CCCCCC] px-4 py-2.5 text-sm text-[#1A1A1A] placeholder-[#CCCCCC] outline-none transition focus:border-[#0B6E6E] focus:ring-2 focus:ring-[#0B6E6E]/20"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="pw-password" className="block text-sm font-medium text-[#1A1A1A]">
              Password
            </label>
            <a
              href="/sign-in/forgot-password"
              className="text-xs text-[#0B6E6E] underline-offset-2 hover:underline"
            >
              Forgot password?
            </a>
          </div>
          <input
            id="pw-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="w-full rounded-lg border border-[#CCCCCC] px-4 py-2.5 text-sm text-[#1A1A1A] placeholder-[#CCCCCC] outline-none transition focus:border-[#0B6E6E] focus:ring-2 focus:ring-[#0B6E6E]/20"
          />
        </div>

        <SubmitButton label="Sign in" pendingLabel="Signing you in…" />
      </form>
    </>
  );
}
