'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api';
import { updateProfileSchema } from '@klarify/core';

export async function updateProfile(formData: FormData): Promise<void> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/sign-in');
  }

  const raw = { name: formData.get('name') ?? undefined };
  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Invalid input.';
    redirect(`/dashboard/profile?error=${encodeURIComponent(msg)}`);
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
    redirect(
      `/dashboard/profile?error=${encodeURIComponent(result.error ?? 'Profile update failed.')}`,
    );
  }

  revalidatePath('/dashboard/profile');
  revalidatePath('/dashboard');
  redirect('/dashboard/profile?success=1');
}
