'use client';

/**
 * ARIPRestrictionsWidget — shown on the dashboard when the user's ARIP
 * status is Stage 4: AIP Active.
 *
 * This widget is NOT dismissible. It stays visible for the entire AIP
 * period — AIP conditions are permanent legal obligations.
 *
 * Regulatory source: ARIP Framework, SEC Nigeria, June 2024 (Sections 20, 29)
 */

import { useState } from 'react';
import Link from 'next/link';

/* ── Types ─────────────────────────────────────────────────────────────────── */

export interface ARIPApplicationData {
  current_stage: string;
  stage_status: string;
  aip_issued_date: string | null;
  aip_expiry_date: string | null;
  arip_entry_customer_count: number | null;
  current_customer_count: number | null;
  growth_cap_breached: boolean;
  next_filing?: {
    title: string;
    due_date: string;
  } | null;
}

interface ARIPRestrictionsWidgetProps {
  arip: ARIPApplicationData;
  accessToken: string;
}

/* ── Stage label map ───────────────────────────────────────────────────────── */

/** ARIP 5-stage model per ARIP Framework (SEC Nigeria, June 2024) */
export const ARIP_STAGE_LABELS: Record<string, string> = {
  initial_assessment:        'Stage 1: Initial Assessment',
  eligibility_notification:  'Stage 2: Eligibility Notification',
  formal_application:        'Stage 3: Formal Application',
  aip_active:                'Stage 4: AIP — Active',
  transition_to_registration:'Stage 5: Transition to Registration',
};

export const ARIP_STATUS_LABELS: Record<string, { label: string; colour: string }> = {
  not_started:      { label: 'Not Started',          colour: '#CCCCCC' },
  submitted:        { label: 'Submitted',             colour: '#3B82F6' },
  under_review:     { label: 'Under Review',          colour: '#D4A843' },
  complete:         { label: 'Complete',              colour: '#1A7A4A' },
  eligible:         { label: 'Eligible',              colour: '#1A7A4A' },
  ineligible:       { label: 'Ineligible',            colour: '#C0392B' },
  deferred:         { label: 'Deferred',              colour: '#D4A843' },
  granted:          { label: 'Registration Granted',  colour: '#1A7A4A' },
  new_regs_adopted: { label: 'New Regs Adopted',      colour: '#0B6E6E' },
  denied:           { label: 'Denied',                colour: '#C0392B' },
  active:           { label: 'AIP Active',            colour: '#1A7A4A' },
  expired:          { label: 'AIP Expired',           colour: '#C0392B' },
};

/* ── CustomerGrowthBar ─────────────────────────────────────────────────────── */

