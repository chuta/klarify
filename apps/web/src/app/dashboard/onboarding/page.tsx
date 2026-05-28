import Link from 'next/link';
import { redirect } from 'next/navigation';
import { OnboardingWizard } from '@/app/onboarding/_wizard';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { requireDashboardSession } from '@/lib/dashboardSession';
import { resolveUserSetupState } from '@/lib/teamService';
import { Info } from '@/components/icons';

/**
 * /dashboard/onboarding — setup wizard for organisation owners only.
 * Invited team members are routed to /dashboard/welcome or /dashboard/join-team.
 */
export default async function DashboardOnboardingPage(): Promise<JSX.Element> {
  const { userId, email } = await requireDashboardSession();
  const setup = await resolveUserSetupState(userId, email);

  if (setup.kind === 'complete') {
    redirect('/dashboard');
  }

  if (setup.kind === 'team_member') {
    redirect('/dashboard/welcome');
  }

  if (setup.kind === 'pending_invite') {
    redirect(setup.redirect);
  }

  const membership = setup.membership;
  if (membership && membership.role !== 'owner') {
    redirect('/dashboard/welcome');
  }

  const wizardProps = {
    skipOrgStep: false,
    defaultOrgName: membership?.role === 'owner' ? membership.orgName : '',
    invitedOrgName: undefined as string | undefined,
  };

  return (
    <DashboardPageShell>
      <div className="mb-8">
        <div className="mb-1 flex items-center gap-2 text-xs text-[#CCCCCC]">
          <span>Setup</span>
          <span>/</span>
          <span className="text-[#0B6E6E]">Regulatory Readiness Score</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">
              Claim your organisation & calculate your Readiness Score
            </h1>
            <p className="mt-1 text-sm text-[#555555]">
              Name your organisation and answer 5 questions about your product. Takes about 3 minutes.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="mt-1 shrink-0 rounded-lg border border-[#CCCCCC] px-4 py-2 text-xs font-medium text-[#555555] transition hover:border-[#0B6E6E] hover:text-[#0B6E6E]"
          >
            Skip for now
          </Link>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#E6F4F4] bg-[#E6F4F4] px-4 py-3">
          <Info className="shrink-0 text-[#0B6E6E]" />
          <p className="text-xs text-[#0B6E6E]">
            Completing setup makes you the organisation owner with full access to billing, team invites, and document exports.
          </p>
        </div>
      </div>

      <OnboardingWizard {...wizardProps} />
    </DashboardPageShell>
  );
}
