'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Server Action: complete a password reset.
 *
 * Precondition: the user arrived here after clicking the reset-password
 * link in their email. The /auth/callback handler has already exchanged
 * the recovery `code` for a session (Supabase calls this a "recovery
 * session"). updateUser() with a new password completes the reset.
 */
export async function setNewPassword(formData: FormData): Promise<void> {
  const password = (formData.get('password') as string | null) ?? '';
  const confirm  = (formData.get('confirm')  as string | null) ?? '';

  if (password.length < 8) {
    redirect('/auth/reset-password?error=Password+must+be+at+least+8+characters.');
  }
  if (password !== confirm) {
    redirect('/auth/reset-password?error=Passwords+do+not+match.');
  }

  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      '/sign-in?error=' +
      encodeURIComponent('Your reset link has expired. Please request a new one.'),
    );
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error('[reset-password] update error', error.message);
    redirect(`/auth/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect(
    '/sign-in?tab=password&error=' +
    encodeURIComponent('Password updated. Please sign in with your new password.'),
  );
}
