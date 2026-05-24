import Link from 'next/link';
import { OnboardingWizard } from '@/app/onboarding/_wizard';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { loadOnboardingWizardProps, requireDashboardSession } from '@/lib/dashboardSession';

/**
 * /dashboard/onboarding — setup wizard inside the dashboard shell.
 * Owners name their org on step 1; invited members skip that step.
 */
export default async function DashboardOnboardingPage(): Promise<JSX.Element> {
  const { userId } = await requireDashboardSession();
  const wizardProps = await loadOnboardingWizardProps(userId);

  const stepCount = wizardProps.skipOrgStep ? 5 : 6;

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
              {wizardProps.skipOrgStep
                ? 'Complete your compliance profile'
                : 'Claim your organisation & calculate your Readiness Score'}
            </h1>
            <p className="mt-1 text-sm text-[#555555]">
              {wizardProps.skipOrgStep
                ? `Answer ${stepCount} quick questions to personalise your roadmap for ${wizardProps.invitedOrgName ?? 'your team'}.`
                : `Name your organisation and answer ${stepCount - 1} questions about your product. Takes about 3 minutes.`}
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
          <svg
            className="h-4 w-4 shrink-0 text-[#0B6E6E]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-xs text-[#0B6E6E]">
            {wizardProps.skipOrgStep
              ? 'Your team owner manages billing and org settings. You can update your product profile any time.'
              : 'Completing setup makes you the organisation owner with full access to billing, team invites, and document exports.'}
          </p>
        </div>
      </div>

      <OnboardingWizard {...wizardProps} />
    </DashboardPageShell>
  );
}
