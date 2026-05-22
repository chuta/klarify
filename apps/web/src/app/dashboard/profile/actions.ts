'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api';
import { updateProfileSchema, updateOrgSchema } from '@klarify/core';

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

export async function updateOrgName(formData: FormData): Promise<void> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/sign-in');

  const raw = { name: formData.get('orgName') ?? undefined };
  const parsed = updateOrgSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Invalid organisation name.';
    redirect(`/dashboard/profile?orgError=${encodeURIComponent(msg)}`);
  }

  const orgId = formData.get('orgId');
  if (typeof orgId !== 'string' || !orgId) {
    redirect(`/dashboard/profile?orgError=${encodeURIComponent('Organisation not found.')}`);
  }

  const result = await apiFetch<{ id: string; name: string }>(
    `/api/user/org/${orgId}`,
    session.access_token,
    {
      method: 'PUT',
      body: JSON.stringify({ name: parsed.data.name }),
    },
  );

  if (!result.success) {
    redirect(
      `/dashboard/profile?orgError=${encodeURIComponent(result.error ?? 'Organisation update failed.')}`,
    );
  }

  revalidatePath('/dashboard/profile');
  revalidatePath('/dashboard');
  redirect('/dashboard/profile?orgSuccess=1');
}
