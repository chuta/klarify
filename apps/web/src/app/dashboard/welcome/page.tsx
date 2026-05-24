import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { requireDashboardSession, loadPrimaryMembership } from '@/lib/dashboardSession';
import { resolveUserSetupState } from '@/lib/teamService';

function formatRole(role: string): string {
  const map: Record<string, string> = {
    admin: 'Administrator',
    member: 'Team member',
    viewer: 'Viewer (read-only)',
    owner: 'Organisation owner',
  };
  return map[role] ?? role;
}

/**
 * /dashboard/welcome — greeting for invited team members after they join an org.
 * Organisation owners use /dashboard/onboarding instead.
 */
export default async function TeamWelcomePage(): Promise<JSX.Element> {
  const { userId, email } = await requireDashboardSession();
  const setup = await resolveUserSetupState(userId, email);

  if (setup.kind === 'owner_setup') {
    redirect('/dashboard/onboarding');
  }

  if (setup.kind === 'pending_invite') {
    redirect(setup.redirect);
  }

  const membership = await loadPrimaryMembership(userId);
  if (!membership || membership.role === 'owner') {
    redirect('/dashboard');
  }

  return (
    <DashboardPageShell>
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-[#CCCCCC] bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#E6F4F4]">
            <svg
              className="h-8 w-8 text-[#0B6E6E]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>

          <p className="text-xs font-semibold uppercase tracking-widest text-[#0B6E6E]">
            Welcome to Klarify
          </p>
          <h1 className="mt-2 text-2xl font-bold text-[#1A1A1A]">
            You&apos;re on the {membership.orgName} team
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#555555]">
            You&apos;ve joined as a <strong>{formatRole(membership.role)}</strong>.
            Your dashboard shows this organisation&apos;s compliance data, roadmap,
            and documents — scoped to what your role allows.
          </p>

          <div className="mt-8 space-y-3 text-left rounded-xl border border-[#E6F4F4] bg-[#FAFAFA] px-4 py-4 text-sm text-[#555555]">
            <p>
              <span className="font-medium text-[#1A1A1A]">Organisation:</span>{' '}
              {membership.orgName}
            </p>
            <p>
              <span className="font-medium text-[#1A1A1A]">Your access:</span>{' '}
              {formatRole(membership.role)}
            </p>
            <p>
              <span className="font-medium text-[#1A1A1A]">Plan:</span>{' '}
              {membership.plan.charAt(0).toUpperCase() + membership.plan.slice(1)}
            </p>
          </div>

          <Link
            href="/dashboard"
            className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-[#0B6E6E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0D2B45]"
          >
            Go to dashboard →
          </Link>

          <p className="mt-4 text-xs text-[#CCCCCC]">
            Billing and team invites are managed by your organisation owner.
          </p>
        </div>
      </div>
    </DashboardPageShell>
  );
}
