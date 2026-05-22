'use client';

// =============================================================================
// DimensionBreakdown — expandable list of all 8 readiness score dimensions.
// Sprint 4-C (US-006): shows per-dimension score with indicator drill-down.
// CLAUDE.md §7: colours and §8: dimension weights.
// =============================================================================

import { useState } from 'react';
import Link from 'next/link';

// Dimension configuration — labels, weights, and indicator explanations.
// Weights match DIMENSION_WEIGHTS in packages/core/src/compliance/readinessScore.ts.
// DO NOT change without product owner sign-off (CLAUDE.md §18).
const DIMENSIONS = [
  {
    key: 'capital_licensing',
    label: 'Capital & Licensing',
    weight: '20%',
    indicators: [
      'Minimum capital deposited in corporate bank account',
      'Capital source documented (audited or verified)',
      'ARIP application submitted to SEC Nigeria',
      'Fidelity bond in place (≥25% of shareholder fund)',
      'Paid-up capital verified by auditor',
      'Nigerian incorporation confirmed (CAC)',
      'CEO/MD resident in Nigeria',
      'Physical office in Nigeria established',
      'Minimum 4 sponsored individuals identified',
      'Managing Director appointed and sponsored',
      'Compliance Officer appointed and sponsored',
      'Sponsored individuals NIN/BVN verified',
      'Certificate of incorporation (certified)',
      'Memorandum of Association includes VASP powers',
      'CAC forms complete and certified',
      'Audited accounts available',
      'Tax Identification Number (TIN) obtained',
      'Tax clearance certificate obtained',
      'Registered solicitor/adviser engaged',
      'NFIU registration evidenced',
      'Other regulator no-objection obtained (if applicable)',
      'ARIP processing fee budgeted (₦2M non-refundable)',
      'Operational plan drafted',
      'Risk management framework included in operational plan',
      'Exit plan included in operational plan',
      'Customer communication strategy defined',
      'Customer risk disclosure plan in place',
      'Investor protection measures documented',
      'Data protection measures documented',
      'Team briefed on AIP promotional restrictions',
      'Customer growth baseline recorded on AIP receipt',
      'Weekly reporting system ready',
      'Monthly reporting system ready',
      'Quarterly reporting system ready',
      'Incident reporting process defined',
      'Fidelity bond covers ≥25% of shareholder fund',
    ],
  },
  {
    key: 'aml_cft_programme',
    label: 'AML/CFT Programme',
    weight: '20%',
    indicators: [
      'Business-Wide Risk Assessment (BWRA) documented',
      'AML/CFT Policy Manual drafted and approved',
      'Registered on NFIU goAML portal',
      'Money Laundering Reporting Officer (MLRO) appointed',
      'MLRO has required qualifications (ACAMS/ICA)',
    ],
  },
  {
    key: 'kyc_infrastructure',
    label: 'KYC Infrastructure',
    weight: '15%',
    indicators: [
      'NIN verification integrated into onboarding',
      'BVN verification integrated into onboarding',
      'Tiered KYC framework documented',
      'Enhanced Due Diligence (EDD) procedures defined',
      'PEP screening configured at onboarding',
    ],
  },
  {
    key: 'corporate_structure',
    label: 'Corporate Structure',
    weight: '10%',
    indicators: [
      'Registered with the Corporate Affairs Commission (CAC)',
      'Correct share structure and beneficial ownership register',
      'Nigerian CEO/MD is resident in Nigeria',
      'Board composition compliant with ARIP requirements',
      'Registered office address in Nigeria',
    ],
  },
  {
    key: 'transaction_monitoring',
    label: 'Transaction Monitoring',
    weight: '10%',
    indicators: [
      'Transaction monitoring system configured',
      'Alert thresholds set per NFIU AML/CFT Framework',
      'Daily alert review workflow active',
      'STR filing workflow tested on goAML portal',
      'CTR filing workflow tested on goAML portal',
    ],
  },
  {
    key: 'regulatory_reporting',
    label: 'Regulatory Reporting',
    weight: '10%',
    indicators: [
      'Registered on NFIU goAML reporting portal',
      'PEP register maintained (NFIU monthly format)',
      'Quarterly AML/CFT team training delivered',
      'Annual BWRA reviewed and updated',
      'Record retention configured (5-year minimum)',
    ],
  },
  {
    key: 'regulatory_relationships',
    label: 'Regulator Relationships',
    weight: '10%',
    indicators: [
      'SEC Nigeria contact logged in CRM',
      'CBN contact logged in CRM',
      'NFIU contact logged in CRM',
      'Pre-screening meeting conducted with SEC Nigeria',
      'Regulator communications documented',
    ],
  },
  {
    key: 'product_classification',
    label: 'Product Classification',
    weight: '5%',
    indicators: [
      'Product classified (DAX/DAOP/DAC/DAI/Payment)',
      'Legal opinion obtained on product classification',
      'White paper / disclosure document drafted',
      'Regulator notified of product classification',
    ],
  },
] as const;

function scoreColor(score: number): string {
  if (score <= 40) return '#C0392B';
  if (score <= 70) return '#D4A843';
  if (score <= 90) return '#1A7A4A';
  return '#0B6E6E';
}

export interface DimensionScore {
  capital_licensing: number;
  aml_cft_programme: number;
  kyc_infrastructure: number;
  corporate_structure: number;
  transaction_monitoring: number;
  regulatory_reporting: number;
  regulatory_relationships: number;
  product_classification: number;
}

export interface DimensionBreakdownProps {
  dimensions: DimensionScore;
}

export function DimensionBreakdown({ dimensions }: DimensionBreakdownProps): JSX.Element {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="divide-y divide-[#F5F5F5]">
      {DIMENSIONS.map((dim) => {
        const score = dimensions[dim.key as keyof DimensionScore] ?? 0;
        const color = scoreColor(score);
        const isOpen = expanded === dim.key;

        return (
          <div key={dim.key}>
            {/* Row — click to expand */}
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : dim.key)}
              className="flex w-full items-center gap-4 py-3 text-left transition hover:bg-[#FAFAFA]"
            >
              {/* Dimension label + weight */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#1A1A1A]">{dim.label}</span>
                  <span className="rounded bg-[#F5F5F5] px-1.5 py-0.5 text-[10px] font-semibold text-[#CCCCCC]">
                    {dim.weight}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#F5F5F5]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${score}%`, backgroundColor: color }}
                  />
                </div>
              </div>

              {/* Score number */}
              <span className="shrink-0 text-sm font-bold" style={{ color }}>
                {score}
                <span className="text-xs font-normal text-[#CCCCCC]">/100</span>
              </span>

              {/* Expand chevron */}
              <svg
                className={[
                  'h-4 w-4 shrink-0 text-[#CCCCCC] transition-transform duration-200',
                  isOpen ? 'rotate-180' : '',
                ].join(' ')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Expandable drawer */}
            {isOpen && (
              <div className="pb-4 pl-0">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#555555]">
                  This dimension covers:
                </p>
                <ul className="mb-3 space-y-1">
                  {dim.indicators.map((ind) => (
                    <li key={ind} className="flex items-start gap-2 text-xs text-[#555555]">
                      <span
                        className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                        aria-hidden="true"
                      />
                      {ind}
                    </li>
                  ))}
                </ul>
                <p className="mb-2 text-xs text-[#555555]">
                  Complete related roadmap tasks to improve this score.
                </p>
                <Link
                  href="/dashboard/roadmap"
                  className="text-xs font-semibold text-[#0B6E6E] hover:underline"
                >
                  View roadmap →
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
