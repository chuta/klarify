import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { ReadinessReassessmentWizard } from '@/components/compliance/ReadinessReassessmentWizard';
import { requireDashboardSession } from '@/lib/dashboardSession';
import { prisma, resolveOrgId } from '@/lib/db';

/**
 * /dashboard/readiness-assessment — re-run infrastructure checklist to rebuild
 * the Readiness Score (Post-Letter founders and anyone with a stale/zero score).
 */
export default async function ReadinessAssessmentPage(): Promise<JSX.Element> {
  const { userId } = await requireDashboardSession();
  const orgId = await resolveOrgId(userId);
  if (orgId === null) {
    redirect('/dashboard/onboarding');
  }

  const owner = await prisma.orgMember.findFirst({
    where: { orgId, role: 'owner' },
    select: { userId: true },
  });
  const profileUserId = owner?.userId ?? userId;

  const profile = await prisma.userProfile.findUnique({
    where: { userId: profileUserId },
    select: {
      stage: true,
      teamSize: true,
      hasComplianceOfficer: true,
      existingInfrastructure: true,
    },
  });

  if (profile === null) {
    redirect('/dashboard/onboarding');
  }

  const defaults = {
    stage: profile.stage ?? 'building',
    team_size: profile.teamSize ?? 1,
    has_compliance_officer: profile.hasComplianceOfficer ?? false,
    existing_infrastructure: profile.existingInfrastructure ?? [],
  };

  return (
    <DashboardPageShell>
      <div className="mb-8">
        <div className="mb-1 flex items-center gap-2 text-xs text-[#CCCCCC]">
          <Link href="/dashboard" className="hover:text-[#0B6E6E]">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-[#0B6E6E]">Re-assess infrastructure</span>
        </div>

        <h1 className="text-2xl font-bold text-[#1A1A1A]">Re-assess my infrastructure</h1>
        <p className="mt-1 max-w-2xl text-sm text-[#555555]">
          Update what compliance infrastructure you have in place. Your Readiness Score will be
          recalculated from your answers plus any roadmap tasks you&apos;ve completed.
        </p>

        <div className="mt-4 rounded-xl border border-[#D4A843]/50 bg-[#FDF6E3] px-4 py-3">
          <p className="text-sm font-semibold text-[#1A1A1A]">Received a regulator letter?</p>
          <p className="mt-0.5 text-xs text-[#555555]">
            Analysing a letter in FounderCounsel does not change your compliance score. Use this
            flow to refresh your baseline after you&apos;ve acted on your action plan.
          </p>
        </div>
      </div>

      <ReadinessReassessmentWizard defaults={defaults} />
    </DashboardPageShell>
  );
}
