'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthCallbackUrl } from '@/lib/auth-redirect';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeSlash } from '@/components/icons';

interface SignUpFormProps {
  error: string | null;
  nextUrl?: string | null;
}

function buildEmailRedirectTo(nextUrl?: string | null): string {
  const base = getAuthCallbackUrl();
  if (nextUrl) {
    return `${base}?next=${encodeURIComponent(nextUrl)}`;
  }
  return base;
}

function mapSignUpError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Too many attempts. Please wait a minute and try again.';
  }
  return raw;
}

export function SignUpForm({ error: initialError, nextUrl }: SignUpFormProps): JSX.Element {
  const router = useRouter();
  const [clientError, setClientError] = useState<string | null>(null);
  const [showPw, setShowPw]           = useState(false);
  const [pending, setPending]         = useState(false);

  const error = clientError ?? initialError;

  function validate(formData: FormData): string | null {
    const name     = (formData.get('name')     as string).trim();
    const email    = (formData.get('email')    as string).trim();
    const password =  formData.get('password') as string;
    const confirm  =  formData.get('confirm')  as string;

    if (!name)               return 'Please enter your full name.';
    if (!email.includes('@'))return 'Please enter a valid email address.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirm) return 'Passwords do not match.';
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setClientError(null);
    setPending(true);

    const formData = new FormData(e.currentTarget);
    const validationError = validate(formData);
    if (validationError) {
      setClientError(validationError);
      setPending(false);
      return;
    }

    const name     = (formData.get('name') as string).trim();
    const email    = (formData.get('email') as string).trim().toLowerCase();
    const password = formData.get('password') as string;

    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: buildEmailRedirectTo(nextUrl),
        },
      });

      if (signUpError) {
        setClientError(mapSignUpError(signUpError.message));
        return;
      }

      if (!data.session) {
        router.push('/sign-up?sent=1');
        router.refresh();
        return;
      }

      const syncRes = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });
      const syncJson = await syncRes.json() as {
        success: boolean;
        data?: { redirect: string };
      };
      router.push(syncJson.success && syncJson.data?.redirect
        ? syncJson.data.redirect
        : nextUrl ?? '/dashboard/onboarding');
      router.refresh();
    } catch {
      setClientError('Something went wrong. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full name */}
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
            Full name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            placeholder="Adaeze Okonkwo"
            className="w-full rounded-lg border border-[#CCCCCC] px-4 py-2.5 text-sm text-[#1A1A1A] placeholder-[#CCCCCC] outline-none transition focus:border-[#0B6E6E] focus:ring-2 focus:ring-[#0B6E6E]/20"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
            Work email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="adaeze@company.com"
            className="w-full rounded-lg border border-[#CCCCCC] px-4 py-2.5 text-sm text-[#1A1A1A] placeholder-[#CCCCCC] outline-none transition focus:border-[#0B6E6E] focus:ring-2 focus:ring-[#0B6E6E]/20"
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="At least 8 characters"
              className="w-full rounded-lg border border-[#CCCCCC] px-4 py-2.5 pr-10 text-sm text-[#1A1A1A] placeholder-[#CCCCCC] outline-none transition focus:border-[#0B6E6E] focus:ring-2 focus:ring-[#0B6E6E]/20"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#CCCCCC] hover:text-[#555555]"
              tabIndex={-1}
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? (
                <EyeSlash />
              ) : (
                <Eye />
              )}
            </button>
          </div>
          <p className="mt-1 text-xs text-[#CCCCCC]">Minimum 8 characters</p>
        </div>

        {/* Confirm password */}
        <div>
          <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
            Confirm password
          </label>
          <input
            id="confirm"
            name="confirm"
            type={showPw ? 'text' : 'password'}
            autoComplete="new-password"
            required
            placeholder="Repeat your password"
            className="w-full rounded-lg border border-[#CCCCCC] px-4 py-2.5 text-sm text-[#1A1A1A] placeholder-[#CCCCCC] outline-none transition focus:border-[#0B6E6E] focus:ring-2 focus:ring-[#0B6E6E]/20"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0B6E6E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0D2B45] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Creating your account…' : 'Create account'}
        </button>
      </form>
    </>
  );
}
