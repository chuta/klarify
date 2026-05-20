'use client';

import { useState } from 'react';
import { setNewPassword } from './actions';

export function ResetPasswordForm(): JSX.Element {
  const [error,  setError]   = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPw, setShowPw]   = useState(false);

  async function handleSubmit(formData: FormData): Promise<void> {
    setError(null);

    const password = formData.get('password') as string;
    const confirm  = formData.get('confirm')  as string;

    if (password.length < 8)    { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm)   { setError('Passwords do not match.');                 return; }

    setPending(true);
    try {
      await setNewPassword(formData);
    } catch {
      setError('Something went wrong. Please try again.');
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
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
            New password
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
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
            Confirm new password
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
          {pending ? 'Updating password…' : 'Update password'}
        </button>
      </form>
    </>
  );
}
