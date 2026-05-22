'use client';

// Regulator Hub Client Component — Sprint 5-C1.
// Handles interaction modal, history slide-over, and plan gating.

import { useState, useCallback } from 'react';
import Image from 'next/image';
import type { Regulator } from '@klarify/core';
import { InteractionModal } from '@/components/regulators/InteractionModal';
import { InteractionHistory } from '@/components/regulators/InteractionHistory';
import { getRegulatorLogoPath } from '@/lib/regulatorLogos';

interface RegulatorHubClientProps {
  regulators: Regulator[];
  interactionCounts: Record<string, number>;
  hasCrm: boolean;
  plan: string;
}

// Presentational constants — not regulatory data (CLAUDE.md §16 Rule 2).
const REGULATOR_ACCENT: Record<string, { color: string; bg: string; icon: string; initials: string }> = {
  SEC_NIGERIA: { color: '#0B6E6E', bg: '#E6F4F4', icon: '🏛️', initials: 'SEC' },
  CBN:         { color: '#0D2B45', bg: '#E8EEF4', icon: '🏦', initials: 'CBN' },
  NFIU:        { color: '#C0392B', bg: '#FDF2F2', icon: '🔍', initials: 'NFIU' },
  NITDA:       { color: '#6B4E9B', bg: '#F3EFF9', icon: '💻', initials: 'NITDA' },
  CAC:         { color: '#1A7A4A', bg: '#EFF7F2', icon: '📝', initials: 'CAC' },
  EFCC:        { color: '#7B4F12', bg: '#FDF4E7', icon: '⚖️', initials: 'EFCC' },
  NAICOM:      { color: '#D4A843', bg: '#FDF6E3', icon: '🛡️', initials: 'NAICOM' },
};
const DEFAULT_ACCENT = { color: '#555555', bg: '#F5F5F5', icon: '🏢', initials: '??' };

const PRIMARY_REGS = new Set(['SEC_NIGERIA', 'CBN', 'NFIU']);

export function RegulatorHubClient({
  regulators,
  interactionCounts,
  hasCrm,
  plan,
}: RegulatorHubClientProps): JSX.Element {
  const [logModalFor, setLogModalFor] = useState<Regulator | null>(null);
  const [historyFor, setHistoryFor] = useState<Regulator | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  // Track counts locally so the badge updates without full-page reload.
  const [localCounts, setLocalCounts] = useState<Record<string, number>>(interactionCounts);

  const handleLogSuccess = useCallback(() => {
    if (logModalFor) {
      setLocalCounts((prev) => ({
        ...prev,
        [logModalFor.code]: (prev[logModalFor.code] ?? 0) + 1,
      }));
    }
    setLogModalFor(null);
    // Inline toast
    const toast = document.createElement('div');
    toast.className =
      'fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] rounded-xl bg-[#1A7A4A] px-5 py-3 text-sm font-semibold text-white shadow-lg';
    toast.textContent = 'Interaction logged successfully ✓';
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 3000);
  }, [logModalFor]);

  const primary = regulators.filter((r) => PRIMARY_REGS.has(r.code));
  const secondary = regulators.filter((r) => !PRIMARY_REGS.has(r.code));

  return (
    <>
      {/* Primary regulators */}
      <h2 className="mb-4 text-base font-semibold text-[#1A1A1A]">
        Primary Digital Asset Regulators
      </h2>
      <div className="mb-8 grid gap-4 sm:grid-cols-1 lg:grid-cols-3 xl:grid-cols-3">
        {primary.map((reg) => (
          <RegulatorCard
            key={reg.code}
            regulator={reg}
            count={localCounts[reg.code] ?? 0}
            hasCrm={hasCrm}
            featured
            onLogInteraction={() => hasCrm ? setLogModalFor(reg) : setShowUpgrade(true)}
            onViewHistory={() => setHistoryFor(reg)}
          />
        ))}
      </div>

      {/* Secondary regulators */}
      {secondary.length > 0 && (
        <>
          <h2 className="mb-4 text-base font-semibold text-[#1A1A1A]">
            Supporting Regulatory Bodies
          </h2>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
            {secondary.map((reg) => (
              <RegulatorCard
                key={reg.code}
                regulator={reg}
                count={localCounts[reg.code] ?? 0}
                hasCrm={hasCrm}
                featured={false}
                onLogInteraction={() => hasCrm ? setLogModalFor(reg) : setShowUpgrade(true)}
                onViewHistory={() => setHistoryFor(reg)}
              />
            ))}
          </div>
        </>
      )}

      {/* Upgrade prompt (shown for free/navigator when CRM action triggered) */}
      {showUpgrade && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowUpgrade(false); }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0B6E6E]">
                <span className="text-lg">🔒</span>
              </div>
              <div>
                <p className="font-semibold text-[#0D2B45]">Available on Compass plan</p>
                <p className="text-xs text-[#555555]">
                  Regulator CRM requires the Compass plan or higher.
                </p>
              </div>
            </div>
            <div className="mb-4 rounded-xl bg-[#FAFAFA] p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#0B6E6E]">
                What you get with Compass:
              </p>
              {[
                'Unlimited AI queries',
                'Regulator CRM with interaction log',
                'ARIP application tracker',
                'All 13 document templates',
              ].map((b) => (
                <p key={b} className="flex items-start gap-2 text-xs text-[#1A1A1A]">
                  <span className="font-bold text-[#0B6E6E]">✓</span>
                  {b}
                </p>
              ))}
            </div>
            <div className="flex gap-3">
              <a
                href="/dashboard/billing"
                className="flex-1 rounded-xl bg-[#0B6E6E] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[#0D2B45]"
              >
                Upgrade to Compass →
              </a>
              <button
                onClick={() => setShowUpgrade(false)}
                className="rounded-xl border border-[#CCCCCC] px-4 py-2.5 text-sm font-medium text-[#555555] transition hover:bg-[#F5F5F5]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interaction log modal */}
      {logModalFor && (
        <InteractionModal
          regulatorCode={logModalFor.code}
          regulatorName={logModalFor.name}
          onClose={() => setLogModalFor(null)}
          onSuccess={handleLogSuccess}
        />
      )}

      {/* History slide-over */}
      {historyFor && (
        <InteractionHistory
          regulatorCode={historyFor.code}
          regulatorName={historyFor.name}
          onClose={() => setHistoryFor(null)}
        />
      )}
    </>
  );
}