function CustomerGrowthBar({
  baseline,
  current,
  aipIssuedDate,
  accessToken,
}: {
  baseline: number;
  current: number;
  aipIssuedDate: string | null;
  accessToken: string;
}): JSX.Element {
  const [currentCount, setCurrentCount] = useState(current);
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(String(current));
  const [saving, setSaving] = useState(false);

  const growthPct = baseline > 0
    ? Math.round(((currentCount - baseline) / baseline) * 100 * 10) / 10
    : 0;

  const barPct = Math.min(growthPct, 10);
  const barColour = growthPct >= 10 ? '#C0392B' : growthPct >= 8 ? '#D4A843' : '#1A7A4A';

  const handleSave = async (): Promise<void> => {
    const parsed = parseInt(inputVal, 10);
    if (isNaN(parsed) || parsed < 0) return;
    setSaving(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/arip/customer-count`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ current_customer_count: parsed }),
      });
      setCurrentCount(parsed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-[#1A1A1A]">
          📊 Customer growth: {growthPct}% of 10% limit used
        </span>
        {!editing && (
          <button
            onClick={() => { setEditing(true); setInputVal(String(currentCount)); }}
            className="text-xs text-[#0B6E6E] underline underline-offset-2"
          >
            Update count
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-1 h-3 overflow-hidden rounded-full bg-[#F5F5F5]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(barPct / 10) * 100}%`, backgroundColor: barColour }}
        />
      </div>

      <p className="mb-2 text-xs text-[#555555]">
        {currentCount.toLocaleString()} customers
        {baseline > 0 && aipIssuedDate && (
          <> ({baseline.toLocaleString()} on AIP receipt {new Date(aipIssuedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})</>
        )}
      </p>

      {/* Update count inline form */}
      {editing && (
        <div className="mb-2 flex items-center gap-2">
          <input
            type="number"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            className="w-32 rounded border border-[#CCCCCC] px-2 py-1 text-sm"
            min="0"
          />
          <button
            onClick={() => { void handleSave(); }}
            disabled={saving}
            className="rounded bg-[#0B6E6E] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="text-xs text-[#555555]"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Threshold warnings */}
      {growthPct >= 10 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-xs font-semibold text-red-700">
            ⛔ 10% LIMIT REACHED — pause all customer acquisition immediately.
            Continuing to grow may result in AIP withdrawal.
          </p>
        </div>
      )}
      {growthPct >= 8 && growthPct < 10 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs text-amber-700">
            Approaching 10% limit — review customer acquisition activities.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Main Widget ───────────────────────────────────────────────────────────── */

export function ARIPRestrictionsWidget({
  arip,
  accessToken,
}: ARIPRestrictionsWidgetProps): JSX.Element {
  const daysUntilFiling = arip.next_filing
    ? Math.ceil(
        (new Date(arip.next_filing.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;

  const filingColour =
    daysUntilFiling === null ? '#555555'
    : daysUntilFiling < 7    ? '#C0392B'
    : daysUntilFiling < 14   ? '#D4A843'
    : '#1A7A4A';

  return (
    <div className="mb-8 overflow-hidden rounded-2xl border-2 border-[#D4A843] bg-[#FDF6E3]">
      {/* Header — non-dismissible */}
      <div className="flex items-center gap-3 border-b border-[#D4A843]/30 bg-[#D4A843]/10 px-6 py-4">
        <span className="text-xl">⚠️</span>
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[#0D2B45]">
            ACTIVE AIP — RESTRICTIONS IN FORCE
          </p>
          {arip.aip_expiry_date && (
            <p className="text-xs text-[#555555]">
              AIP expires {new Date(arip.aip_expiry_date).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          )}
        </div>
      </div>

      {/* Restriction rows */}
      <div className="divide-y divide-[#D4A843]/20 px-6">
        {/* Row 1 — Promotional ban */}
        <div className="flex items-start gap-4 py-4">
          <span className="mt-0.5 shrink-0 text-xl">⛔</span>
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <p className="text-sm font-semibold text-[#1A1A1A]">
                Promotional activities suspended
              </p>
              <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                SUSPENDED
              </span>
            </div>
            <p className="text-xs text-[#555555]">
              No ads, campaigns, mass emails, or social media growth. Applies to ALL
              communications, public and private. (Section 29b, ARIP Framework)
            </p>
          </div>
        </div>

        {/* Row 2 — Customer growth cap */}
        <div className="py-4">
          {arip.arip_entry_customer_count !== null && arip.current_customer_count !== null ? (
            <CustomerGrowthBar
              baseline={arip.arip_entry_customer_count}
              current={arip.current_customer_count}
              aipIssuedDate={arip.aip_issued_date}
              accessToken={accessToken}
            />
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs font-semibold text-amber-700">
                ⚠️ Customer baseline not recorded. Go to the{' '}
                <Link href="/dashboard/regulators/arip" className="underline">
                  ARIP Tracker
                </Link>{' '}
                to lock your baseline immediately.
              </p>
            </div>
          )}
        </div>

        {/* Row 3 — Business scope */}
        <div className="flex items-start gap-4 py-4">
          <span className="mt-0.5 shrink-0 text-xl">🚫</span>
          <div className="flex-1">
            <p className="mb-1 text-sm font-semibold text-[#1A1A1A]">
              Business limited to approved activities
            </p>
            <p className="mb-1.5 text-xs text-[#555555]">
              You cannot conduct any business outside your approved operational plan.
              (Section 29c, ARIP Framework)
            </p>
            <Link
              href="/dashboard/documents?template=ARIP_OPERATIONAL_PLAN"
              className="text-xs font-medium text-[#0B6E6E] underline underline-offset-2"
            >
              View your operational plan →
            </Link>
          </div>
        </div>

        {/* Row 4 — Next SEC filing */}
        <div className="flex items-start gap-4 py-4">
          <span className="mt-0.5 shrink-0 text-xl">📅</span>
          <div className="flex-1">
            <p className="mb-1 text-sm font-semibold text-[#1A1A1A]">
              {arip.next_filing
                ? `Next SEC filing: ${arip.next_filing.title}`
                : 'No upcoming SEC filing scheduled'}
            </p>
            {daysUntilFiling !== null && (
              <p className="mb-1.5 text-xs font-semibold" style={{ color: filingColour }}>
                {daysUntilFiling} day{daysUntilFiling !== 1 ? 's' : ''} remaining
              </p>
            )}
            <Link
              href="/dashboard/calendar"
              className="text-xs font-medium text-[#0B6E6E] underline underline-offset-2"
            >
              View compliance calendar →
            </Link>
          </div>
        </div>
      </div>

      {/* Footer disclaimer — CLAUDE.md §16 Rule 1 */}
      <div className="border-t border-[#D4A843]/30 px-6 py-3">
        <p className="text-xs italic text-[#555555]">
          This information is sourced from the ARIP Framework, SEC Nigeria (June 2024), Sections
          20 and 29. Klarify provides regulatory information, not legal advice.
        </p>
      </div>
    </div>
  );
}
