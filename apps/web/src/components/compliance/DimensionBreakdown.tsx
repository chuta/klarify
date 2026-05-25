'use client';

// =============================================================================
// DimensionBreakdown — compact 4×2 mini radial gauge grid + slide-over detail.
// Sprint 4-C (US-006): per-dimension score with indicator drill-down.
// CLAUDE.md §7: colours and §8: dimension weights.
// =============================================================================

import { useMemo, useState } from 'react';
import { MiniRadialGauge } from './MiniRadialGauge';
import { DimensionDetailSlideOver } from './DimensionDetailSlideOver';
import type { DimensionDetail } from './DimensionDetailSlideOver';

// Dimension configuration — labels, weights, and indicator explanations.
// Weights match DIMENSION_WEIGHTS in packages/core/src/compliance/readinessScore.ts.
// DO NOT change without product owner sign-off (CLAUDE.md §18).
const DIMENSIONS: readonly DimensionDetail[] = [
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

export function scoreColor(score: number): string {
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
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const sortedDimensions = useMemo(() => {
    return [...DIMENSIONS].sort((a, b) => {
      const scoreA = dimensions[a.key as keyof DimensionScore] ?? 0;
      const scoreB = dimensions[b.key as keyof DimensionScore] ?? 0;
      return scoreA - scoreB;
    });
  }, [dimensions]);

  const selected = selectedKey
    ? DIMENSIONS.find((d) => d.key === selectedKey) ?? null
    : null;

  const selectedScore = selected
    ? (dimensions[selected.key as keyof DimensionScore] ?? 0)
    : 0;

  return (
    <>
      <p className="mb-3 text-xs text-[#555555]">
        Sorted by lowest score first. Tap a dimension for indicators and roadmap links.
      </p>

      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3"
        data-testid="dimension-gauge-grid"
      >
        {sortedDimensions.map((dim) => {
          const score = dimensions[dim.key as keyof DimensionScore] ?? 0;
          const isSelected = selectedKey === dim.key;

          return (
            <button
              key={dim.key}
              type="button"
              onClick={() => setSelectedKey(dim.key)}
              className={[
                'flex flex-col items-center rounded-xl border px-2 py-3 text-center transition',
                isSelected
                  ? 'border-[#0B6E6E] bg-[#E6F4F4]'
                  : 'border-transparent hover:border-[#E6F4F4] hover:bg-[#FAFAFA]',
              ].join(' ')}
              aria-label={`${dim.label}: ${score} out of 100. ${dim.weight} weight.`}
            >
              <MiniRadialGauge score={score} size={56} />
              <span className="mt-2 line-clamp-2 text-[11px] font-medium leading-tight text-[#1A1A1A]">
                {dim.label}
              </span>
              <span className="mt-0.5 text-[10px] font-semibold text-[#CCCCCC]">
                {dim.weight}
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <DimensionDetailSlideOver
          dimension={selected}
          score={selectedScore}
          onClose={() => setSelectedKey(null)}
        />
      )}
    </>
  );
}
