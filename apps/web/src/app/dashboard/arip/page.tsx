import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api';
import { ARIPTrackerV2Client } from './_client';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { SecInnovationContacts } from '@/components/arip/SecInnovationContacts';

/**
 * /dashboard/arip — ARIP Application Tracker (spec stage model).
 *
 * Uses the 5-stage spec model introduced in Sprint 5-B1:
 *   pre_screening → initial_assessment → eligibility → aip → full_registration
 *
 * Regulatory source: ARIP Framework, SEC Nigeria, June 2024.
 * Plan gate: Compass+ only (arip_tracker feature).
 */

export interface ARIPFullData {
  id?: string;
  current_stage: string;
  stage_entered_at: string | null;
  stage_status: string;
  aip_issued_date: string | null;
  aip_expiry_date: string | null;
  aip_days_remaining: number | null;
  aip_total_customers: number;
  aip_max_customers: number;
  solicitor_engaged: boolean;
  solicitor_name: string | null;
  solicitor_firm: string | null;
  solicitor_engaged_date: string | null;
  fidelity_bond_in_place: boolean;
  fidelity_bond_expiry: string | null;
  application_fee_paid: boolean;
  application_fee_amount_ngn: number | null;
  sec_reference_number: string | null;
}

interface ChecklistItem {
  id: string;
  label: string;
  stage: string;
  required: boolean;
  completed: boolean;
  note?: string;
  regulatoryBasis?: string;
}

interface StageHistoryEntry {
  id: string;
  fromStage: string | null;
  toStage: string;
  notes: string | null;
  transitionedAt: string;
}

export default async function ARIPTrackerPage(): Promise<JSX.Element> {
  const supabase = createClient();
  const [userRes, sessionRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ]);
  const user = userRes.data.user;
  const session = sessionRes.data.session;
  if (!user || !session) redirect('/sign-in');

  const token = session.access_token;

  // Parallelise all fetches
  const [aripRes, checklistRes, historyRes] = await Promise.all([
    apiFetch<ARIPFullData>('/api/arip', token),
    apiFetch<ChecklistItem[]>('/api/arip/checklist', token),
    apiFetch<StageHistoryEntry[]>('/api/arip/history', token),
  ]);

  const arip: ARIPFullData | null = aripRes.success ? aripRes.data : null;
  const checklist: ChecklistItem[] = checklistRes.success ? checklistRes.data : [];
  const history: StageHistoryEntry[] = historyRes.success ? historyRes.data : [];

  return (
    <DashboardPageShell>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">
          ARIP Application Tracker
        </h1>
        <p className="mt-1 text-sm text-[#555555]">
          Track your SEC Nigeria Accelerated Regulatory Incubation Programme
          application from Pre-Screening to Full Registration.
        </p>
        <p className="mt-1 text-xs italic text-[#CCCCCC]">
          Based on ARIP Framework, SEC Nigeria, June 2024
        </p>
      </div>

      <SecInnovationContacts />

      {/* Legal disclaimer — CLAUDE.md §16 Rule 1 — must never be removed */}
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs text-amber-800">
          <strong>Regulatory information only, not legal advice.</strong>{' '}
          Klarify provides regulatory guidance sourced from the ARIP Framework (SEC Nigeria, June 2024).
          Verify all requirements with your registered solicitor before submission.
        </p>
      </div>

      <ARIPTrackerV2Client
        arip={arip}
        checklist={checklist}
        history={history}
        accessToken={token}
      />
    </DashboardPageShell>
  );
}
