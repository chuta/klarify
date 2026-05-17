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

export async function updateProfile(formData: FormData): Promise<ProfileUpdateResult> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/sign-in');
  }

  const raw = { name: formData.get('name') ?? undefined };
  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Invalid input.';
    return { error: msg };
  }

  await supabase.auth.updateUser({ data: { name: parsed.data.name } });

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

  revalidatePath('/dashboard/profile');
  revalidatePath('/dashboard');
  return { success: true };
}
