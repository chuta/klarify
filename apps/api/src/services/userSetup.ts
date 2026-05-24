/**
 * Post-auth routing for Fly API — mirrors apps/web/src/lib/teamService.ts setup logic.
 */
import { prisma } from '../db.js';

export type UserSetupKind = 'complete' | 'owner_setup' | 'team_member' | 'pending_invite';

export interface UserSetupState {
  kind: UserSetupKind;
  redirect: string;
  hasProfile: boolean;
}

async function userHasCompletedOnboarding(userId: string): Promise<boolean> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { userId: true },
  });
  return profile !== null;
}

async function provisionTeamMemberProfile(userId: string, orgId: string): Promise<void> {
  const existing = await prisma.userProfile.findUnique({
    where: { userId },
    select: { userId: true },
  });
  if (existing) return;

  const ownerMember = await prisma.orgMember.findFirst({
    where: { orgId, role: 'owner' },
    select: { userId: true },
  });

  const ownerProfile = ownerMember
    ? await prisma.userProfile.findUnique({ where: { userId: ownerMember.userId } })
    : null;

  await prisma.userProfile.create({
    data: {
      userId,
      productTypes: ownerProfile?.productTypes ?? [],
      targetMarkets: ownerProfile?.targetMarkets?.length
        ? ownerProfile.targetMarkets
        : ['NG'],
      stage: ownerProfile?.stage ?? 'building',
      teamSize: ownerProfile?.teamSize ?? 1,
      hasComplianceOfficer: ownerProfile?.hasComplianceOfficer ?? false,
      existingInfrastructure: ownerProfile?.existingInfrastructure ?? [],
    },
  });
}

export async function resolveUserSetupState(
  userId: string,
  email: string,
): Promise<UserSetupState> {
  const normalizedEmail = email.trim().toLowerCase();

  const [hasProfile, membership, pendingInvite] = await Promise.all([
    userHasCompletedOnboarding(userId),
    prisma.orgMember.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: { org: { select: { id: true } } },
    }),
    prisma.orgInvite.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  if (membership && membership.role !== 'owner') {
    if (!hasProfile) {
      await provisionTeamMemberProfile(userId, membership.org.id);
      return { kind: 'team_member', redirect: '/dashboard/welcome', hasProfile: true };
    }
    return { kind: 'complete', redirect: '/dashboard', hasProfile: true };
  }

  if (hasProfile) {
    return { kind: 'complete', redirect: '/dashboard', hasProfile: true };
  }

  if (pendingInvite && !membership) {
    return {
      kind: 'pending_invite',
      redirect: `/dashboard/join-team?invite=${pendingInvite.id}`,
      hasProfile: false,
    };
  }

  return { kind: 'owner_setup', redirect: '/dashboard/onboarding', hasProfile: false };
}
