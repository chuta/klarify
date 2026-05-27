'use client';

import { useState } from 'react';
import type { ProductType } from '@klarify/core';
import { PRODUCT_TYPE_META } from '@klarify/core';

// Locally typed to avoid a runtime dep on apps/api from apps/web. Mirrors
// ClassificationResult in apps/api/src/routes/ai/classify.ts.
export interface ClassificationResult {
  primary_category: ProductType;
  secondary_categories: string[];
  primary_regulator: 'SEC_NIGERIA' | 'CBN' | 'BOTH';
  secondary_regulators: string[];
  required_licences: Array<{
    name: string;
    regulator: string;
    url?: string | null;
    urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  }>;
  risk_if_unlicensed: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  dual_licence_required: boolean;
  reasoning: string;
  citations: Array<{ regulation: string; section: string; relevance?: string }>;
}

// CLAUDE.md §7 — branded category palette.
const CATEGORY_PILLS: Record<ProductType, string> = {
  DAX: 'bg-[#0D2B45] text-white',
  DAOP: 'bg-[#0B6E6E] text-white',
  DAC: 'bg-[#D4A843] text-[#1A1A1A]',
  DAI: 'bg-[#1A7A4A] text-white',
  AVASP: 'bg-[#555555] text-white',
  DAPO: 'bg-[#0B6E6E]/80 text-white',
  RATOP: 'bg-[#0D2B45]/90 text-white',
  PAYMENT: 'bg-[#1A7A4A] text-white',
  HYBRID:
    'bg-gradient-to-r from-[#0B6E6E] via-[#0D2B45] to-[#D4A843] text-white',
};

function categoryStyle(category: ProductType): {
  label: string;
  pill: string;
  full: string;
} {
  const meta = PRODUCT_TYPE_META[category];
  return {
    label: meta.label,
    pill: CATEGORY_PILLS[category],
    full: meta.desc,
  };
}

const RISK_STYLES: Record<
  ClassificationResult['risk_if_unlicensed'],
  { label: string; pill: string; section: string }
> = {
  CRITICAL: {
    label: 'CRITICAL',
    pill: 'bg-[#C0392B] text-white',
    section: 'bg-[#FCEAE8] border-[#C0392B]/40 text-[#7a1f15]',
  },
  HIGH: {
    label: 'HIGH',
    pill: 'bg-[#D4A843] text-[#1A1A1A]',
    section: 'bg-[#FDF6E3] border-[#D4A843]/50 text-[#7a5a13]',
  },
  MEDIUM: {
    label: 'MEDIUM',
    pill: 'bg-[#FAFAFA] text-[#555] border border-[#CCCCCC]',
    section: 'bg-[#FAFAFA] border-[#CCCCCC] text-[#555]',
  },
};

const REGULATOR_NAMES: Record<string, string> = {
  SEC_NIGERIA: 'Securities and Exchange Commission Nigeria',
  CBN: 'Central Bank of Nigeria',
  NFIU: 'Nigerian Financial Intelligence Unit',
  NITDA: 'National Information Technology Development Agency',
  CAC: 'Corporate Affairs Commission',
  EFCC: 'Economic and Financial Crimes Commission',
  NAICOM: 'National Insurance Commission',
  BOTH: 'SEC Nigeria + CBN',
};

const URGENCY_STYLES: Record<
  'CRITICAL' | 'HIGH' | 'MEDIUM',
  string
> = {
  CRITICAL: 'bg-[#C0392B] text-white',
  HIGH: 'bg-[#D4A843] text-[#1A1A1A]',
  MEDIUM: 'bg-[#E6F4F4] text-[#0B6E6E]',
};

interface Props {
  result: ClassificationResult;
  /** Optional id from product_classifications row — used for follow-up links. */
  classificationId?: string;
}