// ── Regulator Card ────────────────────────────────────────────────────────────

interface RegulatorCardProps {
  regulator: Regulator;
  count: number;
  hasCrm: boolean;
  featured: boolean;
  onLogInteraction: () => void;
  onViewHistory: () => void;
}

function RegulatorCard({
  regulator,
  count,
  hasCrm,
  featured,
  onLogInteraction,
  onViewHistory,
}: RegulatorCardProps): JSX.Element {
  const accent = REGULATOR_ACCENT[regulator.code] ?? DEFAULT_ACCENT;
  const logoPath = getRegulatorLogoPath(regulator.code);
  const maxTags = 4;

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md ${
        featured ? 'border-[#CCCCCC]' : 'border-[#CCCCCC]'
      }`}
    >
      {/* Card header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ backgroundColor: accent.bg }}
      >
        {/* Logo or initials fallback */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/60 bg-white p-1 shadow-sm">
          {logoPath ? (
            <Image
              src={logoPath}
              alt={`${regulator.name} logo`}
              width={40}
              height={40}
              className="h-full w-full object-contain"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center rounded-md text-[10px] font-bold text-white"
              style={{ backgroundColor: accent.color }}
            >
              {accent.initials}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold" style={{ color: accent.color }}>
            {regulator.code}
          </p>
          <p className="truncate text-[11px] text-[#555555]">{regulator.name}</p>
        </div>
        {/* Interaction count badge */}
        {count > 0 && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
            style={{ backgroundColor: accent.color }}
          >
            {count}
          </span>
        )}
      </div>

      {/* Mandate */}
      <div className="flex-1 px-4 py-3">
        <p className="text-xs leading-relaxed text-[#555555]">{regulator.mandate}</p>
      </div>

      {/* Jurisdiction tags */}
      {(regulator.jurisdictionTags?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1 px-4 pb-3">
          {(regulator.jurisdictionTags ?? []).slice(0, maxTags).map((tag) => (
            <span
              key={tag}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: accent.bg, color: accent.color }}
            >
              {tag}
            </span>
          ))}
          {(regulator.jurisdictionTags?.length ?? 0) > maxTags && (
            <span className="rounded px-1.5 py-0.5 text-[10px] text-[#CCCCCC]">
              +{(regulator.jurisdictionTags?.length ?? 0) - maxTags}
            </span>
          )}
        </div>
      )}

      {/* Contact links */}
      <div className="space-y-1 border-t border-[#F5F5F5] px-4 py-3">
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
            <span>ePortal</span>
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

      {/* CRM action buttons */}
      <div className="flex gap-2 border-t border-[#F5F5F5] px-4 py-3">
        <button
          onClick={onLogInteraction}
          className="flex-1 rounded-lg bg-[#0B6E6E] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0D2B45] disabled:opacity-50"
          title={hasCrm ? `Log interaction with ${regulator.name}` : 'Requires Compass plan'}
        >
          {hasCrm ? '+ Log interaction' : '🔒 Log interaction'}
        </button>
        <button
          onClick={onViewHistory}
          className="rounded-lg border border-[#CCCCCC] px-3 py-2 text-xs font-medium text-[#555555] transition hover:bg-[#F5F5F5]"
          title={`View interaction history for ${regulator.name}`}
        >
          {count > 0 ? `${count} logged` : 'History'}
        </button>
      </div>
    </div>
  );
}
