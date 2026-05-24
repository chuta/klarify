import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api';
import { prisma } from '@/lib/db';

/** Server wrapper for dashboard onboarding wizard — passes org context. */
export async function loadOnboardingWizardProps(userId: string): Promise<{
  skipOrgStep: boolean;
  defaultOrgName: string;
  invitedOrgName?: string;
}> {
  const membership = await prisma.orgMember.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: { org: { select: { name: true } } },
  });

  const skipOrgStep = Boolean(membership && membership.role !== 'owner');

  return {
    skipOrgStep,
    defaultOrgName: membership?.role === 'owner' ? membership.org.name : '',
    invitedOrgName: skipOrgStep ? membership?.org.name : undefined,
  };
}

/** Fetch session + redirect if unauthenticated — shared by team/onboarding pages. */
export async function requireDashboardSession(): Promise<{
  userId: string;
  accessToken: string;
  email: string;
}> {
  const supabase = createClient();
  const [userRes, sessionRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ]);

  const user = userRes.data.user;
  const session = sessionRes.data.session;

  if (userRes.error || !user || !session) redirect('/sign-in');

  return {
    userId: user.id,
    accessToken: session.access_token,
    email: user.email ?? '',
  };
}

export async function loadPrimaryMembership(userId: string): Promise<{
  orgId: string;
  orgName: string;
  role: string;
  plan: string;
} | null> {
  const membership = await prisma.orgMember.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: { org: { select: { id: true, name: true, plan: true } } },
  });

  if (!membership) return null;

  return {
    orgId: membership.org.id,
    orgName: membership.org.name,
    role: membership.role,
    plan: membership.org.plan,
  };
}

export async function loadUserMe(accessToken: string) {
  return apiFetch<import('@klarify/core').UserMeResponse>('/api/user/me', accessToken);
}
