'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { updateProfileSchema, updateOrgSchema } from '@klarify/core';
import { apiFetch } from '@/lib/api';

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
  const {
    data: { session },
  } = await supabase.auth.getSession();
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

  const userId = session.user.id;

  try {
    const membership = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.current_user_id', $1, true)`,
        userId,
      );
      return tx.orgMember.findUnique({
        where: { orgId_userId: { orgId, userId } },
        select: { role: true },
      });
    });

    if (!membership) {
      redirect(
        `/dashboard/profile?orgError=${encodeURIComponent('Organisation not found.')}`,
      );
    }
    if (membership.role !== 'owner') {
      redirect(
        `/dashboard/profile?orgError=${encodeURIComponent('Only the organisation owner can rename it.')}`,
      );
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.current_user_id', $1, true)`,
        userId,
      );
      await tx.organisation.update({
        where: { id: orgId },
        data: { name: parsed.data.name },
      });
    });
  } catch (err) {
    console.error('[profile/updateOrgName] error', err);
    redirect(
      `/dashboard/profile?orgError=${encodeURIComponent('Organisation update failed.')}`,
    );
  }

  revalidatePath('/dashboard/profile');
  revalidatePath('/dashboard');
  redirect('/dashboard/profile?orgSuccess=1');
}
