'use client';

/**
 * ARIPTrackerV2Client — 5-stage ARIP tracker using spec stage model.
 *
 * Spec stages (ARIP Framework, SEC Nigeria, June 2024):
 *   1. pre_screening       — Initial engagement with SEC
 *   2. initial_assessment  — SEC reviews application documents
 *   3. eligibility         — SEC issues eligibility determination
 *   4. aip                 — AIP Active — LIVE but restricted
 *   5. full_registration   — Full licence granted
 *
 * Key regulatory rules embedded:
 *   - Solicitor required before advancing to initial_assessment (Section 16)
 *   - Fidelity bond required before advancing to eligibility
 *   - AIP: max 50 customers, max NGN 2m/txn, max NGN 5m AUM/customer (Section 29)
 */

import { useState, useCallback } from 'react';
import Link from 'next/link';
import type { ARIPFullData } from './page';

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface Props {
  arip: ARIPFullData | null;
  checklist: ChecklistItem[];
  history: StageHistoryEntry[];
  accessToken: string;
}

// ── Stage config ──────────────────────────────────────────────────────────────

const STAGES = [
  {
    id: 'pre_screening',
    label: 'Pre-Screening',
    step: 1,
    description: 'Initial engagement with SEC Innovation Office before formal application.',
  },
  {
    id: 'initial_assessment',
    label: 'Initial Assessment',
    step: 2,
    description: 'SEC reviews your documents and determines suitability for the ARIP programme.',
  },
  {
    id: 'eligibility',
    label: 'Eligibility',
    step: 3,
    description: 'SEC issues an eligibility determination and you prepare the formal application package.',
  },
  {
    id: 'aip',
    label: 'AIP Active',
    step: 4,
    description: 'You are in the programme — operating under AIP restrictions.',
  },
  {
    id: 'full_registration',
    label: 'Full Registration',
    step: 5,
    description: 'Full SEC Nigeria digital asset licence granted.',
  },
] as const;

const STAGE_IDS = STAGES.map((s) => s.id);

function getStageIndex(id: string): number {
  return STAGE_IDS.indexOf(id as typeof STAGE_IDS[number]);
}

