'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api';
import { updateProfileSchema } from '@klarify/core';

interface ProfileUpdateResult {
  error?: string;
  success?: boolean;
}

/**
 * Server Action: update the user's display name.
 *
 * Updates both the Supabase auth metadata (for the session display name)
 * and the public.users record (via the API) for RLS-scoped access.
 */
export async function updateProfile(formData: FormData): Promise<ProfileUpdateResult> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/sign-in');
  }

  const raw = {
    name: formData.get('name') ?? undefined,
  };

  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Invalid input.';
    return { error: msg };
  }

  // Update Supabase auth metadata so the name appears in getUser()
  await supabase.auth.updateUser({
    data: { name: parsed.data.name },
  });

  // Update public.users via API
  const result = await apiFetch<{ id: string; name: string | null }>(
    '/api/user/me',
    session.access_token,
    {
      method: 'PUT',
      body: JSON.stringify({ name: parsed.data.name }),
    },
  );

  if (!result.success) {
    return { error: result.error ?? 'Profile update failed.' };
  }

  revalidatePath('/profile');
  revalidatePath('/dashboard');
  return { success: true };
}
