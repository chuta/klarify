import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { loadPrimaryMembership, requireDashboardSession } from '@/lib/dashboardSession';
import { TeamClient } from './_client';

export const metadata: Metadata = {
  title: 'Team — Klarify',
  description: 'Invite colleagues and manage your organisation team on Klarify.',
};

export default async function TeamPage(): Promise<JSX.Element> {
  const { userId, accessToken } = await requireDashboardSession();
  const membership = await loadPrimaryMembership(userId);

  if (!membership) {
    redirect('/dashboard/onboarding');
  }

  return (
    <DashboardPageShell>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Team</h1>
        <p className="mt-1 text-sm text-[#555555]">
          Manage who has access to <strong>{membership.orgName}</strong> on Klarify.
        </p>
      </div>

      <TeamClient
        orgId={membership.orgId}
        orgName={membership.orgName}
        accessToken={accessToken}
        userRole={membership.role}
        plan={membership.plan}
      />
    </DashboardPageShell>
  );
}
