import { redirect } from 'next/navigation';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { requireDashboardSession } from '@/lib/dashboardSession';
import { getPendingInviteForUser, resolveUserSetupState } from '@/lib/teamService';
import { prisma } from '@/lib/db';
import { JoinTeamClient } from './_client';

interface JoinTeamPageProps {
  searchParams: { invite?: string };
}

/**
 * /dashboard/join-team — authenticated users with a pending org invite accept here
 * instead of the owner onboarding wizard.
 */
export default async function JoinTeamPage({
  searchParams,
}: JoinTeamPageProps): Promise<JSX.Element> {
  const { userId, email } = await requireDashboardSession();
  const setup = await resolveUserSetupState(userId, email);

  if (setup.kind === 'complete' || setup.kind === 'team_member') {
    redirect(setup.kind === 'team_member' ? '/dashboard/welcome' : '/dashboard');
  }

  if (setup.kind === 'owner_setup') {
    redirect('/dashboard/onboarding');
  }

  const inviteId = searchParams.invite;
  let invite = inviteId
    ? await prisma.orgInvite.findFirst({
        where: {
          id: inviteId,
          email: { equals: email, mode: 'insensitive' },
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        include: { org: { select: { name: true } } },
      })
    : null;

  if (!invite) {
    const fallback = await getPendingInviteForUser(email);
    if (!fallback) redirect('/dashboard/onboarding');
    invite = await prisma.orgInvite.findUnique({
      where: { id: fallback.inviteId },
      include: { org: { select: { name: true } } },
    });
  }

  if (!invite) redirect('/dashboard/onboarding');

  return (
    <DashboardPageShell>
      <JoinTeamClient
        inviteId={invite.id}
        organisationName={invite.org.name}
        role={invite.role}
        invitedEmail={invite.email}
        userEmail={email}
      />
    </DashboardPageShell>
  );
}
