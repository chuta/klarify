'use client';

import { resetAnalytics } from '@/lib/analytics/events';

/**
 * Sign-out control. Resets the PostHog identity BEFORE the form POSTs to
 * /auth/sign-out so a shared browser doesn't attribute the next user's events
 * to the person who just signed out. The form still does the real sign-out.
 */
export function SignOutButton({ className }: { className?: string }): JSX.Element {
  return (
    <form
      method="POST"
      action="/auth/sign-out"
      className="mt-1"
      onSubmit={() => {
        resetAnalytics();
      }}
    >
      <button
        type="submit"
        className={
          className ??
          'w-full rounded-lg px-3 py-2 text-left text-xs text-[#555555] transition hover:bg-[#F5F5F5] hover:text-[#C0392B]'
        }
      >
        Sign out
      </button>
    </form>
  );
}
