'use client';

import { useState } from 'react';
import { signUp } from './actions';

interface SignUpFormProps {
  error: string | null;
}

export function SignUpForm({ error: initialError }: SignUpFormProps): JSX.Element {
  const [clientError, setClientError] = useState<string | null>(null);
  const [pending, setPending]         = useState(false);
  const [showPw, setShowPw]           = useState(false);

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

  async function handleSubmit(formData: FormData): Promise<void> {
    setClientError(null);
    const validationError = validate(formData);
    if (validationError) {
      setClientError(validationError);
      return;
    }
    setPending(true);
    try {
      await signUp(formData);
    } catch {
      // signUp redirects on success — any caught error is unexpected.
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

      <form action={handleSubmit} className="space-y-4">
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
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
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
          className="w-full rounded-lg bg-[#0B6E6E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0D2B45] disabled:opacity-60 active:scale-[0.98]"
        >
          {pending ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </>
  );
}
