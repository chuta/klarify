import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api';

/**
 * /dashboard/regulators — Regulator Hub
 *
 * Displays all pre-seeded Nigerian regulators as cards, with key contact
 * details, mandate, and jurisdiction tags. Links to the ARIP tracker and
 * (Sprint 5) the Regulator Engagement CRM.
 *
 * Regulatory data is fetched from the API (sourced from the seeded DB) —
 * never hardcoded in UI (CLAUDE.md §16 Rule 2).
 */

interface RegulatorData {
  code: string;
  name: string;
  mandate: string;
  website: string | null;
  portal: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  jurisdictionTags: string[];
}

// Colour and icon assignment per regulator code — presentational only, not regulatory data.
const REGULATOR_ACCENT: Record<string, { color: string; bg: string; icon: string }> = {
  SEC_NIGERIA: { color: '#0B6E6E', bg: '#E6F4F4', icon: '🏛️' },
  CBN:         { color: '#0D2B45', bg: '#E8EEF4', icon: '🏦' },
  NFIU:        { color: '#C0392B', bg: '#FDF2F2', icon: '🔍' },
  NITDA:       { color: '#6B4E9B', bg: '#F3EFF9', icon: '💻' },
  CAC:         { color: '#1A7A4A', bg: '#EFF7F2', icon: '📝' },
  EFCC:        { color: '#7B4F12', bg: '#FDF4E7', icon: '⚖️' },
  NAICOM:      { color: '#D4A843', bg: '#FDF6E3', icon: '🛡️' },
};

const DEFAULT_ACCENT = { color: '#555555', bg: '#F5F5F5', icon: '🏢' };

// Which regulators are "primary" for digital asset / VASP operations.
const PRIMARY_REGS = new Set(['SEC_NIGERIA', 'CBN', 'NFIU']);

export default async function RegulatorsPage(): Promise<JSX.Element> {
  const supabase = createClient();
  // Parallelise the two auth reads — getUser is the slow one (network).
  const [sessionRes, userRes] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser(),
  ]);
  const session = sessionRes.data.session;
  const user = userRes.data.user;
  if (!session || !user) redirect('/sign-in');

  const result = await apiFetch<RegulatorData[]>('/api/regulators', session.access_token);
  const regulators: RegulatorData[] = result.success ? result.data : [];

  const primary = regulators.filter((r) => PRIMARY_REGS.has(r.code));
  const secondary = regulators.filter((r) => !PRIMARY_REGS.has(r.code));

  return (
    <div className="max-w-5xl mx-auto">
      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">Regulator Hub</h1>
        <p className="mt-1 text-sm text-[#555555]">
          Your regulatory contacts for Nigeria&apos;s digital asset and fintech landscape.
          Log interactions and track your relationships in the Engagement CRM.
        </p>
      </div>

      {/* ── ARIP Tracker featured card ── */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-[#0B6E6E] bg-[#E6F4F4]">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="mb-1 inline-block rounded-full bg-[#0B6E6E] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
              ARIP Programme
            </span>
            <h2 className="mt-1 text-lg font-semibold text-[#1A1A1A]">
              SEC Nigeria ARIP Application Tracker
            </h2>
            <p className="mt-1 text-sm text-[#555555]">
              Track your 5-stage Accelerated Regulatory Incubation Programme application
              from Initial Assessment through to full registration.
            </p>
          </div>
          <Link
            href="/dashboard/regulators/arip"
            className="shrink-0 rounded-xl bg-[#0B6E6E] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0D2B45]"
          >
            Open Tracker →
          </Link>
        </div>
      </div>

      {/* ── Primary regulators ── */}
      <h2 className="mb-4 text-base font-semibold text-[#1A1A1A]">
        Primary Digital Asset Regulators
      </h2>
      <div className="mb-8 grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
        {primary.map((reg) => (
          <RegulatorCard key={reg.code} regulator={reg} featured />
        ))}
      </div>

      {/* ── Secondary regulators ── */}
      {secondary.length > 0 && (
        <>
          <h2 className="mb-4 text-base font-semibold text-[#1A1A1A]">
            Supporting Regulatory Bodies
          </h2>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {secondary.map((reg) => (
              <RegulatorCard key={reg.code} regulator={reg} featured={false} />
            ))}
          </div>
        </>
      )}

      {/* ── CRM coming soon banner ── */}
      <div className="rounded-2xl border border-dashed border-[#CCCCCC] bg-[#FAFAFA] p-6 text-center">
        <p className="text-sm font-medium text-[#1A1A1A]">📋 Engagement CRM — Coming in Sprint 5</p>
        <p className="mt-1 text-xs text-[#555555]">
          Log every call, email, meeting, and submission with each regulator. Track open items
          and auto-generate a Regulatory Engagement Summary for your board.
        </p>
      </div>
    </div>
  );
}

// ── Regulator card ────────────────────────────────────────────────────────────

interface RegulatorCardProps {
  regulator: RegulatorData;
  featured: boolean;
}

function RegulatorCard({ regulator, featured }: RegulatorCardProps): JSX.Element {
  const accent = REGULATOR_ACCENT[regulator.code] ?? DEFAULT_ACCENT;

  return (
    <div
      className={`flex flex-col rounded-xl border bg-white shadow-sm transition hover:shadow-md ${
        featured ? 'border-[#CCCCCC]' : 'border-[#CCCCCC]'
      }`}
    >
      {/* Card header */}
      <div
        className="flex items-center gap-3 rounded-t-xl px-4 py-3"
        style={{ backgroundColor: accent.bg }}
      >
        <span className="text-2xl">{accent.icon}</span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold" style={{ color: accent.color }}>
            {regulator.code}
          </p>
          <p className="truncate text-[11px] text-[#555555]">{regulator.name}</p>
        </div>
      </div>

      {/* Mandate */}
      <div className="flex-1 px-4 py-3">
        <p className="text-xs text-[#555555] leading-relaxed">{regulator.mandate}</p>
      </div>

      {/* Tags */}
      {regulator.jurisdictionTags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-4 pb-3">
          {regulator.jurisdictionTags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: accent.bg, color: accent.color }}
            >
              {tag}
            </span>
          ))}
          {regulator.jurisdictionTags.length > 4 && (
            <span className="rounded px-1.5 py-0.5 text-[10px] text-[#CCCCCC]">
              +{regulator.jurisdictionTags.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Contact links */}
      <div className="border-t border-[#F5F5F5] px-4 py-3 space-y-1">
        {regulator.website && (
          <a
            href={regulator.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] text-[#0B6E6E] hover:underline"
          >
            <span>🔗</span>
            <span className="truncate">{regulator.website.replace('https://', '')}</span>
          </a>
        )}
        {regulator.portal && regulator.portal !== regulator.website && (
          <a
            href={regulator.portal}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] text-[#0B6E6E] hover:underline"
          >
            <span>🖥️</span>
            <span className="truncate">ePortal</span>
          </a>
        )}
        {regulator.email && (
          <a
            href={`mailto:${regulator.email}`}
            className="flex items-center gap-1.5 text-[11px] text-[#555555] hover:text-[#0B6E6E]"
          >
            <span>📧</span>
            <span className="truncate">{regulator.email}</span>
          </a>
        )}
        {regulator.phone && (
          <p className="flex items-center gap-1.5 text-[11px] text-[#555555]">
            <span>📞</span>
            <span>{regulator.phone}</span>
          </p>
        )}
      </div>
    </div>
  );
}
