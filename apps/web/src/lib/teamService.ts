/**
 * Team invite + seat management — shared by Netlify route handlers.
 */
import { createHash, randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import {
  canInviteMoreMembers,
  countOccupiedSeats,
  getTeamSeatLimit,
  planSupportsTeamInvites,
  roleCanManageInvites,
  type InvitableRole,
} from '@klarify/core';
import { sendTeamInvitationEmail } from '@klarify/email';
import { prisma } from '@/lib/db';

const INVITE_TTL_DAYS = 7;

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateInviteToken(): string {
  return randomBytes(32).toString('hex');
}

async function withUserRls<T>(
  userId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_id', $1, true)`, userId);
    return fn(tx);
  });
}

export async function syncOrgSeatsUsed(
  tx: Prisma.TransactionClient,
  orgId: string,
): Promise<number> {
  const count = await tx.orgMember.count({ where: { orgId } });
  await tx.organisation.update({ where: { id: orgId }, data: { seatsUsed: count } });
  return count;
}

export async function getTeamSeatUsage(
  tx: Prisma.TransactionClient,
  orgId: string,
): Promise<{ members: number; pendingInvites: number; limit: number; plan: string }> {
  const org = await tx.organisation.findUnique({
    where: { id: orgId },
    select: { plan: true },
  });
  if (!org) throw new TeamError('NOT_FOUND', 'Organisation not found.');

  const members = await tx.orgMember.count({ where: { orgId } });
  const pendingInvites = await tx.orgInvite.count({
    where: {
      orgId,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  return {
    members,
    pendingInvites,
    limit: getTeamSeatLimit(org.plan),
    plan: org.plan,
  };
}

export class TeamError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly upgradeUrl?: string,
  ) {
    super(message);
    this.name = 'TeamError';
  }
}

export async function getTeamOverview(orgId: string, userId: string): Promise<{
  members: Array<{ userId: string; email: string; name: string | null; role: string; joinedAt: string }>;
  invites: Array<{ id: string; email: string; role: string; expiresAt: string; invitedByName: string | null }>;
  seats: { members: number; pendingInvites: number; limit: number; plan: string };
  canManage: boolean;
}> {
  return withUserRls(userId, async (tx) => {
    const membership = await tx.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId } },
      select: { role: true },
    });
    if (!membership) throw new TeamError('NOT_FOUND', 'Organisation not found.');

    const seats = await getTeamSeatUsage(tx, orgId);

    const members = await tx.orgMember.findMany({
      where: { orgId },
      include: { user: { select: { email: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const invites = await tx.orgInvite.findMany({
      where: { orgId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { inviter: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return {
      members: members.map((m) => ({
        userId: m.userId,
        email: m.user.email,
        name: m.user.name,
        role: m.role,
        joinedAt: m.createdAt.toISOString(),
      })),
      invites: invites.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        expiresAt: i.expiresAt.toISOString(),
        invitedByName: i.inviter.name,
      })),
      seats,
      canManage: roleCanManageInvites(membership.role),
    };
  });
}

export async function createTeamInvite(params: {
  orgId: string;
  inviterUserId: string;
  email: string;
  role: InvitableRole;
}): Promise<{ inviteId: string }> {
  const email = params.email.trim().toLowerCase();
  const token = generateInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const result = await withUserRls(params.inviterUserId, async (tx) => {
    const membership = await tx.orgMember.findUnique({
      where: { orgId_userId: { orgId: params.orgId, userId: params.inviterUserId } },
      select: { role: true },
    });
    if (!membership || !roleCanManageInvites(membership.role)) {
      throw new TeamError('FORBIDDEN', 'Only organisation owners and admins can invite team members.');
    }

    const org = await tx.organisation.findUnique({
      where: { id: params.orgId },
      select: { name: true, plan: true },
    });
    if (!org) throw new TeamError('NOT_FOUND', 'Organisation not found.');

    if (!planSupportsTeamInvites(org.plan)) {
      throw new TeamError(
        'PLAN_LIMIT_REACHED',
        'Team invitations require a Compass plan or higher.',
        '/dashboard/billing',
      );
    }

    const usage = await getTeamSeatUsage(tx, params.orgId);
    if (!canInviteMoreMembers({ ...usage, plan: org.plan as 'compass' })) {
      throw new TeamError(
        'SEAT_LIMIT_REACHED',
        'Your organisation has reached its seat limit.',
        '/dashboard/billing',
      );
    }

    const existingUser = await tx.user.findUnique({ where: { email }, select: { id: true } });
    if (existingUser) {
      const existingMember = await tx.orgMember.findUnique({
        where: { orgId_userId: { orgId: params.orgId, userId: existingUser.id } },
      });
      if (existingMember) {
        throw new TeamError('ALREADY_MEMBER', 'This person is already a member of your organisation.');
      }
    }

    await tx.orgInvite.updateMany({
      where: { orgId: params.orgId, email, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    const inviter = await tx.user.findUnique({
      where: { id: params.inviterUserId },
      select: { name: true, email: true },
    });

    const invite = await tx.orgInvite.create({
      data: {
        orgId: params.orgId,
        email,
        role: params.role,
        tokenHash,
        invitedBy: params.inviterUserId,
        expiresAt,
      },
    });

    return { invite, org, inviter, expiresAt };
  });

  void sendTeamInvitationEmail({
    to: email,
    inviteeEmail: email,
    inviterName: result.inviter?.name ?? result.inviter?.email ?? 'A team member',
    organisationName: result.org.name,
    role: params.role,
    inviteToken: token,
    expiresAt: result.expiresAt.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    idempotencyKey: `team-invite:${result.invite.id}`,
  }).catch((err: unknown) => {
    console.error('[teamService] invite email failed', err);
  });

  return { inviteId: result.invite.id };
}

export async function previewInvite(token: string): Promise<{
  organisationName: string;
  email: string;
  role: string;
  expiresAt: string;
  expired: boolean;
  revoked: boolean;
  accepted: boolean;
} | null> {
  const tokenHash = hashInviteToken(token);
  const invite = await prisma.orgInvite.findUnique({
    where: { tokenHash },
    include: { org: { select: { name: true } } },
  });
  if (!invite) return null;

  const now = new Date();
  return {
    organisationName: invite.org.name,
    email: invite.email,
    role: invite.role,
    expiresAt: invite.expiresAt.toISOString(),
    expired: invite.expiresAt <= now,
    revoked: invite.revokedAt !== null,
    accepted: invite.acceptedAt !== null,
  };
}

export async function acceptTeamInvite(params: {
  token: string;
  userId: string;
  userEmail: string;
}): Promise<{ orgId: string; orgName: string; role: string }> {
  const tokenHash = hashInviteToken(params.token);
  const email = params.userEmail.trim().toLowerCase();

  return withUserRls(params.userId, async (tx) => {
    const invite = await tx.orgInvite.findUnique({
      where: { tokenHash },
      include: { org: { select: { id: true, name: true } } },
    });

    if (!invite) throw new TeamError('NOT_FOUND', 'This invitation link is invalid.');
    if (invite.revokedAt) throw new TeamError('REVOKED', 'This invitation has been revoked.');
    if (invite.acceptedAt) throw new TeamError('ALREADY_ACCEPTED', 'This invitation has already been used.');
    if (invite.expiresAt <= new Date()) throw new TeamError('EXPIRED', 'This invitation has expired.');
    if (invite.email.toLowerCase() !== email) {
      throw new TeamError('EMAIL_MISMATCH', 'Sign in with the email address that received this invitation.');
    }

    const existing = await tx.orgMember.findUnique({
      where: { orgId_userId: { orgId: invite.orgId, userId: params.userId } },
    });
    if (existing) {
      await tx.orgInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
      return { orgId: invite.orgId, orgName: invite.org.name, role: existing.role };
    }

    const usage = await getTeamSeatUsage(tx, invite.orgId);
    if (countOccupiedSeats(usage.members, 0) >= usage.limit) {
      throw new TeamError('SEAT_LIMIT_REACHED', 'This organisation has no available seats.');
    }

    await tx.orgMember.create({
      data: { orgId: invite.orgId, userId: params.userId, role: invite.role },
    });
    await tx.orgInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
    await syncOrgSeatsUsed(tx, invite.orgId);

    return { orgId: invite.orgId, orgName: invite.org.name, role: invite.role };
  });
}

export async function revokeTeamInvite(params: {
  orgId: string;
  inviteId: string;
  actorUserId: string;
}): Promise<void> {
  await withUserRls(params.actorUserId, async (tx) => {
    const membership = await tx.orgMember.findUnique({
      where: { orgId_userId: { orgId: params.orgId, userId: params.actorUserId } },
      select: { role: true },
    });
    if (!membership || !roleCanManageInvites(membership.role)) {
      throw new TeamError('FORBIDDEN', 'Only organisation owners and admins can revoke invitations.');
    }

    const invite = await tx.orgInvite.findFirst({
      where: { id: params.inviteId, orgId: params.orgId, acceptedAt: null, revokedAt: null },
    });
    if (!invite) throw new TeamError('NOT_FOUND', 'Invitation not found.');

    await tx.orgInvite.update({ where: { id: invite.id }, data: { revokedAt: new Date() } });
  });
}

export async function removeTeamMember(params: {
  orgId: string;
  targetUserId: string;
  actorUserId: string;
}): Promise<void> {
  await withUserRls(params.actorUserId, async (tx) => {
    const actor = await tx.orgMember.findUnique({
      where: { orgId_userId: { orgId: params.orgId, userId: params.actorUserId } },
      select: { role: true },
    });
    if (!actor || !roleCanManageInvites(actor.role)) {
      throw new TeamError('FORBIDDEN', 'Only organisation owners and admins can remove members.');
    }

    const target = await tx.orgMember.findUnique({
      where: { orgId_userId: { orgId: params.orgId, userId: params.targetUserId } },
      select: { role: true },
    });
    if (!target) throw new TeamError('NOT_FOUND', 'Team member not found.');
    if (target.role === 'owner') {
      throw new TeamError('FORBIDDEN', 'The organisation owner cannot be removed.');
    }
    if (target.role === 'admin' && actor.role !== 'owner') {
      throw new TeamError('FORBIDDEN', 'Only the owner can remove an administrator.');
    }

    await tx.orgMember.delete({
      where: { orgId_userId: { orgId: params.orgId, userId: params.targetUserId } },
    });
    await syncOrgSeatsUsed(tx, params.orgId);
  });
}

/** Resolve org + update name during onboarding. */
export async function resolveOrgForOnboarding(params: {
  userId: string;
  email: string;
  orgName?: string;
}): Promise<{ orgId: string; isNewOrg: boolean; role: string }> {
  const existing = await prisma.orgMember.findFirst({
    where: { userId: params.userId },
    orderBy: { createdAt: 'asc' },
    select: { orgId: true, role: true },
  });

  if (existing) {
    if (existing.role === 'owner' && params.orgName?.trim()) {
      await prisma.organisation.update({
        where: { id: existing.orgId },
        data: { name: params.orgName.trim() },
      });
    }
    return { orgId: existing.orgId, isNewOrg: false, role: existing.role };
  }

  if (!params.orgName?.trim()) {
    throw new TeamError('VALIDATION_ERROR', 'Organisation name is required to claim ownership.');
  }

  const name = params.orgName.trim();

  const newOrg = await prisma.organisation.create({
    data: { name, ownerId: params.userId, plan: 'free', seatsUsed: 1 },
  });
  await prisma.orgMember.create({
    data: { orgId: newOrg.id, userId: params.userId, role: 'owner' },
  });

  return { orgId: newOrg.id, isNewOrg: true, role: 'owner' };
}

export async function userHasCompletedOnboarding(userId: string): Promise<boolean> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { userId: true },
  });
  return profile !== null;
}
