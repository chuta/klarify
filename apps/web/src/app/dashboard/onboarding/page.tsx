import Link from 'next/link';
import { OnboardingWizard } from '@/app/onboarding/_wizard';

/**
 * /dashboard/onboarding — 5-step setup wizard rendered inside the dashboard
 * shell so the user has full sidebar navigation and is never trapped in an
 * isolated flow.
 *
 * Auth guard is handled by the parent dashboard layout.
 * The wizard is intentionally always accessible — it is idempotent (upserts
 * the profile) so users can revisit it to update their product type or stage.
 * The wizard submits to the Server Action at app/onboarding/actions.ts which
 * redirects to /dashboard on completion.
 */
export default function DashboardOnboardingPage(): JSX.Element {
  return (
    <div className="max-w-5xl mx-auto">
      {/* ── Page header ── */}
      <div className="mb-8">
        <div className="mb-1 flex items-center gap-2 text-xs text-[#CCCCCC]">
          <span>Setup</span>
          <span>/</span>
          <span className="text-[#0B6E6E]">Regulatory Readiness Score</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">
              Let&apos;s calculate your Readiness Score
            </h1>
            <p className="mt-1 text-sm text-[#555555]">
              Answer 5 quick questions to get an instant compliance gap analysis calibrated to
              Nigerian and African regulatory requirements.
            </p>
          </div>

          {/* Skip link — allows navigation away without completing */}
          <Link
            href="/dashboard"
            className="mt-1 shrink-0 rounded-lg border border-[#CCCCCC] px-4 py-2 text-xs font-medium text-[#555555] transition hover:border-[#0B6E6E] hover:text-[#0B6E6E]"
          >
            Skip for now
          </Link>
        </div>

        {/* Progress hint */}
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
            Takes less than 3 minutes. Your answers seed your personalised compliance roadmap and
            live Readiness Score — you can update them any time from your profile.
          </p>
        </div>
      </div>

      {/* ── Wizard ── */}
      <OnboardingWizard />
    </div>
  );
}