export function RegulatoryIdentityCard({
  result,
  classificationId,
}: Props): JSX.Element {
  const [reasoningOpen, setReasoningOpen] = useState(false);

  const catStyle = categoryStyle(result.primary_category);
  const riskStyle = RISK_STYLES[result.risk_if_unlicensed];

  const primaryRegulatorName =
    REGULATOR_NAMES[result.primary_regulator] ?? result.primary_regulator;

  const followUpHref = classificationId
    ? `/dashboard/chat?classificationId=${classificationId}`
    : '/dashboard/chat';

  return (
    <article className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white shadow-sm">
      {/* HEADER */}
      <header className="flex items-start justify-between gap-4 border-b border-[#F5F5F5] px-6 py-5">
        <div className="min-w-0 flex-1">
          <span
            className={[
              'inline-block rounded-md px-3 py-1 text-xs font-semibold tracking-wide',
              catStyle.pill,
            ].join(' ')}
          >
            {result.primary_category}
          </span>
          <h2 className="mt-2 text-xl font-semibold text-[#1A1A1A]">{catStyle.label}</h2>
          <p className="mt-1 text-sm text-[#555]">{catStyle.full}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wide text-[#999]">Risk if unlicensed</p>
          <span
            className={[
              'mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold',
              riskStyle.pill,
            ].join(' ')}
          >
            {riskStyle.label}
          </span>
        </div>
      </header>

      {/* SECTION A — Your Regulators */}
      <section className="border-b border-[#F5F5F5] px-6 py-5">
        <h3 className="text-sm font-semibold text-[#0D2B45]">Your Regulators</h3>
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-3 rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B6E6E] text-xs font-bold text-white">
              {primaryRegulatorName.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wide text-[#999]">Primary</p>
              <p className="font-medium text-[#1A1A1A]">{primaryRegulatorName}</p>
            </div>
            <a
              href="/dashboard/regulators"
              className="text-xs font-medium text-[#0B6E6E] hover:underline"
            >
              View profile →
            </a>
          </div>
          {result.secondary_regulators.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {result.secondary_regulators.map((code) => (
                <div
                  key={code}
                  className="flex items-center gap-2 rounded-lg border border-[#E5E5E5] px-3 py-2"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0D2B45] text-[10px] font-bold text-white">
                    {code.slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wide text-[#999]">Secondary</p>
                    <p className="truncate text-sm font-medium text-[#1A1A1A]">
                      {REGULATOR_NAMES[code] ?? code}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SECTION B — Licences Required */}
      <section className="border-b border-[#F5F5F5] px-6 py-5">
        <h3 className="text-sm font-semibold text-[#0D2B45]">Licences Required</h3>

        {result.dual_licence_required && (
          <div className="mt-3 rounded-lg border border-[#D4A843]/60 bg-[#FDF6E3] px-4 py-3">
            <p className="text-sm font-medium text-[#7a5a13]">
              ⚠️ Your product requires TWO registrations.
            </p>
            <p className="mt-1 text-xs text-[#7a5a13]">
              A single licence does not cover both functions. You must register for each
              category your product performs.
            </p>
          </div>
        )}

        <div className="mt-3 space-y-2">
          {result.required_licences.length === 0 ? (
            <p className="text-sm text-[#777]">No specific licences identified.</p>
          ) : (
            result.required_licences.map((lic, idx) => (
              <div
                key={`${lic.name}-${idx}`}
                className="rounded-lg border border-[#E5E5E5] px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[#1A1A1A]">{lic.name}</p>
                    <p className="text-xs text-[#777]">
                      {REGULATOR_NAMES[lic.regulator] ?? lic.regulator}
                    </p>
                  </div>
                  <span
                    className={[
                      'inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                      URGENCY_STYLES[lic.urgency],
                    ].join(' ')}
                  >
                    {lic.urgency}
                  </span>
                </div>
                {lic.url && (
                  <a
                    href={lic.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs font-medium text-[#0B6E6E] hover:underline"
                  >
                    Learn more →
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* SECTION C — If You Launch Without These */}
      <section
        className={[
          'border-b border-[#F5F5F5] px-6 py-5',
          riskStyle.section,
          'border-l-4',
        ].join(' ')}
      >
        <h3 className="text-sm font-semibold">If You Launch Without These</h3>
        <p className="mt-2 text-sm">
          {result.risk_if_unlicensed === 'CRITICAL' ? (
            <>
              Operating without authorisation under ISA 2025 can result in regulatory
              enforcement, asset freezes, and criminal liability. The SEC has the power
              under Section 357+ to issue cease-and-desist orders and refer matters to
              the EFCC for prosecution.
            </>
          ) : result.risk_if_unlicensed === 'HIGH' ? (
            <>
              Launching without engaging the relevant regulator exposes you to
              enforcement notices, banking-relationship loss (CBN VASP Guidelines 2023),
              and reputational risk that materially harms fundraising.
            </>
          ) : (
            <>
              Operating in this category without prior engagement is not advised. While
              the immediate enforcement risk is lower than the CRITICAL tier, regulators
              expect proactive disclosure.
            </>
          )}
        </p>
      </section>

      {/* SECTION D — Why This Classification */}
      <section className="px-6 py-5">
        <button
          type="button"
          onClick={() => setReasoningOpen((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <h3 className="text-sm font-semibold text-[#0D2B45]">Why This Classification</h3>
          <span className="text-xs text-[#0B6E6E]">
            {reasoningOpen ? 'Hide' : 'Show'} reasoning
          </span>
        </button>
        {reasoningOpen && (
          <div className="mt-3 space-y-3">
            <p className="text-sm leading-relaxed text-[#1A1A1A]">{result.reasoning}</p>
            {result.citations.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {result.citations.map((cit, i) => (
                  <span
                    key={i}
                    title={cit.relevance}
                    className="inline-flex items-center rounded-md border border-[#0B6E6E]/30 bg-[#E6F4F4] px-2 py-0.5 font-mono text-[11px] text-[#0B6E6E]"
                  >
                    [{cit.regulation}, {cit.section}]
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F5F5F5] bg-[#FAFAFA] px-6 py-4">
        <p className="text-[11px] text-[#777]">
          Klarify provides regulatory information, not legal advice. Always verify with a
          qualified practitioner.
        </p>
        <div className="flex items-center gap-2">
          <a
            href={followUpHref}
            className="rounded-lg bg-[#0B6E6E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0a5a5a]"
          >
            Ask a follow-up →
          </a>
        </div>
      </footer>
    </article>
  );
}
