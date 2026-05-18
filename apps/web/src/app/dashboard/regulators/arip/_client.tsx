'use client';

/**
 * ARIPTrackerClient — interactive 5-stage ARIP tracker.
 *
 * Regulatory source: ARIP Framework, SEC Nigeria, June 2024
 * 5-stage model (NOT the old 7-stage model):
 *   Stage 1: Initial Assessment
 *   Stage 2: Eligibility Notification
 *   Stage 3: Formal Application  ← Solicitor Required (Section 16)
 *   Stage 4: AIP Active          ← Growth Cap + Restrictions (Section 29)
 *   Stage 5: Transition to Registration
 */

import { useState, useCallback } from 'react';
import Link from 'next/link';

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface ARIPData {
  id?: string;
  current_stage: string;
  stage_status: string;
  aip_issued_date: string | null;
  aip_expiry_date: string | null;
  arip_entry_customer_count: number | null;
  current_customer_count: number | null;
  growth_cap_breached: boolean;
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

interface Props {
  arip: ARIPData | null;
  accessToken: string;
}

/* ── Stage config ──────────────────────────────────────────────────────────── */

const STAGES = [
  { id: 'initial_assessment',         label: 'Initial Assessment',        step: 1 },
  { id: 'eligibility_notification',   label: 'Eligibility Notification',  step: 2 },
  { id: 'formal_application',         label: 'Formal Application',        step: 3, solicitorRequired: true },
  { id: 'aip_active',                 label: 'AIP Active',                step: 4 },
  { id: 'transition_to_registration', label: 'Transition to Registration',step: 5 },
] as const;

const STAGE_ORDER = STAGES.map((s) => s.id);

function getStageIndex(stageId: string): number {
  return STAGE_ORDER.indexOf(stageId as typeof STAGE_ORDER[number]);
}

/* ── Stage 3 Document Checklist items ──────────────────────────────────────── */

const DOC_CHECKLIST = [
  { id: 'form_sec2', label: 'Form SEC 2 and 2D', note: 'Minimum 4 sponsored individuals required, including MD and Compliance Officer' },
  { id: 'cert_incorporation', label: 'Certificate of Incorporation (original to be sighted)', note: null },
  { id: 'moa_vasp', label: 'M&A with VASP powers', note: 'Must specifically include power to perform your VASP function. Generic CAC M&A is often insufficient — check with your solicitor before submitting.' },
  { id: 'cac_forms', label: 'CAC Forms (Share Capital, Return of Allotment, Particulars of Directors)', note: null },
  { id: 'audited_accounts', label: 'Latest audited accounts / audited statement of affairs', note: null },
  { id: 'tin', label: 'Tax Identification Number', note: null },
  { id: 'tax_clearance', label: 'Tax Clearance Certificate', note: 'Not just Tax ID — you need the clearance certificate from FIRS. Allow 2–4 weeks to obtain.' },
  { id: 'nin_bvn', label: 'Valid ID — NIN and BVN for ALL sponsored individuals', note: null },
  { id: 'sworn_orderly', label: 'Sworn undertaking — orderly fair transparent market', note: null },
  { id: 'nfiu_registration', label: 'Evidence of NFIU registration', note: null },
  { id: 'sworn_records', label: 'Sworn undertaking — records and returns', note: null },
  { id: 'sworn_sec_rules', label: 'Sworn undertaking — SEC Rules compliance', note: null },
  { id: 'operational_plan', label: 'ARIP Operational Plan (including exit plan)', link: { href: '/dashboard/documents?template=ARIP_OPERATIONAL_PLAN', label: 'Generate with Klarify →' } },
  { id: 'sworn_fitness', label: 'Sworn Undertaking — fitness and propriety', link: { href: '/dashboard/documents?template=ARIP_SWORN_UNDERTAKING', label: 'Generate with Klarify →' } },
  { id: 'no_objection', label: 'No Objection from other regulators (if applicable)', note: null, optional: true },
] as const;

/* ── Reusable field components ─────────────────────────────────────────────── */

function SavedToast({ show }: { show: boolean }): JSX.Element | null {
  if (!show) return null;
  return (
    <span className="ml-2 inline-block rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
      Saved ✓
    </span>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="grid grid-cols-3 items-start gap-4 py-3">
      <label className="text-sm font-medium text-[#1A1A1A]">{label}</label>
      <div className="col-span-2">{children}</div>
    </div>
  );
}

/* ── Main client component ─────────────────────────────────────────────────── */

export function ARIPTrackerClient({ arip: initialArip, accessToken }: Props): JSX.Element {
  const [arip, setArip] = useState<ARIPData | null>(initialArip);
  const [activeStage, setActiveStage] = useState<string>(
    initialArip?.current_stage ?? 'initial_assessment'
  );
  const [savedToast, setSavedToast] = useState(false);
  const [docChecks, setDocChecks] = useState<Record<string, boolean>>({});
  const [baselineLocked, setBaselineLocked] = useState(
    initialArip?.arip_entry_customer_count !== null
  );
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // API routes live on the same origin as the Next.js app (apps/web/src/app/api/*),
  // so use a same-origin relative URL. Hardcoding NEXT_PUBLIC_API_URL to
  // http://localhost:3000 in the env causes calls to fail in production.
  const save = useCallback(async (patch: Partial<ARIPData>): Promise<void> => {
    if (!arip) return;
    const next = { ...arip, ...patch };
    setArip(next);
    await fetch('/api/arip', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(patch),
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  }, [arip, accessToken]);

  const createApplication = async (): Promise<void> => {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/arip', {
        // API route handles upsert via PUT — no POST handler exists.
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          current_stage: 'initial_assessment',
          stage_status: 'not_started',
          licence_type: 'unknown',
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      // The PUT handler returns the raw Prisma model (camelCase). Rather than
      // transforming it, we set the display state directly — we know exactly
      // what was just created.
      setArip({
        current_stage: 'initial_assessment',
        stage_status: 'not_started',
        aip_issued_date: null,
        aip_expiry_date: null,
        arip_entry_customer_count: null,
        current_customer_count: null,
        growth_cap_breached: false,
      });
    } catch (err) {
      console.error('[createApplication]', err);
      setCreateError('Could not create your ARIP application. Please check the API is running and try again.');
    } finally {
      setCreating(false);
    }
  };

  /* ── Empty state ─────────────────────────────────────────────────────────── */
  if (!arip) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[#0B6E6E] bg-[#E6F4F4] p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl">
          📋
        </div>
        <h2 className="mb-2 text-xl font-semibold text-[#0B6E6E]">Start your ARIP journey</h2>
        <p className="mx-auto mb-6 max-w-md text-sm text-[#555555]">
          The SEC Nigeria ARIP programme is the pathway for digital asset businesses to
          operate legally in Nigeria. Start here to track your 5-stage application.
        </p>
        <button
          onClick={() => { void createApplication(); }}
          disabled={creating}
          className="rounded-xl bg-[#0B6E6E] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#0D2B45] disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'Begin Initial Assessment →'}
        </button>
        {createError && (
          <p className="mt-4 text-sm text-[#C0392B]">{createError}</p>
        )}
      </div>
    );
  }

  const currentStageIndex = getStageIndex(arip.current_stage);

  /* ── 5-Stage Progress Stepper ────────────────────────────────────────────── */
  return (
    <div>
      {/* Saved toast */}
      <SavedToast show={savedToast} />

      {/* ── Stepper ── */}
      <div className="mb-8 overflow-x-auto">
        <div className="flex min-w-max items-start gap-0">
          {STAGES.map((stage, i) => {
            const isDone    = i < currentStageIndex;
            const isActive  = stage.id === arip.current_stage;
            const isFuture  = i > currentStageIndex;

            return (
              <div key={stage.id} className="flex items-center">
                <button
                  onClick={() => setActiveStage(stage.id)}
                  className="flex flex-col items-center gap-1"
                >
                  {/* Circle */}
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition"
                    style={{
                      borderColor: isDone ? '#D4A843' : isActive ? '#0B6E6E' : '#CCCCCC',
                      backgroundColor: isDone ? '#D4A843' : isActive ? '#0B6E6E' : 'white',
                      color: isDone || isActive ? 'white' : '#CCCCCC',
                    }}
                  >
                    {isDone ? '✓' : stage.step}
                  </div>
                  {/* Label */}
                  <div className="max-w-[90px] text-center">
                    <p
                      className="text-[11px] font-medium leading-tight"
                      style={{ color: isActive ? '#0B6E6E' : isFuture ? '#CCCCCC' : '#1A1A1A' }}
                    >
                      {stage.label}
                    </p>
                    {'solicitorRequired' in stage && (
                      <p className="mt-0.5 text-[9px] text-amber-600">⚠️ Solicitor Required</p>
                    )}
                  </div>
                </button>
                {/* Connector */}
                {i < STAGES.length - 1 && (
                  <div
                    className="mx-1 mt-4 h-0.5 w-8 shrink-0"
                    style={{ backgroundColor: i < currentStageIndex ? '#D4A843' : '#CCCCCC' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Stage Detail Panels ── */}
      <div className="space-y-4">
        {activeStage === 'initial_assessment' && (
          <StagePanel title="Stage 1: Initial Assessment" stageId="initial_assessment" arip={arip} save={save}>
            <p className="mb-4 text-sm text-[#555555]">
              Submit the Initial Assessment Form online via the SEC ePortal at{' '}
              <a href="https://home.sec.gov.ng" target="_blank" rel="noopener noreferrer"
                 className="font-medium text-[#0B6E6E] underline">
                home.sec.gov.ng
              </a>
            </p>
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              This is Stage 1 only — not the full application. Do not pay any fees at this stage.
            </div>
            <StatusSelect
              value={arip.stage_status}
              options={['not_started', 'submitted', 'under_review', 'complete']}
              onChange={(v) => void save({ stage_status: v })}
            />
            <div className="mt-4">
              <a
                href="https://home.sec.gov.ng"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-lg bg-[#0B6E6E] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#0D2B45]"
              >
                Open SEC ePortal →
              </a>
            </div>
          </StagePanel>
        )}

        {activeStage === 'eligibility_notification' && (
          <StagePanel title="Stage 2: Eligibility Notification" stageId="eligibility_notification" arip={arip} save={save}>
            <StatusSelect
              value={arip.stage_status}
              options={['not_started', 'submitted', 'eligible', 'ineligible', 'deferred']}
              onChange={(v) => void save({ stage_status: v })}
            />
            <div className="mt-4">
              {arip.stage_status === 'eligible' && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  ✅ You are eligible. Proceed to Stage 3 Formal Application.
                </div>
              )}
              {arip.stage_status === 'ineligible' && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  ⛔ SEC has found you ineligible. Written reasons should have been provided.
                  Review and address the issues before reapplying.
                </div>
              )}
              {arip.stage_status === 'deferred' && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  ⏳ SEC has deferred your application. This is normal — await their further
                  communication before proceeding.
                </div>
              )}
            </div>
          </StagePanel>
        )}

        {activeStage === 'formal_application' && (
          <StagePanel title="Stage 3: Formal Application" stageId="formal_application" arip={arip} save={save}>
            {/* CRITICAL SOLICITOR BLOCKER — must never be removed per prompt rules */}
            <div className="mb-6 rounded-lg border-2 border-red-400 bg-red-50 px-5 py-4">
              <p className="mb-1 text-sm font-bold text-red-700">
                ⚠️ SOLICITOR REQUIRED
              </p>
              <p className="text-sm text-red-700">
                Under Section 16 of the ARIP Framework, your application MUST be filed through
                a registered solicitor or adviser. You cannot file directly. Complete the solicitor
                fields below before marking this stage as started.
              </p>
            </div>

            {/* Solicitor fields */}
            <div className="mb-6 rounded-xl border border-[#CCCCCC] bg-white p-5">
              <h4 className="mb-4 text-sm font-semibold text-[#1A1A1A]">Solicitor / Adviser Details</h4>
              <div className="divide-y divide-[#F5F5F5]">
                <FieldRow label="Solicitor Name">
                  <input
                    type="text"
                    defaultValue={arip.solicitor_name ?? ''}
                    onBlur={(e) => void save({ solicitor_name: e.target.value })}
                    className="w-full rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm focus:border-[#0B6E6E] focus:outline-none"
                    placeholder="Full name"
                  />
                </FieldRow>
                <FieldRow label="Law Firm / Advisory Firm">
                  <input
                    type="text"
                    defaultValue={arip.solicitor_firm ?? ''}
                    onBlur={(e) => void save({ solicitor_firm: e.target.value })}
                    className="w-full rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm focus:border-[#0B6E6E] focus:outline-none"
                    placeholder="Firm name"
                  />
                </FieldRow>
                <FieldRow label="Email Address">
                  <input
                    type="email"
                    defaultValue={arip.solicitor_email ?? ''}
                    onBlur={(e) => void save({ solicitor_email: e.target.value })}
                    className="w-full rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm focus:border-[#0B6E6E] focus:outline-none"
                    placeholder="solicitor@firm.com"
                  />
                </FieldRow>
                <FieldRow label="">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      defaultChecked={arip.solicitor_engaged ?? false}
                      onChange={(e) => void save({ solicitor_engaged: e.target.checked })}
                      className="h-4 w-4 rounded border-[#CCCCCC] text-[#0B6E6E]"
                    />
                    Solicitor engaged and confirmed
                  </label>
                </FieldRow>
              </div>
            </div>

            {/* Processing fee */}
            <div className="mb-6 rounded-xl border border-[#CCCCCC] bg-white p-5">
              <h4 className="mb-1 text-sm font-semibold text-[#1A1A1A]">
                Processing Fee — Non-Refundable
              </h4>
              <p className="mb-4 text-xs text-[#555555]">
                Fee is non-refundable. Only pay after receiving eligibility notification
                from Stage 2. Pay via REVOP.
              </p>
              <div className="divide-y divide-[#F5F5F5]">
                <FieldRow label="">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      defaultChecked={arip.processing_fee_paid ?? false}
                      onChange={(e) => void save({ processing_fee_paid: e.target.checked })}
                      className="h-4 w-4 rounded border-[#CCCCCC] text-[#0B6E6E]"
                    />
                    Processing fee paid
                  </label>
                </FieldRow>
                <FieldRow label="Payment Date">
                  <input
                    type="date"
                    defaultValue={arip.payment_date ?? ''}
                    onBlur={(e) => void save({ payment_date: e.target.value })}
                    className="rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm focus:border-[#0B6E6E] focus:outline-none"
                  />
                </FieldRow>
                <FieldRow label="REVOP Reference">
                  <input
                    type="text"
                    defaultValue={arip.revop_reference ?? ''}
                    onBlur={(e) => void save({ revop_reference: e.target.value })}
                    className="w-full rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm focus:border-[#0B6E6E] focus:outline-none"
                    placeholder="Reference number"
                  />
                </FieldRow>
              </div>
              <a
                href="https://revop.gov.ng/payments/generate-bill?org=0220009001000"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm font-medium text-[#0B6E6E] underline underline-offset-2"
              >
                Pay via REVOP →
              </a>
            </div>

            {/* Document checklist */}
            <div className="mb-6 rounded-xl border border-[#CCCCCC] bg-white p-5">
              <h4 className="mb-4 text-sm font-semibold text-[#1A1A1A]">
                Document Checklist (Section 18, ARIP Framework)
              </h4>
              <ul className="space-y-3">
                {DOC_CHECKLIST.map((item) => (
                  <li key={item.id} className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={docChecks[item.id] ?? false}
                      onChange={(e) => setDocChecks((prev) => ({ ...prev, [item.id]: e.target.checked }))}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#CCCCCC] text-[#0B6E6E]"
                    />
                    <div>
                      <p className="text-sm text-[#1A1A1A]">
                        {item.label}
                        {'optional' in item && item.optional && (
                          <span className="ml-1.5 text-xs text-[#555555]">(if applicable)</span>
                        )}
                      </p>
                      {'note' in item && item.note && (
                        <p className="mt-0.5 text-xs text-[#555555]">{item.note}</p>
                      )}
                      {'link' in item && item.link && (
                        <Link
                          href={item.link.href}
                          className="mt-0.5 block text-xs font-medium text-[#0B6E6E] underline underline-offset-2"
                        >
                          {item.link.label}
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Fidelity bond */}
            <div className="rounded-xl border border-[#CCCCCC] bg-white p-5">
              <h4 className="mb-1 text-sm font-semibold text-[#1A1A1A]">
                Fidelity Bond — Minimum 25% of Shareholder Fund
              </h4>
              <p className="mb-4 text-xs text-[#555555]">
                Must be from a NAICOM-approved insurer and cover at least 25% of your required
                shareholder fund.
              </p>
              <div className="divide-y divide-[#F5F5F5]">
                <FieldRow label="">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      defaultChecked={arip.fidelity_bond_in_place ?? false}
                      onChange={(e) => void save({ fidelity_bond_in_place: e.target.checked })}
                      className="h-4 w-4 rounded border-[#CCCCCC] text-[#0B6E6E]"
                    />
                    Bond in place
                  </label>
                </FieldRow>
                <FieldRow label="Coverage % (min 25%)">
                  <input
                    type="number"
                    min={25}
                    defaultValue={arip.fidelity_bond_coverage_pct ?? ''}
                    onBlur={(e) => void save({ fidelity_bond_coverage_pct: parseFloat(e.target.value) || null })}
                    className="w-24 rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm focus:border-[#0B6E6E] focus:outline-none"
                  />
                </FieldRow>
                <FieldRow label="Insurer">
                  <input
                    type="text"
                    defaultValue={arip.fidelity_bond_insurer ?? ''}
                    onBlur={(e) => void save({ fidelity_bond_insurer: e.target.value })}
                    className="w-full rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm focus:border-[#0B6E6E] focus:outline-none"
                    placeholder="Insurer name"
                  />
                </FieldRow>
                <FieldRow label="Bond Expiry">
                  <input
                    type="date"
                    defaultValue={arip.fidelity_bond_expiry ?? ''}
                    onBlur={(e) => void save({ fidelity_bond_expiry: e.target.value })}
                    className="rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm focus:border-[#0B6E6E] focus:outline-none"
                  />
                </FieldRow>
              </div>
            </div>
          </StagePanel>
        )}

        {activeStage === 'aip_active' && (
          <StagePanel title="Stage 4: AIP — Active" stageId="aip_active" arip={arip} save={save}>
            {/* AIP dates */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#555555] uppercase tracking-wide">
                  AIP Issued Date
                </label>
                <input
                  type="date"
                  defaultValue={arip.aip_issued_date ?? ''}
                  onBlur={(e) => void save({ aip_issued_date: e.target.value })}
                  className="w-full rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm focus:border-[#0B6E6E] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#555555] uppercase tracking-wide">
                  AIP Expiry Date
                </label>
                <input
                  type="date"
                  defaultValue={arip.aip_expiry_date ?? ''}
                  onBlur={(e) => void save({ aip_expiry_date: e.target.value })}
                  className="w-full rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm focus:border-[#0B6E6E] focus:outline-none"
                />
              </div>
            </div>

            {/* Customer baseline — CRITICAL */}
            <div className="mb-6 rounded-xl border-2 border-amber-400 bg-amber-50 p-5">
              <h4 className="mb-1 text-sm font-bold text-[#1A1A1A]">
                📌 Record your customer count TODAY
              </h4>
              <p className="mb-4 text-sm text-[#555555]">
                You must record your exact customer count on the day you receive AIP. This becomes
                your baseline for the 10% growth cap. You cannot reconstruct this number later.
              </p>
              {baselineLocked && arip.arip_entry_customer_count !== null ? (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  🔒 Baseline locked: {arip.arip_entry_customer_count.toLocaleString()} customers on{' '}
                  {arip.aip_issued_date
                    ? new Date(arip.aip_issued_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'AIP receipt date'}.{' '}
                  Your 10% cap = {Math.floor(arip.arip_entry_customer_count * 0.1).toLocaleString()} additional customers.
                </div>
              ) : (
                <BaselineLockForm
                  onLock={async (count) => {
                    await save({ arip_entry_customer_count: count, current_customer_count: count });
                    setBaselineLocked(true);
                  }}
                />
              )}
            </div>

            {/* Growth tracker */}
            {baselineLocked && arip.arip_entry_customer_count !== null && (
              <div className="mb-6 rounded-xl border border-[#CCCCCC] bg-white p-5">
                <h4 className="mb-4 text-sm font-semibold text-[#1A1A1A]">Customer Growth Tracker</h4>
                <GrowthTracker
                  baseline={arip.arip_entry_customer_count}
                  current={arip.current_customer_count ?? arip.arip_entry_customer_count}
                  aipIssuedDate={arip.aip_issued_date}
                  onUpdate={async (count) => { await save({ current_customer_count: count }); }}
                />
              </div>
            )}

            {/* AIP restrictions checklist */}
            <div className="rounded-xl border border-[#CCCCCC] bg-white p-5">
              <h4 className="mb-4 text-sm font-semibold text-[#1A1A1A]">
                AIP Restrictions Compliance — Section 29
              </h4>
              <div className="space-y-3">
                {[
                  { label: 'No promotional activities (Section 29b)', key: 'promo' },
                  { label: 'No business outside operational plan (Section 29a)', key: 'scope' },
                  { label: 'No misleading communications (Section 29c)', key: 'comms' },
                  { label: 'Customer growth within 10% cap (Section 29d)', key: 'cap' },
                ].map(({ label, key }) => (
                  <label key={key} className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[#CCCCCC] text-[#0B6E6E]"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </StagePanel>
        )}

        {activeStage === 'transition_to_registration' && (
          <StagePanel title="Stage 5: Transition to Registration" stageId="transition_to_registration" arip={arip} save={save}>
            <p className="mb-4 text-sm text-[#555555]">
              Select the outcome of your ARIP process (Section 37, ARIP Framework):
            </p>
            <div className="space-y-3">
              {[
                { value: 'granted', label: 'Full registration granted' },
                { value: 'new_regs_adopted', label: 'New regulations adopted for our business model' },
                { value: 'denied', label: 'Registration denied' },
              ].map(({ value, label }) => (
                <label key={value} className="flex items-center gap-3 text-sm">
                  <input
                    type="radio"
                    name="outcome"
                    value={value}
                    checked={arip.outcome === value}
                    onChange={() => void save({ outcome: value })}
                    className="h-4 w-4 border-[#CCCCCC] text-[#0B6E6E]"
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="mt-6">
              {arip.outcome === 'granted' && (
                <div className="rounded-lg border border-green-300 bg-green-50 px-5 py-4 text-sm text-green-800">
                  🎉 Congratulations — your ARIP journey is complete. You are now a fully
                  registered operator in the Nigerian capital market.
                </div>
              )}
              {arip.outcome === 'new_regs_adopted' && (
                <div className="rounded-lg border border-[#0B6E6E]/30 bg-[#E6F4F4] px-5 py-4 text-sm text-[#0D2B45]">
                  <p className="font-semibold">SEC Nigeria is developing new regulations.</p>
                  <p className="mt-1">
                    This typically means your business model is novel. Await SEC guidance on
                    the new framework and your path to registration.
                  </p>
                </div>
              )}
              {arip.outcome === 'denied' && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
                  <p className="mb-2">
                    Your application has been denied under prevailing rules. You may apply to be
                    considered under the existing Regulatory Incubation (RI) programme (Section 31).
                  </p>
                  <a
                    href="https://sec.gov.ng"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline underline-offset-2"
                  >
                    Learn about the RI programme →
                  </a>
                </div>
              )}
            </div>
          </StagePanel>
        )}
      </div>

      {/* Legal disclaimer */}
      <div className="mt-8 rounded-lg border border-[#CCCCCC] bg-[#FAFAFA] px-4 py-3">
        <p className="text-xs italic text-[#555555]">
          This information is sourced from the ARIP Framework, SEC Nigeria (June 2024).
          Klarify provides regulatory information, not legal advice. Verify all requirements
          with your registered solicitor before submission.
        </p>
      </div>
    </div>
  );
}

/* ── Helper sub-components ─────────────────────────────────────────────────── */

function StagePanel({
  title,
  children,
}: {
  title: string;
  stageId: string;
  arip: ARIPData;
  save: (patch: Partial<ARIPData>) => Promise<void>;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="rounded-2xl border border-[#CCCCCC] bg-white p-6 shadow-sm">
      <h3 className="mb-5 text-lg font-semibold text-[#0D2B45]">{title}</h3>
      {children}
    </div>
  );
}

function StatusSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}): JSX.Element {
  const labels: Record<string, string> = {
    not_started: 'Not Started',
    submitted: 'Submitted',
    under_review: 'Under Review',
    complete: 'Complete',
    eligible: 'Eligible',
    ineligible: 'Ineligible',
    deferred: 'Deferred',
    active: 'Active',
  };
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#555555]">
        Stage Status
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm focus:border-[#0B6E6E] focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{labels[opt] ?? opt}</option>
        ))}
      </select>
    </div>
  );
}

function BaselineLockForm({ onLock }: { onLock: (count: number) => Promise<void> }): JSX.Element {
  const [val, setVal] = useState('');
  const [locking, setLocking] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <input
        type="number"
        min={0}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Customers on AIP receipt date"
        className="flex-1 rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm focus:border-[#0B6E6E] focus:outline-none"
      />
      <button
        disabled={!val || locking}
        onClick={async () => {
          const n = parseInt(val, 10);
          if (isNaN(n) || n < 0) return;
          setLocking(true);
          await onLock(n);
          setLocking(false);
        }}
        className="shrink-0 rounded-lg bg-[#D4A843] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c49830] disabled:opacity-50"
      >
        {locking ? 'Locking…' : 'Lock Baseline'}
      </button>
    </div>
  );
}

function GrowthTracker({
  baseline,
  current,
  aipIssuedDate,
  onUpdate,
}: {
  baseline: number;
  current: number;
  aipIssuedDate: string | null;
  onUpdate: (count: number) => Promise<void>;
}): JSX.Element {
  const [count, setCount] = useState(current);
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(String(current));
  const [saving, setSaving] = useState(false);

  const growthPct = baseline > 0
    ? Math.round(((count - baseline) / baseline) * 100 * 10) / 10
    : 0;
  const barColour = growthPct >= 10 ? '#C0392B' : growthPct >= 8 ? '#D4A843' : '#1A7A4A';

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-sm font-medium text-[#1A1A1A]">
          Growth: {growthPct}% <span className="text-[#555555]">of 10% cap</span>
        </p>
        {!editing && (
          <button onClick={() => { setEditing(true); setInputVal(String(count)); }}
            className="text-xs text-[#0B6E6E] underline underline-offset-2">
            Update count
          </button>
        )}
      </div>
      <div className="mb-2 h-3 overflow-hidden rounded-full bg-[#F5F5F5]">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((growthPct / 10) * 100, 100)}%`, backgroundColor: barColour }} />
      </div>
      <p className="mb-2 text-xs text-[#555555]">
        {count.toLocaleString()} current / {baseline.toLocaleString()} baseline
        {aipIssuedDate && ` (since ${new Date(aipIssuedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})`}
      </p>
      {editing && (
        <div className="mb-2 flex gap-2">
          <input type="number" value={inputVal} min="0"
            onChange={(e) => setInputVal(e.target.value)}
            className="w-32 rounded border border-[#CCCCCC] px-2 py-1 text-sm" />
          <button
            disabled={saving}
            onClick={async () => {
              const n = parseInt(inputVal, 10);
              if (!isNaN(n) && n >= 0) {
                setSaving(true);
                await onUpdate(n);
                setCount(n);
                setEditing(false);
                setSaving(false);
              }
            }}
            className="rounded bg-[#0B6E6E] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-[#555555]">Cancel</button>
        </div>
      )}
      {growthPct >= 10 && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          ⛔ 10% LIMIT REACHED — pause all customer acquisition immediately.
        </div>
      )}
      {growthPct >= 8 && growthPct < 10 && (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Approaching 10% limit — review customer acquisition activities.
        </div>
      )}
    </div>
  );
}
