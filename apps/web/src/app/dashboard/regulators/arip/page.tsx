import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api';
import { ARIPTrackerClient } from './_client';

/**
 * /dashboard/regulators/arip — ARIP Application Tracker (server wrapper).
 *
 * Regulatory source: ARIP Framework, SEC Nigeria, June 2024
 *
 * Auth guard: redirects to /sign-in if not authenticated.
 * Fetches ARIP application data server-side, passes to client component.
 */

interface ARIPData {
  id?: string;
  current_stage: string;
  stage_status: string;
  aip_issued_date: string | null;
  aip_expiry_date: string | null;
  arip_entry_customer_count: number | null;
  current_customer_count: number | null;
  growth_cap_breached: boolean;
  // Stage-specific data
  solicitor_name?: string | null;
  solicitor_firm?: string | null;
  solicitor_email?: string | null;
  solicitor_engaged?: boolean;
  processing_fee_paid?: boolean;
  payment_date?: string | null;
  revop_reference?: string | null;
  fidelity_bond_in_place?: boolean;
  fidelity_bond_coverage_pct?: number | null;
  fidelity_bond_insurer?: string | null;
  fidelity_bond_expiry?: string | null;
  outcome?: string | null;
  notes?: Record<string, unknown>;
}

export default async function ARIPTrackerPage(): Promise<JSX.Element> {
  const supabase = createClient();
  // Parallelise the two auth reads — getUser is the slow one (network).
  const [userRes, sessionRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ]);
  const user = userRes.data.user;
  const session = sessionRes.data.session;
  if (userRes.error || !user || !session) redirect('/sign-in');

  const aripResult = await apiFetch<ARIPData>('/api/arip', session.access_token);
  const arip: ARIPData | null = aripResult.success ? aripResult.data : null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">
          ARIP Application Tracker
        </h1>
        <p className="mt-1 text-sm text-[#555555]">
          Track your SEC Nigeria Accelerated Regulatory Incubation Programme application
          from Initial Assessment to full registration.
        </p>
        <p className="mt-1 text-xs italic text-[#CCCCCC]">
          Based on ARIP Framework, SEC Nigeria, June 2024
        </p>
      </div>

      {/* Quick-access contacts bar */}
      <div className="mb-8 flex flex-wrap items-center gap-4 rounded-xl border border-[#CCCCCC] bg-[#FAFAFA] px-5 py-3 text-xs text-[#555555]">
        <span className="font-semibold text-[#1A1A1A]">SEC Innovation Office:</span>
        <a href="mailto:innovation@sec.gov.ng" className="hover:text-[#0B6E6E]">
          📧 innovation@sec.gov.ng
        </a>
        <a href="mailto:fintech@sec.gov.ng" className="hover:text-[#0B6E6E]">
          📧 fintech@sec.gov.ng
        </a>
        <span>🕐 Tue &amp; Thu, 10am–2pm</span>
        <a
          href="https://home.sec.gov.ng"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[#0B6E6E] hover:underline"
        >
          🔗 SEC ePortal
        </a>
      </div>

      {/* Legal disclaimer — mandatory per CLAUDE.md §16 */}
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs text-amber-800">
          This information is sourced from the ARIP Framework, SEC Nigeria (June 2024).
          Klarify provides regulatory information, not legal advice. Verify all requirements
          with your registered solicitor before submission.
        </p>
      </div>

      <ARIPTrackerClient arip={arip} accessToken={session.access_token} />
    </div>
  );
}
