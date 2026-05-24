'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatInvitableRole, type InvitableRole } from '@klarify/core';

export interface TeamMember {
  userId: string;
  email: string;
  name: string | null;
  role: string;
  joinedAt: string;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  invitedByName: string | null;
}

export interface TeamOverview {
  members: TeamMember[];
  invites: PendingInvite[];
  seats: { members: number; pendingInvites: number; limit: number; plan: string };
  canManage: boolean;
}

interface TeamClientProps {
  orgId: string;
  orgName: string;
  accessToken: string;
  userRole: string;
  plan: string;
}

const ROLE_OPTIONS: InvitableRole[] = ['admin', 'member', 'viewer'];

function formatRole(role: string): string {
  if (role === 'owner') return 'Owner';
  if (ROLE_OPTIONS.includes(role as InvitableRole)) {
    return formatInvitableRole(role as InvitableRole);
  }
  return role;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function TeamClient({
  orgId,
  orgName,
  accessToken,
  userRole,
  plan,
}: TeamClientProps): JSX.Element {
  const [overview, setOverview] = useState<TeamOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InvitableRole>('member');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadTeam = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/org/${orgId}/team`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json: { success: boolean; data?: TeamOverview; error?: string; code?: string; upgradeUrl?: string } =
        await res.json();
      if (!json.success || !json.data) {
        if (json.code === 'PLAN_LIMIT_REACHED') {
          setError('upgrade');
        } else {
          setError(json.error ?? 'Failed to load team.');
        }
        return;
      }
      setOverview(json.data);
    } catch {
      setError('Failed to load team.');
    } finally {
      setLoading(false);
    }
  }, [orgId, accessToken]);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  async function handleInvite(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);
    setInviting(true);

    try {
      const res = await fetch(`/api/org/${orgId}/team`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const json: { success: boolean; error?: string; code?: string } = await res.json();
      if (!json.success) {
        setInviteError(json.error ?? 'Failed to send invitation.');
        await loadTeam();
        return;
      }
      setInviteEmail('');
      setInviteSuccess(`Invitation sent to ${inviteEmail.trim()}.`);
      await loadTeam();
    } catch {
      setInviteError('Failed to send invitation.');
    } finally {
      setInviting(false);
    }
  }

  async function revokeInvite(inviteId: string): Promise<void> {
    setActionId(inviteId);
    try {
      await fetch(`/api/org/${orgId}/invites/${inviteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      await loadTeam();
    } finally {
      setActionId(null);
    }
  }

  async function removeMember(userId: string): Promise<void> {
    if (!window.confirm('Remove this team member from your organisation?')) return;
    setActionId(userId);
    try {
      await fetch(`/api/org/${orgId}/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      await loadTeam();
    } finally {
      setActionId(null);
    }
  }

  const seatsUsed = overview
    ? overview.seats.members + overview.seats.pendingInvites
    : 0;
  const seatLimit = overview?.seats.limit ?? 1;
  const canInvite = overview?.canManage && seatLimit > 1;

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#CCCCCC] bg-white p-8 text-center text-sm text-[#555555]">
        Loading team…
      </div>
    );
  }

  if (error === 'upgrade') {
    return (
      <div className="rounded-2xl border border-[#D4A843]/40 bg-[#FDF6E3] p-8">
        <h2 className="text-lg font-semibold text-[#1A1A1A]">Team seats require Compass</h2>
        <p className="mt-2 text-sm text-[#555555]">
          Invite colleagues to {orgName} with shared access to your Readiness Score, roadmap, and
          compliance documents. Available on Compass (5 seats) and Flagship (unlimited).
        </p>
        <Link
          href="/dashboard/billing?plan=compass"
          className="mt-4 inline-block rounded-lg bg-[#0B6E6E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0D2B45]"
        >
          Upgrade to Compass →
        </Link>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error ?? 'Something went wrong.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seat usage */}
      <section className="rounded-2xl border border-[#CCCCCC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#1A1A1A]">Seat usage</h2>
            <p className="mt-1 text-sm text-[#555555]">
              {seatsUsed} of {seatLimit === Number.MAX_SAFE_INTEGER ? '∞' : seatLimit} seats used
              {overview.seats.pendingInvites > 0 && (
                <span> ({overview.seats.pendingInvites} pending invite{overview.seats.pendingInvites === 1 ? '' : 's'})</span>
              )}
            </p>
          </div>
          <span className="inline-flex rounded-full bg-[#E6F4F4] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#0B6E6E]">
            {plan} plan
          </span>
        </div>
        {seatLimit > 1 && seatLimit < Number.MAX_SAFE_INTEGER && (
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#F5F5F5]">
            <div
              className="h-full rounded-full bg-[#0B6E6E] transition-all"
              style={{ width: `${Math.min(100, (seatsUsed / seatLimit) * 100)}%` }}
            />
          </div>
        )}
      </section>

      {/* Invite form */}
      {canInvite && (
        <section className="rounded-2xl border border-[#CCCCCC] bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-[#1A1A1A]">Invite a team member</h2>
          <p className="mb-4 text-sm text-[#555555]">
            They&apos;ll receive an email with a secure link. Invitations expire after 7 days.
          </p>

          {inviteSuccess && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {inviteSuccess}
            </div>
          )}
          {inviteError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {inviteError}
            </div>
          )}

          <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="invite_email" className="mb-1 block text-xs font-medium text-[#555555]">
                Email address
              </label>
              <input
                id="invite_email"
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="w-full rounded-lg border border-[#CCCCCC] px-4 py-2.5 text-sm focus:border-[#0B6E6E] focus:outline-none focus:ring-2 focus:ring-[#0B6E6E]/20"
              />
            </div>
            <div className="sm:w-44">
              <label htmlFor="invite_role" className="mb-1 block text-xs font-medium text-[#555555]">
                Role
              </label>
              <select
                id="invite_role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as InvitableRole)}
                className="w-full rounded-lg border border-[#CCCCCC] px-3 py-2.5 text-sm focus:border-[#0B6E6E] focus:outline-none"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {formatInvitableRole(r)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={inviting || seatsUsed >= seatLimit}
              className="rounded-lg bg-[#0B6E6E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0D2B45] disabled:opacity-50"
            >
              {inviting ? 'Sending…' : 'Send invite'}
            </button>
          </form>
        </section>
      )}

      {!canInvite && (userRole === 'owner' || userRole === 'admin') && seatLimit <= 1 && (
        <div className="rounded-2xl border border-[#D4A843]/40 bg-[#FDF6E3] p-6">
          <h2 className="text-base font-semibold text-[#1A1A1A]">Invite your compliance team</h2>
          <p className="mt-2 text-sm text-[#555555]">
            Add colleagues with shared access to your Readiness Score, roadmap, and documents.
            Team seats are included on Compass (5 seats) and Flagship (unlimited).
          </p>
          <Link
            href="/dashboard/billing?plan=compass"
            className="mt-4 inline-block rounded-lg bg-[#0B6E6E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0D2B45]"
          >
            Upgrade to Compass →
          </Link>
        </div>
      )}

      {!canInvite && userRole !== 'owner' && userRole !== 'admin' && seatLimit > 1 && (
        <p className="text-sm text-[#555555]">
          Only organisation owners and administrators can invite team members.
        </p>
      )}

      {/* Members */}
      <section className="rounded-2xl border border-[#CCCCCC] bg-white shadow-sm overflow-hidden">
        <div className="border-b border-[#F5F5F5] px-6 py-4">
          <h2 className="text-base font-semibold text-[#1A1A1A]">Members ({overview.members.length})</h2>
        </div>
        <ul className="divide-y divide-[#F5F5F5]">
          {overview.members.map((member) => (
            <li key={member.userId} className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#1A1A1A]">
                  {member.name ?? member.email}
                </p>
                {member.name && (
                  <p className="truncate text-xs text-[#555555]">{member.email}</p>
                )}
                <p className="mt-0.5 text-xs text-[#CCCCCC]">Joined {formatDate(member.joinedAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#E8EEF4] px-2.5 py-0.5 text-xs font-medium text-[#0D2B45]">
                  {formatRole(member.role)}
                </span>
                {overview.canManage && member.role !== 'owner' && (
                  <button
                    type="button"
                    disabled={actionId === member.userId}
                    onClick={() => void removeMember(member.userId)}
                    className="text-xs text-red-600 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Pending invites */}
      {overview.invites.length > 0 && (
        <section className="rounded-2xl border border-[#CCCCCC] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#F5F5F5] px-6 py-4">
            <h2 className="text-base font-semibold text-[#1A1A1A]">
              Pending invitations ({overview.invites.length})
            </h2>
          </div>
          <ul className="divide-y divide-[#F5F5F5]">
            {overview.invites.map((invite) => (
              <li key={invite.id} className="flex items-center justify-between gap-4 px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-[#1A1A1A]">{invite.email}</p>
                  <p className="text-xs text-[#555555]">
                    {formatRole(invite.role)} · Expires {formatDate(invite.expiresAt)}
                  </p>
                </div>
                {overview.canManage && (
                  <button
                    type="button"
                    disabled={actionId === invite.id}
                    onClick={() => void revokeInvite(invite.id)}
                    className="text-xs text-[#555555] hover:text-red-600 hover:underline disabled:opacity-50"
                  >
                    Revoke
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
