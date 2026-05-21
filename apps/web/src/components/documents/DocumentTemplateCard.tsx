'use client';

/**
 * Library card for a single document template (Sprint 4 S4-B2).
 *
 * Renders:
 *  * Category-coloured icon dot
 *  * Document name (bold)
 *  * Regulatory basis (small, teal, monospace)
 *  * "Generate" / "Regenerate" CTA
 *  * "Already generated" gold pill if the org has an existing version
 *  * Plan lock overlay for free-plan users
 *  * Disabled state with tooltip for navigator users at 3/3 quota
 *
 * All regulatory text comes from server-driven `regulatoryBasis` —
 * never hardcoded into JSX (CLAUDE.md §16 Rule 2).
 */
import Link from 'next/link';
import type { TemplateCategoryKey } from './categories';
import { CATEGORY_DETAILS } from './categories';

export interface DocumentTemplateCardProps {
  templateId: string;
  documentName: string;
  regulatoryBasis: string;
  category: TemplateCategoryKey;
  isGenerated: boolean;
  currentVersion: number | null;
  plan: 'free' | 'navigator' | 'compass' | 'flagship';
  quotaExhausted: boolean;
  /** Optional query string appended to the generate link (e.g. roadmap deep-link). */
  generateHrefSuffix?: string;
}

export function DocumentTemplateCard({
  templateId,
  documentName,
  regulatoryBasis,
  category,
  isGenerated,
  currentVersion,
  plan,
  quotaExhausted,
  generateHrefSuffix,
}: DocumentTemplateCardProps): JSX.Element {
  const isLocked = plan === 'free';
  const meta = CATEGORY_DETAILS[category] ?? CATEGORY_DETAILS.OTHER;
  const ctaLabel = isGenerated ? 'Regenerate' : 'Generate';
  const ctaDisabled = isLocked || quotaExhausted;
  const ctaHref =
    `/dashboard/compliance/documents/generate/${templateId}` +
    (generateHrefSuffix ? generateHrefSuffix : '');

  return (
    <div className="relative flex flex-col rounded-xl border border-[#E5E5E5] bg-white p-5 transition hover:border-[#0B6E6E] hover:shadow-sm">
      {/* Plan lock overlay — free tier only */}
      {isLocked ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-white/85 backdrop-blur-sm">
          <div className="mb-2 text-2xl" aria-hidden="true">
            🔒
          </div>
          <p className="mb-1 text-sm font-semibold text-[#1A1A1A]">
            Available on Navigator
          </p>
          <p className="mb-3 text-xs text-[#555]">
            Upgrade to generate up to 3 documents per month.
          </p>
          <Link
            href="/billing/upgrade"
            className="rounded-md bg-[#0B6E6E] px-3 py-1.5 text-xs font-medium text-white"
          >
            Upgrade
          </Link>
        </div>
      ) : null}

      {/* Header row */}
      <div className="mb-3 flex items-start justify-between">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-md text-base"
          style={{ backgroundColor: meta.tintBg, color: meta.tintFg }}
          aria-hidden="true"
        >
          {meta.icon}
        </div>
        {isGenerated ? (
          <span className="inline-flex items-center rounded-full bg-[#FDF6E3] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#A87C00]">
            v{currentVersion ?? 1}
          </span>
        ) : null}
      </div>

      {/* Title */}
      <h3 className="mb-2 text-base font-semibold text-[#0D2B45]">
        {documentName}
      </h3>

      {/* Regulatory basis — driven by server, never hardcoded */}
      <p
        className="mb-4 font-mono text-[11px] leading-tight text-[#0B6E6E]"
        title={regulatoryBasis}
      >
        {regulatoryBasis}
      </p>

      {/* CTA */}
      <div className="mt-auto flex items-center gap-2">
        {ctaDisabled ? (
          <button
            type="button"
            disabled
            title={
              quotaExhausted
                ? 'Upgrade for more — you have reached the Navigator monthly limit.'
                : 'Upgrade to generate documents.'
            }
            className="cursor-not-allowed rounded-md bg-[#E5E5E5] px-3 py-1.5 text-sm font-medium text-[#999]"
          >
            {quotaExhausted ? 'Upgrade for more' : ctaLabel}
          </button>
        ) : (
          <Link
            href={ctaHref}
            className="inline-flex items-center rounded-md bg-[#0B6E6E] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#085656]"
          >
            {ctaLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
