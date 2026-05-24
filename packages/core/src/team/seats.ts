import type { Plan } from '../types/subscription.js';
import { PLAN_LIMITS } from '../types/subscription.js';

/** Roles that can be assigned via team invite (never owner). */
export const INVITABLE_ROLES = ['admin', 'member', 'viewer'] as const;
export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export interface TeamSeatUsage {
  members: number;
  pendingInvites: number;
  limit: number;
  plan: Plan;
}

/** Total occupied seats = active members + outstanding (non-expired) invites. */
export function countOccupiedSeats(members: number, pendingInvites: number): number {
  return members + pendingInvites;
}

export function getTeamSeatLimit(plan: string): number {
  const key = plan as Plan;
  const limit = PLAN_LIMITS[key]?.team_seats ?? PLAN_LIMITS.free.team_seats;
  return limit === Infinity ? Number.MAX_SAFE_INTEGER : limit;
}

export function canInviteMoreMembers(usage: TeamSeatUsage): boolean {
  if (usage.limit <= 1) return false;
  return countOccupiedSeats(usage.members, usage.pendingInvites) < usage.limit;
}

export function minimumPlanForTeamInvites(): Plan {
  return 'compass';
}

export function planSupportsTeamInvites(plan: string): boolean {
  return getTeamSeatLimit(plan) > 1;
}

export function roleCanManageTeam(role: string): boolean {
  return role === 'owner' || role === 'admin';
}

export function roleCanManageInvites(role: string): boolean {
  return role === 'owner' || role === 'admin';
}

export function formatInvitableRole(role: InvitableRole): string {
  const labels: Record<InvitableRole, string> = {
    admin: 'Administrator',
    member: 'Team member',
    viewer: 'Viewer (read-only)',
  };
  return labels[role];
}