function daysInStage(enteredAt: string | null): number | null {
  if (!enteredAt) return null;
  const ms = Date.now() - new Date(enteredAt).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

// ── Saved toast ───────────────────────────────────────────────────────────────

function SavedToast({ show }: { show: boolean }): JSX.Element | null {
  if (!show) return null;
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
      Saved ✓
    </span>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function CapBar({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}): JSX.Element {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const colour = pct >= 100 ? '#C0392B' : pct >= 90 ? '#D4A843' : '#1A7A4A';
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-[#1A1A1A]">{label}</span>
        <span className="text-[#555555]">
          {value.toLocaleString()} / {max.toLocaleString()}
          {pct >= 100 && <span className="ml-2 text-xs font-bold text-red-600">[CAP REACHED]</span>}
          {pct >= 90 && pct < 100 && <span className="ml-2 text-xs font-semibold text-amber-600">[APPROACHING CAP]</span>}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-[#F5F5F5]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: colour }}
        />
      </div>
    </div>
  );
}

// ── Stage label map (for history) ─────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  pre_screening: 'Pre-Screening',
  initial_assessment: 'Initial Assessment',
  eligibility: 'Eligibility',
  aip: 'AIP Active',
  full_registration: 'Full Registration',
};

// ── Main client component ─────────────────────────────────────────────────────

export function ARIPTrackerV2Client({
  arip: initialArip,
  checklist: initialChecklist,
  history: initialHistory,
  accessToken,
}: Props): JSX.Element {
  const [arip, setArip] = useState<ARIPFullData | null>(initialArip);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initialChecklist);
  const [history, setHistory] = useState<StageHistoryEntry[]>(initialHistory);
  const [activeStage, setActiveStage] = useState<string>(
    initialArip?.current_stage ?? 'pre_screening',
  );
  const [toast, setToast] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Solicitor form state
  const [solicitorForm, setSolicitorForm] = useState({ name: '', firm: '', date: '' });
  const [savingSolicitor, setSavingSolicitor] = useState(false);
  const [solicitorError, setSolicitorError] = useState<string | null>(null);

  // Growth form state
  const [growthDeltaCustomers, setGrowthDeltaCustomers] = useState('');
  const [savingGrowth, setSavingGrowth] = useState(false);
  const [growthResult, setGrowthResult] = useState<{ warnings: string[] } | null>(null);

  const showToast = (): void => {
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  };

  const patchArip = useCallback(
    async (endpoint: string, body: unknown, method: 'PUT' | 'POST' = 'PUT'): Promise<boolean> => {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        return Promise.reject(new Error(err?.error ?? 'Request failed'));
      }
      return true;
    },
    [accessToken],
  );

  const createApplication = async (): Promise<void> => {
    setCreating(true);
    setCreateError(null);
    try {
      await fetch('/api/arip', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ current_stage: 'pre_screening', stage_status: 'not_started', licence_type: 'unknown' }),
      });
      setArip({
        current_stage: 'pre_screening',
        stage_entered_at: new Date().toISOString(),
        stage_status: 'not_started',
        aip_issued_date: null,
        aip_expiry_date: null,
        aip_days_remaining: null,
        aip_total_customers: 0,
        aip_max_customers: 50,
        solicitor_engaged: false,
        solicitor_name: null,
        solicitor_firm: null,
        solicitor_engaged_date: null,
        fidelity_bond_in_place: false,
        fidelity_bond_expiry: null,
        application_fee_paid: false,
        application_fee_amount_ngn: null,
        sec_reference_number: null,
      });
      setActiveStage('pre_screening');
    } catch (err) {
      console.error('[createApplication]', err);
      setCreateError('Could not start your ARIP application. Check API and try again.');
    } finally {
      setCreating(false);
    }
  };

  const advanceStage = async (): Promise<void> => {
    if (!arip) return;
    const fromIdx = getStageIndex(arip.current_stage);
    if (fromIdx >= STAGE_IDS.length - 1) return;
    const toStage = STAGE_IDS[fromIdx + 1] as string;

    setAdvancing(true);
    setAdvanceError(null);

    try {
      await patchArip('/api/arip/stage', { toStage });
      // Refresh data
      const res = await fetch('/api/arip', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = (await res.json()) as { success: boolean; data: ARIPFullData };
      if (json.success) {
        setArip(json.data);
        setActiveStage(toStage as string);
      }
      // Refresh history
      const histRes = await fetch('/api/arip/history', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const histJson = (await histRes.json()) as { success: boolean; data: StageHistoryEntry[] };
      if (histJson.success) setHistory(histJson.data);
      showToast();
    } catch (err) {
      setAdvanceError(err instanceof Error ? err.message : 'Failed to advance stage.');
    } finally {
      setAdvancing(false);
    }
  };

  const saveSolicitor = async (): Promise<void> => {
    if (!solicitorForm.name.trim() || !solicitorForm.firm.trim()) return;
    setSavingSolicitor(true);
    setSolicitorError(null);
    try {
      await patchArip('/api/arip/solicitor', {
        name: solicitorForm.name,
        firm: solicitorForm.firm,
        engagedDate: solicitorForm.date || undefined,
      });
      setArip((prev) =>
        prev
          ? {
              ...prev,
              solicitor_engaged: true,
              solicitor_name: solicitorForm.name,
              solicitor_firm: solicitorForm.firm,
            }
          : prev,
      );
      showToast();
    } catch (err) {
      setSolicitorError(err instanceof Error ? err.message : 'Failed to save solicitor.');
    } finally {
      setSavingSolicitor(false);
    }
  };

  const saveGrowth = async (): Promise<void> => {
    const delta = parseInt(growthDeltaCustomers, 10);
    if (isNaN(delta) || delta < 1) return;
    setSavingGrowth(true);
    try {
      const res = await fetch('/api/arip/growth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ deltaCustomers: delta }),
      });
      const json = (await res.json()) as { success: boolean; data: { warnings: string[]; newTotal: number } };
      if (json.success) {
        setGrowthResult({ warnings: json.data.warnings });
        setArip((prev) => prev ? { ...prev, aip_total_customers: json.data.newTotal } : prev);
        setGrowthDeltaCustomers('');
        showToast();
      }
    } catch (err) {
      console.error('[saveGrowth]', err);
    } finally {
      setSavingGrowth(false);
    }
  };

  const toggleChecklist = async (itemId: string, completed: boolean): Promise<void> => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, completed } : item)),
    );
    await fetch('/api/arip/checklist', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ itemId, completed }),
    }).catch(console.error);
  };

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!arip) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[#0B6E6E] bg-[#E6F4F4] p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl">
          📋
        </div>
        <h2 className="mb-2 text-xl font-semibold text-[#0B6E6E]">Start your ARIP journey</h2>
        <p className="mx-auto mb-6 max-w-md text-sm text-[#555555]">
          The SEC Nigeria ARIP programme is the pathway for digital asset businesses to operate
          legally in Nigeria. Track your 5-stage application from pre-screening to full registration.
        </p>
        <button
          onClick={() => { void createApplication(); }}
          disabled={creating}
          className="rounded-xl bg-[#0B6E6E] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#0D2B45] disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'Begin Pre-Screening →'}
        </button>
        {createError && <p className="mt-3 text-sm text-[#C0392B]">{createError}</p>}
      </div>
    );
  }

  const currentStageIdx = getStageIndex(arip.current_stage);
  const canAdvance = currentStageIdx >= 0 && currentStageIdx < STAGE_IDS.length - 1;
  const nextStage = canAdvance ? STAGE_IDS[currentStageIdx + 1] : null;
  const stageDays = daysInStage(arip.stage_entered_at);
  const activeChecklistItems = checklist.filter((c) => c.stage === activeStage);
  const activeCompletedCount = activeChecklistItems.filter((c) => c.completed).length;
  const completionPct =
    activeChecklistItems.length > 0
      ? Math.round((activeCompletedCount / activeChecklistItems.length) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <SavedToast show={toast} />

      {/* ── 5-Stage Stepper ── */}
      <div className="overflow-x-auto rounded-2xl border border-[#CCCCCC] bg-white p-6 shadow-sm">
        <div className="flex min-w-max items-start">
          {STAGES.map((stage, i) => {
            const isDone = i < currentStageIdx;
            const isActive = stage.id === arip.current_stage;
            const isFuture = i > currentStageIdx;

            return (
              <div key={stage.id} className="flex items-center">
                <button
                  onClick={() => setActiveStage(stage.id)}
                  className="flex flex-col items-center gap-1 px-2"
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition"
                    style={{
                      borderColor: isDone ? '#1A7A4A' : isActive ? '#0B6E6E' : '#CCCCCC',
                      backgroundColor: isDone ? '#1A7A4A' : isActive ? '#0B6E6E' : 'white',
                      color: isDone || isActive ? 'white' : '#CCCCCC',
                    }}
                  >
                    {isDone ? '✓' : stage.step}
                  </div>
                  <span
                    className="max-w-[90px] text-center text-[11px] font-medium leading-tight"
                    style={{ color: isActive ? '#0B6E6E' : isFuture ? '#CCCCCC' : '#1A1A1A' }}
                  >
                    {stage.label}
                  </span>
                  {isActive && stageDays !== null && (
                    <span className="text-[9px] text-[#555555]">{stageDays}d</span>
                  )}
                </button>
                {i < STAGES.length - 1 && (
                  <div
                    className="mx-1 mt-3.5 h-0.5 w-8 shrink-0 self-start"
                    style={{ backgroundColor: i < currentStageIdx ? '#1A7A4A' : '#CCCCCC' }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Stage description */}
        {STAGES.find((s) => s.id === arip.current_stage) && (
          <p className="mt-4 text-sm text-[#555555]">
            <strong className="font-semibold text-[#1A1A1A]">Current stage:</strong>{' '}
            {STAGES.find((s) => s.id === arip.current_stage)?.description}
          </p>
        )}
      </div>

      {/* ── Advance stage button + error ── */}
      {canAdvance && (
        <div className="rounded-xl border border-[#CCCCCC] bg-white px-5 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#555555]">
              Ready to advance to{' '}
              <strong>{STAGES.find((s) => s.id === nextStage)?.label}</strong>?
            </p>
            <button
              onClick={() => { void advanceStage(); }}
              disabled={advancing}
              className="rounded-lg bg-[#0B6E6E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0D2B45] disabled:opacity-50"
            >
              {advancing ? 'Advancing…' : `Advance to ${STAGES.find((s) => s.id === nextStage)?.label} →`}
            </button>
          </div>
          {advanceError && (
            <p className="mt-2 text-sm text-[#C0392B]">{advanceError}</p>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left: Stage Detail Panels ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* ── SOLICITOR BLOCKER — shows when pre_screening and solicitor not engaged ── */}
          {arip.current_stage === 'pre_screening' && !arip.solicitor_engaged && (
            <div className="rounded-xl border-2 border-red-400 bg-red-50 p-5">
              <p className="mb-1 text-sm font-bold text-red-700">
                ⛔ SOLICITOR REQUIRED BEFORE STAGE 2
              </p>
              <p className="mb-4 text-sm text-red-700">
                You cannot advance to Initial Assessment without formally engaging a qualified
                Nigerian solicitor or adviser. This is a regulatory requirement under Section 16
                of the ARIP Framework.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#1A1A1A]">
                    Solicitor / Adviser Name *
                  </label>
                  <input
                    type="text"
                    value={solicitorForm.name}
                    onChange={(e) => setSolicitorForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm focus:border-[#0B6E6E] focus:outline-none"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#1A1A1A]">
                    Law Firm / Advisory Firm *
                  </label>
                  <input
                    type="text"
                    value={solicitorForm.firm}
                    onChange={(e) => setSolicitorForm((p) => ({ ...p, firm: e.target.value }))}
                    className="w-full rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm focus:border-[#0B6E6E] focus:outline-none"
                    placeholder="Firm name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#1A1A1A]">
                    Date of Engagement
                  </label>
                  <input
                    type="date"
                    value={solicitorForm.date}
                    onChange={(e) => setSolicitorForm((p) => ({ ...p, date: e.target.value }))}
                    className="rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm focus:border-[#0B6E6E] focus:outline-none"
                  />
                </div>
                {solicitorError && <p className="text-xs text-red-600">{solicitorError}</p>}
                <button
                  onClick={() => { void saveSolicitor(); }}
                  disabled={!solicitorForm.name.trim() || !solicitorForm.firm.trim() || savingSolicitor}
                  className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {savingSolicitor ? 'Saving…' : 'Save Solicitor Details'}
                </button>
              </div>
            </div>
          )}

          {/* ── Solicitor confirmed state ── */}
          {arip.solicitor_engaged && arip.solicitor_name && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-3">
              <p className="text-sm font-semibold text-green-700">
                ✅ Solicitor engaged: {arip.solicitor_name}
                {arip.solicitor_firm && ` (${arip.solicitor_firm})`}
              </p>
            </div>
          )}

          {/* ── Stage-specific content ── */}
          {activeStage === 'pre_screening' && (
            <StagePanelShell title="Stage 1: Pre-Screening">
              <p className="mb-4 text-sm text-[#555555]">
                The first step is contacting the SEC Innovation Office to schedule a pre-screening
                meeting. This is informal — no formal application yet. Do not pay any fees at this stage.
              </p>
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                💡 Contact the Innovation Office by email first. Meetings are held Tuesdays and
                Thursdays 10am–2pm.
              </div>
              <div className="space-y-2 text-sm text-[#1A1A1A]">
                <p className="font-semibold">Pre-screening preparation checklist:</p>
                <ul className="list-inside list-disc space-y-1 pl-2 text-[#555555]">
                  <li>Product classified (DAX, DAOP, DAC, or DAI)</li>
                  <li>Legal opinion on classification obtained</li>
                  <li>Company registered with CAC (CAMA 2020)</li>
                  <li>NFIU goAML registration completed (MLPPA 2022)</li>
                  <li>Solicitor formally engaged (required for Stage 2)</li>
                </ul>
              </div>
            </StagePanelShell>
          )}

          {activeStage === 'initial_assessment' && (
            <StagePanelShell title="Stage 2: Initial Assessment">
              <p className="mb-4 text-sm text-[#555555]">
                Submit the Initial Assessment Form on the SEC ePortal. SEC reviews your documents
                and determines whether your product is suitable for the ARIP programme.
                Expected timeline: 30–60 days.
              </p>

              {/* Application fee */}
              <div className="mb-4 rounded-xl border border-[#CCCCCC] bg-white p-4">
                <h4 className="mb-2 text-sm font-semibold text-[#1A1A1A]">Processing Fee</h4>
                <p className="mb-1 text-xs text-[#555555]">
                  <strong>DAX/DAOP:</strong> NGN 100,000 &nbsp;|&nbsp;
                  <strong>DAC/DAI:</strong> NGN 50,000
                </p>
                <p className="mb-3 text-xs text-amber-700">
                  ⚠️ Non-refundable. Pay via REVOP only after receiving Stage 2 eligibility notification.
                </p>
                {arip.application_fee_paid ? (
                  <p className="text-sm font-semibold text-green-700">
                    ✅ Fee paid: NGN {(arip.application_fee_amount_ngn ?? 0).toLocaleString()}
                  </p>
                ) : (
                  <a
                    href="https://revop.gov.ng/payments/generate-bill?org=0220009001000"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-sm font-medium text-[#0B6E6E] underline underline-offset-2"
                  >
                    Pay via REVOP →
                  </a>
                )}
              </div>

              {arip.sec_reference_number && (
                <div className="rounded-lg border border-[#CCCCCC] px-4 py-3">
                  <p className="text-sm">
                    <strong>SEC Reference:</strong>{' '}
                    <span className="font-mono text-[#0B6E6E]">{arip.sec_reference_number}</span>
                  </p>
                </div>
              )}

              <a
                href="https://home.sec.gov.ng"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block rounded-lg bg-[#0B6E6E] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#0D2B45]"
              >
                Open SEC ePortal →
              </a>
            </StagePanelShell>
          )}

          {activeStage === 'eligibility' && (
            <StagePanelShell title="Stage 3: Eligibility">
              <p className="mb-4 text-sm text-[#555555]">
                If SEC determines you are eligible, you prepare the full formal application package.
                A fidelity bond is required before submitting.
              </p>

              {/* Fidelity bond status */}
              <div className="mb-4 rounded-xl border border-[#CCCCCC] bg-white p-4">
                <h4 className="mb-1 text-sm font-semibold text-[#1A1A1A]">
                  Fidelity Bond — Required Before Stage 4
                </h4>
                <p className="mb-3 text-xs text-[#555555]">
                  Minimum 25% of required shareholder fund, from a NAICOM-approved insurer.
                </p>
                {arip.fidelity_bond_in_place ? (
                  <p className="text-sm font-semibold text-green-700">
                    ✅ Bond in place
                    {arip.fidelity_bond_expiry && ` — expires ${arip.fidelity_bond_expiry}`}
                  </p>
                ) : (
                  <FidelityBondForm accessToken={accessToken} onSaved={() => {
                    setArip((prev) => prev ? { ...prev, fidelity_bond_in_place: true } : prev);
                    showToast();
                  }} />
                )}
              </div>

              {/* Document links */}
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-[#1A1A1A]">Documents to prepare:</p>
                <div className="space-y-1.5">
                  {[
                    { label: 'ARIP Operational Plan (mandatory exit plan)', template: 'ARIP_OPERATIONAL_PLAN' },
                    { label: 'Sworn Undertaking — fitness and propriety (Section 15a)', template: 'ARIP_SWORN_UNDERTAKING' },
                    { label: 'Sponsored Individual Profiles (min 4)', template: 'SPONSORED_INDIVIDUAL' },
                    { label: 'Entity Rules & Governance (Section 15c)', template: 'ARIP_ENTITY_RULES' },
                  ].map(({ label, template }) => (
                    <div key={template} className="flex items-center justify-between rounded-lg border border-[#CCCCCC] px-3 py-2">
                      <span className="text-xs text-[#1A1A1A]">{label}</span>
                      <Link
                        href={`/dashboard/compliance/documents/generate/${template}`}
                        className="text-xs font-medium text-[#0B6E6E] underline underline-offset-2"
                      >
                        Generate →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </StagePanelShell>
          )}

          {activeStage === 'aip' && (
            <StagePanelShell title="Stage 4: AIP Active">
              {/* AIP expiry countdown */}
              {arip.aip_expiry_date && (
                <div
                  className={`mb-4 rounded-lg border px-4 py-3 ${
                    (arip.aip_days_remaining ?? 0) < 30
                      ? 'border-red-200 bg-red-50'
                      : 'border-[#CCCCCC] bg-[#FAFAFA]'
                  }`}
                >
                  <p className={`text-sm font-semibold ${(arip.aip_days_remaining ?? 0) < 30 ? 'text-red-700' : 'text-[#1A1A1A]'}`}>
                    AIP expires:{' '}
                    {new Date(arip.aip_expiry_date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                    {arip.aip_days_remaining !== null && (
                      <span className="ml-2 font-normal">
                        ({arip.aip_days_remaining < 0
                          ? '⛔ EXPIRED'
                          : `${arip.aip_days_remaining} days remaining`})
                      </span>
                    )}
                  </p>
                  {(arip.aip_days_remaining ?? 0) < 30 && (arip.aip_days_remaining ?? 0) >= 0 && (
                    <p className="mt-1 text-xs text-red-600">
                      Consider requesting an AIP extension from SEC Nigeria before expiry.
                    </p>
                  )}
                </div>
              )}

              {/* Growth restrictions gauges — the most important AIP element */}
              <div className="mb-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-5">
                <h4 className="mb-3 text-sm font-bold text-[#1A1A1A]">
                  AIP Growth Restrictions — Section 29, ARIP Framework
                </h4>
                <CapBar
                  value={arip.aip_total_customers}
                  max={arip.aip_max_customers}
                  label="Total Customers"
                />
                <div className="mt-2 rounded-lg border border-[#CCCCCC] bg-white px-3 py-2 text-xs text-[#555555]">
                  <p><strong>Per-transaction cap:</strong> NGN 2,000,000 (Section 29d)</p>
                  <p className="mt-0.5"><strong>Per-customer AUM cap:</strong> NGN 5,000,000 (Section 29d)</p>
                </div>

                {/* Record growth event */}
                <div className="mt-4 border-t border-amber-200 pt-4">
                  <p className="mb-2 text-xs font-semibold text-[#1A1A1A]">Record customer additions:</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={growthDeltaCustomers}
                      onChange={(e) => setGrowthDeltaCustomers(e.target.value)}
                      placeholder="New customers added"
                      className="w-40 rounded-lg border border-[#CCCCCC] px-3 py-1.5 text-sm focus:border-[#0B6E6E] focus:outline-none"
                    />
                    <button
                      onClick={() => { void saveGrowth(); }}
                      disabled={!growthDeltaCustomers || savingGrowth}
                      className="rounded-lg bg-[#0B6E6E] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#0D2B45] disabled:opacity-50"
                    >
                      {savingGrowth ? 'Saving…' : 'Record'}
                    </button>
                  </div>
                  {growthResult?.warnings.map((w, i) => (
                    <p key={i} className="mt-2 text-xs font-semibold text-red-600">⛔ {w}</p>
                  ))}
                </div>
              </div>

              {/* AIP restrictions checklist */}
              <div className="rounded-xl border border-[#CCCCCC] bg-white p-4">
                <h4 className="mb-3 text-sm font-semibold text-[#1A1A1A]">
                  AIP Restrictions Compliance
                </h4>
                {[
                  { label: 'No promotional activities (Section 29b)', key: 'promo_ban' },
                  { label: 'No business outside approved operational plan (Section 29a)', key: 'scope_limit' },
                  { label: 'No misleading communications (Section 29c)', key: 'comms_limit' },
                  { label: 'Customer growth within 50-customer cap (Section 29d)', key: 'cap_limit' },
                ].map(({ label, key }) => (
                  <label key={key} className="mb-2 flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-[#CCCCCC] text-[#0B6E6E]"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </StagePanelShell>
          )}

          {activeStage === 'full_registration' && (
            <StagePanelShell title="Stage 5: Full Registration">
              <div className="mb-4 rounded-lg border border-green-300 bg-green-50 px-5 py-4">
                <p className="text-base font-bold text-green-700">
                  🎉 Congratulations on completing the ARIP journey!
                </p>
                <p className="mt-1 text-sm text-green-600">
                  You are now a fully registered digital asset operator in Nigeria under ISA 2025.
                </p>
              </div>
              <p className="mb-3 text-sm font-semibold text-[#1A1A1A]">Recommended next steps:</p>
              <ul className="list-inside list-disc space-y-1 text-sm text-[#555555]">
                <li>File annual returns with SEC Nigeria</li>
                <li>Continue monthly/quarterly reporting obligations</li>
                <li>Review and update BWRA annually (NFIU requirement)</li>
                <li>Maintain ongoing AML/CFT training programme</li>
              </ul>
            </StagePanelShell>
          )}
        </div>

        {/* ── Right: Document Checklist ── */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#CCCCCC] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#1A1A1A]">
                Stage Checklist
              </h3>
              <span className="rounded-full bg-[#E6F4F4] px-2 py-0.5 text-xs font-semibold text-[#0B6E6E]">
                {activeCompletedCount}/{activeChecklistItems.length} ({completionPct}%)
              </span>
            </div>

            {activeChecklistItems.length === 0 ? (
              <p className="text-sm text-[#555555]">No checklist items for this stage.</p>
            ) : (
              <ul className="space-y-3">
                {activeChecklistItems.map((item) => (
                  <li key={item.id} className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={(e) => void toggleChecklist(item.id, e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#CCCCCC] text-[#0B6E6E]"
                    />
                    <div>
                      <p className="text-xs text-[#1A1A1A]">
                        {item.label}
                        {item.required && (
                          <span className="ml-1 text-[#C0392B]">*</span>
                        )}
                      </p>
                      {item.note && (
                        <p className="mt-0.5 text-[10px] text-[#555555]">{item.note}</p>
                      )}
                      {item.regulatoryBasis && (
                        <p className="mt-0.5 font-mono text-[9px] text-[#0B6E6E]">
                          {item.regulatoryBasis}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[10px] text-[#CCCCCC]">* Required</p>
          </div>

          {/* Stage history timeline */}
          {history.length > 0 && (
            <div className="rounded-2xl border border-[#CCCCCC] bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-[#1A1A1A]">
                Stage History
              </h3>
              <ol className="relative space-y-4 border-l-2 border-[#E6F4F4] pl-4">
                {history.map((entry) => (
                  <li key={entry.id} className="relative">
                    <div className="absolute -left-[21px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#0B6E6E]">
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    </div>
                    <p className="text-xs font-semibold text-[#1A1A1A]">
                      {entry.fromStage
                        ? `${STAGE_LABELS[entry.fromStage] ?? entry.fromStage} → ${STAGE_LABELS[entry.toStage] ?? entry.toStage}`
                        : `Started: ${STAGE_LABELS[entry.toStage] ?? entry.toStage}`}
                    </p>
                    <p className="text-[10px] text-[#555555]">
                      {new Date(entry.transitionedAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    {entry.notes && (
                      <p className="mt-0.5 text-[10px] italic text-[#555555]">{entry.notes}</p>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>

      {/* Legal disclaimer — CLAUDE.md §16 Rule 1 */}
      <div className="rounded-lg border border-[#CCCCCC] bg-[#FAFAFA] px-4 py-3">
        <p className="text-xs italic text-[#555555]">
          This information is sourced from the ARIP Framework, SEC Nigeria (June 2024).
          Klarify provides regulatory information, not legal advice. Verify all requirements
          with your registered solicitor before submission.
        </p>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StagePanelShell({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="rounded-2xl border border-[#CCCCCC] bg-white p-6 shadow-sm">
      <h3 className="mb-5 text-lg font-semibold text-[#0D2B45]">{title}</h3>
      {children}
    </div>
  );
}

function FidelityBondForm({
  accessToken,
  onSaved,
}: {
  accessToken: string;
  onSaved: () => void;
}): JSX.Element {
  const [amountNgn, setAmountNgn] = useState('');
  const [expiry, setExpiry] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/arip/fidelity-bond', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          amountNgn: amountNgn ? parseFloat(amountNgn) : undefined,
          expiry: expiry || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to save bond');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving bond details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-[#1A1A1A]">Bond Amount (NGN)</label>
        <input
          type="number"
          min={0}
          value={amountNgn}
          onChange={(e) => setAmountNgn(e.target.value)}
          className="w-full rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm focus:border-[#0B6E6E] focus:outline-none"
          placeholder="e.g. 5000000"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-[#1A1A1A]">Bond Expiry Date</label>
        <input
          type="date"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
          className="rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm focus:border-[#0B6E6E] focus:outline-none"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        onClick={() => { void save(); }}
        disabled={saving}
        className="rounded-lg bg-[#0B6E6E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0D2B45] disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Record Bond In Place'}
      </button>
    </div>
  );
}
