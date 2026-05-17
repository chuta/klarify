import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * /dashboard/calendar — Compliance Calendar
 *
 * Full implementation: Sprint 5.
 *
 * AIP period obligations (Section 21, ARIP Framework, June 2024):
 *   - Weekly:    Trading statistics → SEC Nigeria
 *   - Monthly:   Full trading statistics + all monthly reports
 *   - Quarterly: Financial statements + compliance reports
 *   - Incident:  Log and report misconduct / fraud / operational incidents
 *
 * All events trigger alerts at 14 days, 7 days, and 24 hours before deadline.
 */
export default async function CalendarPage(): Promise<JSX.Element> {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/sign-in');

  // Static preview of the compliance event types that will be live in Sprint 5.
  const UPCOMING_EVENTS = [
    { type: 'WEEKLY',    label: 'Trading Statistics — SEC Nigeria',            freq: 'Every week',    color: '#0B6E6E', bg: '#E6F4F4' },
    { type: 'MONTHLY',   label: 'Full Trading Statistics + Monthly Reports',   freq: 'Every month',   color: '#0D2B45', bg: '#E8EEF4' },
    { type: 'QUARTERLY', label: 'Financial Statements + Compliance Reports',   freq: 'Every quarter', color: '#D4A843', bg: '#FDF6E3' },
    { type: 'STR',       label: 'STR Filing (goAML portal)',                   freq: 'As triggered',  color: '#C0392B', bg: '#FDF2F2' },
    { type: 'CTR',       label: 'CTR Filing — transactions ≥ ₦5m',            freq: 'As triggered',  color: '#C0392B', bg: '#FDF2F2' },
    { type: 'BWRA',      label: 'Annual Business-Wide Risk Assessment Review', freq: 'Annually',      color: '#1A7A4A', bg: '#EFF7F2' },
    { type: 'TRAINING',  label: 'Quarterly AML/CFT Staff Training',            freq: 'Every quarter', color: '#6B4E9B', bg: '#F3EFF9' },
    { type: 'PEP',       label: 'PEP Register Submission — NFIU',              freq: 'Monthly',       color: '#7B4F12', bg: '#FDF4E7' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">Compliance Calendar</h1>
        <p className="mt-1 text-sm text-[#555555]">
          Never miss a regulatory deadline. Automated alerts at 14 days, 7 days, and 24 hours
          before every filing obligation.
        </p>
      </div>

      {/* Coming soon banner */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-dashed border-[#0B6E6E] bg-[#E6F4F4] p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white">
          <svg className="h-7 w-7 text-[#0B6E6E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="mb-1 text-lg font-semibold text-[#0B6E6E]">
          Compliance Calendar — Launching Sprint 5
        </h2>
        <p className="mx-auto max-w-md text-sm text-[#555555]">
          Your live compliance calendar will auto-populate with all AIP period filing
          obligations, NFIU reporting deadlines, and custom reminders — with email and
          in-app alerts automatically triggered.
        </p>
      </div>

      {/* Preview of event types */}
      <h2 className="mb-4 text-base font-semibold text-[#1A1A1A]">
        Events that will track automatically
      </h2>
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {UPCOMING_EVENTS.map((evt) => (
          <div
            key={evt.type}
            className="rounded-xl border border-[#CCCCCC] bg-white p-4 shadow-sm opacity-60"
          >
            <div
              className="mb-2 inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: evt.bg, color: evt.color }}
            >
              {evt.type}
            </div>
            <p className="text-xs font-medium text-[#1A1A1A] leading-snug">{evt.label}</p>
            <p className="mt-1 text-[11px] text-[#CCCCCC]">{evt.freq}</p>
          </div>
        ))}
      </div>

      {/* AIP compliance obligations reference */}
      <div className="rounded-xl border border-[#CCCCCC] bg-white p-5 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#CCCCCC]">
          Regulatory Basis — AIP Period Obligations
        </p>
        <p className="text-sm text-[#555555]">
          All AIP period filing obligations are sourced from{' '}
          <span className="font-medium text-[#1A1A1A]">
            Section 21, ARIP Framework, SEC Nigeria (June 2024)
          </span>
          . Alert thresholds (14 days, 7 days, 24 hours) are set to match the
          SEC Innovation Office&apos;s standard engagement windows. All deadlines
          will be calibrated from your AIP issued date in the ARIP tracker.
        </p>
        <p className="mt-3 text-xs italic text-[#CCCCCC]">
          Regulatory information only — not legal advice. Verify all obligations
          with your registered solicitor before the AIP period begins.
        </p>
      </div>
    </div>
  );
}
