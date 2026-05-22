'use client';

import { useState } from 'react';
import Link from 'next/link';
import { submitOnboarding } from './actions';
import type { OnboardingCompleteInput } from '@klarify/core';

// ── Step data definitions ──────────────────────────────────────────────────────

const PRODUCT_TYPE_OPTIONS = [
  { value: 'DAX',     label: 'Digital Asset Exchange',       desc: 'Secondary market trading platform' },
  { value: 'DAOP',    label: 'Offering Platform',            desc: 'Primary token issuance to investors' },
  { value: 'DAC',     label: 'Digital Asset Custodian',      desc: 'Holds/safeguards assets for clients' },
  { value: 'DAI',     label: 'Digital Asset Intermediary',   desc: 'Broker, advisor, or agent role' },
  { value: 'PAYMENT', label: 'Payment Product',              desc: 'Naira on/off-ramps, stablecoin rails' },
  { value: 'HYBRID',  label: 'Hybrid',                       desc: 'Spans two or more categories above' },
] as const;

const MARKET_OPTIONS = [
  { value: 'NG', label: 'Nigeria', flag: '🇳🇬' },
  { value: 'GH', label: 'Ghana',   flag: '🇬🇭' },
  { value: 'KE', label: 'Kenya',   flag: '🇰🇪' },
  { value: 'ZA', label: 'South Africa', flag: '🇿🇦' },
  { value: 'MU', label: 'Mauritius', flag: '🇲🇺' },
] as const;

const STAGE_OPTIONS = [
  { value: 'idea',     label: 'Idea Stage',       desc: 'I have a concept but haven\'t started building' },
  { value: 'building', label: 'Building',          desc: 'Actively developing the product' },
  { value: 'launched', label: 'Launched',          desc: 'Live with real users, no licence yet' },
  { value: 'arip',     label: 'ARIP in Progress',  desc: 'SEC approval-in-principle process started' },
  { value: 'licensed', label: 'Licensed',          desc: 'Full regulatory licence obtained' },
] as const;

// Key indicators to ask about in step 5 — grouped by dimension
const INFRASTRUCTURE_OPTIONS = [
  { key: 'corporate_structure.cac_registered',              label: 'Registered with the Corporate Affairs Commission (CAC)' },
  { key: 'corporate_structure.correct_share_structure',     label: 'Share structure meets SEC minimum capital thresholds' },
  { key: 'corporate_structure.nigerian_ceo_resident',       label: 'CEO/MD is resident in Nigeria' },
  { key: 'capital_licensing.minimum_capital_deposited',     label: 'Minimum paid-up capital deposited and documented' },
  { key: 'capital_licensing.capital_source_documented',     label: 'Source of capital funds documented' },
  { key: 'capital_licensing.arip_application_submitted',    label: 'ARIP application submitted to SEC Nigeria' },
  { key: 'aml_cft_programme.bwra_documented',              label: 'Business-Wide Risk Assessment (BWRA) documented' },
  { key: 'aml_cft_programme.aml_policy_in_place',          label: 'AML/CFT Policy Manual drafted and adopted' },
  { key: 'aml_cft_programme.nfiu_goaml_registered',        label: 'Registered on the NFIU goAML portal' },
  { key: 'aml_cft_programme.mlro_appointed',               label: 'Money Laundering Reporting Officer (MLRO) appointed' },
  { key: 'kyc_infrastructure.nin_verification_integrated',  label: 'NIN (National Identity Number) verification integrated' },
  { key: 'kyc_infrastructure.bvn_verification_integrated',  label: 'BVN (Bank Verification Number) verification integrated' },
  { key: 'kyc_infrastructure.tiered_kyc_documented',       label: 'Tiered KYC framework documented' },
  { key: 'product_classification.product_classified',       label: 'Product formally classified under SEC Digital Asset Rules' },
  { key: 'product_classification.legal_opinion_obtained',   label: 'Legal opinion on product classification obtained' },
] as const;

// ── Wizard state ──────────────────────────────────────────────────────────────

interface WizardState {
  product_types: string[];
  target_markets: string[];
  stage: string;
  team_size: number;
  has_compliance_officer: boolean;
  existing_infrastructure: string[];
}

const INITIAL_STATE: WizardState = {
  product_types: [],
  target_markets: [],
  stage: '',
  team_size: 1,
  has_compliance_officer: false,
  existing_infrastructure: [],
};

const STEP_TITLES = [
  'What are you building?',
  'Target markets',
  'Where are you now?',
  'Your team',
  'What\'s already in place?',
];

const STEP_SUBTITLES = [
  'Select all product types that apply to your project.',
  'Select all markets you are currently targeting or plan to target.',
  'Be honest — this helps us give you the most accurate roadmap.',
  'A compliance officer dramatically improves your readiness score.',
  'Tell us what compliance infrastructure you already have. This seeds your initial Readiness Score.',
];

// ── Wizard component ──────────────────────────────────────────────────────────

export interface OnboardingWizardProps {
  initialStep?: number;
}

export function OnboardingWizard({ initialStep = 1 }: OnboardingWizardProps): JSX.Element {
  const [step, setStep] = useState(initialStep);
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const totalSteps = 5;
  const progress = ((step - 1) / (totalSteps - 1)) * 100;

  function toggleMulti(field: 'product_types' | 'target_markets' | 'existing_infrastructure', value: string): void {
    setState((prev) => {
      const arr = prev[field];
      const next = arr.includes(value)
        ? arr.filter((v) => v !== value)
        : [...arr, value];
      return { ...prev, [field]: next };
    });
  }

  function canProceed(): boolean {
    switch (step) {
      case 1: return state.product_types.length > 0;
      case 2: return state.target_markets.length > 0;
      case 3: return state.stage !== '';
      case 4: return state.team_size >= 1;
      case 5: return true; // infrastructure is optional
      default: return false;
    }
  }

  function handleNext(): void {
    if (step < totalSteps) {
      setStep((s) => s + 1);
      setServerError(null);
    }
  }

  function handleBack(): void {
    if (step > 1) setStep((s) => s - 1);
  }

  function handleSubmit(): void {
    setServerError(null);
    const payload: OnboardingCompleteInput = {
      product_types: state.product_types as OnboardingCompleteInput['product_types'],
      target_markets: state.target_markets as OnboardingCompleteInput['target_markets'],
      stage: state.stage as OnboardingCompleteInput['stage'],
      team_size: state.team_size,
      has_compliance_officer: state.has_compliance_officer,
      existing_infrastructure: state.existing_infrastructure,
    };

    setIsPending(true);
    submitOnboarding(payload).then((result) => {
      if (result?.error) {
        setServerError(result.error);
        setIsPending(false);
      }
      // On success the server action throws a redirect — component unmounts.
    }).catch(() => {
      setServerError('Something went wrong. Please try again.');
      setIsPending(false);
    });
  }

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs text-[#555555]">
          <span>Step {step} of {totalSteps}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#F5F5F5]">
          <div
            className="h-full rounded-full bg-[#0B6E6E] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step dots */}
        <div className="mt-3 flex justify-between">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={[
                'h-2 w-2 rounded-full transition-colors duration-300',
                i + 1 < step  ? 'bg-[#0B6E6E]'   : '',
                i + 1 === step ? 'bg-[#0B6E6E]'   : '',
                i + 1 > step  ? 'bg-[#CCCCCC]'   : '',
              ].join(' ')}
            />
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-[#CCCCCC] bg-white p-8 shadow-sm">
        <h2 className="mb-1 text-xl font-semibold text-[#1A1A1A]">
          {STEP_TITLES[step - 1]}
        </h2>
        <p className="mb-6 text-sm text-[#555555]">{STEP_SUBTITLES[step - 1]}</p>

        {/* ── Step content ── */}
        {step === 1 && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {PRODUCT_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleMulti('product_types', opt.value)}
                  className={[
                    'rounded-xl border-2 p-4 text-left transition',
                    state.product_types.includes(opt.value)
                      ? 'border-[#0B6E6E] bg-[#E6F4F4]'
                      : 'border-[#CCCCCC] hover:border-[#0B6E6E]/40',
                  ].join(' ')}
                >
                  <p className="text-sm font-semibold text-[#1A1A1A]">{opt.label}</p>
                  <p className="mt-0.5 text-xs text-[#555555]">{opt.desc}</p>
                </button>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-4 rounded-xl border border-[#D4A843]/40 bg-[#FDF6E3] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#1A1A1A]">Not sure which category fits?</p>
                <p className="mt-0.5 text-xs text-[#555555]">
                  Describe your product in plain language. Klarify will classify it against Nigerian
                  regulatory frameworks and tell you which licences you need.
                </p>
              </div>
              <Link
                href="/dashboard/classify"
                className="shrink-0 rounded-lg border border-[#D4A843] bg-white px-4 py-2.5 text-center text-sm font-semibold text-[#D4A843] transition hover:bg-[#D4A843]/10"
              >
                Classify your product →
              </Link>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {MARKET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleMulti('target_markets', opt.value)}
                className={[
                  'flex items-center gap-3 rounded-xl border-2 p-4 text-left transition',
                  state.target_markets.includes(opt.value)
                    ? 'border-[#0B6E6E] bg-[#E6F4F4]'
                    : 'border-[#CCCCCC] hover:border-[#0B6E6E]/40',
                ].join(' ')}
              >
                <span className="text-2xl">{opt.flag}</span>
                <span className="text-sm font-medium text-[#1A1A1A]">{opt.label}</span>
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2">
            {STAGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setState((prev) => ({ ...prev, stage: opt.value }))}
                className={[
                  'flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition',
                  state.stage === opt.value
                    ? 'border-[#0B6E6E] bg-[#E6F4F4]'
                    : 'border-[#CCCCCC] hover:border-[#0B6E6E]/40',
                ].join(' ')}
              >
                <span
                  className={[
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                    state.stage === opt.value
                      ? 'border-[#0B6E6E] bg-[#0B6E6E]'
                      : 'border-[#CCCCCC]',
                  ].join(' ')}
                >
                  {state.stage === opt.value && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#1A1A1A]">{opt.label}</p>
                  <p className="text-xs text-[#555555]">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div>
              <label htmlFor="team_size" className="mb-2 block text-sm font-medium text-[#1A1A1A]">
                How many people are on your team?
              </label>
              <input
                id="team_size"
                type="number"
                min={1}
                max={10000}
                value={state.team_size}
                onChange={(e) => setState((prev) => ({ ...prev, team_size: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                className="w-full rounded-lg border border-[#CCCCCC] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#0B6E6E] focus:outline-none focus:ring-2 focus:ring-[#0B6E6E]/20"
              />
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-[#1A1A1A]">
                Do you have a dedicated Compliance Officer?
              </p>
              <div className="flex gap-3">
                {[true, false].map((val) => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => setState((prev) => ({ ...prev, has_compliance_officer: val }))}
                    className={[
                      'flex-1 rounded-xl border-2 py-3 text-sm font-semibold transition',
                      state.has_compliance_officer === val
                        ? val
                          ? 'border-[#1A7A4A] bg-[#1A7A4A]/10 text-[#1A7A4A]'
                          : 'border-[#C0392B] bg-[#C0392B]/10 text-[#C0392B]'
                        : 'border-[#CCCCCC] text-[#555555] hover:border-[#CCCCCC]/60',
                    ].join(' ')}
                  >
                    {val ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
              {!state.has_compliance_officer && (
                <p className="mt-2 text-xs text-[#C0392B]">
                  Under MLPPA 2022, a VASP must appoint a qualified MLRO. This will appear as a roadmap task.
                </p>
              )}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-2">
            {INFRASTRUCTURE_OPTIONS.map((opt) => {
              const checked = state.existing_infrastructure.includes(opt.key);
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => toggleMulti('existing_infrastructure', opt.key)}
                  className={[
                    'flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition',
                    checked
                      ? 'border-[#0B6E6E] bg-[#E6F4F4]'
                      : 'border-[#CCCCCC] hover:border-[#0B6E6E]/40 hover:bg-[#FAFAFA]',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                      checked ? 'border-[#0B6E6E] bg-[#0B6E6E]' : 'border-[#CCCCCC]',
                    ].join(' ')}
                  >
                    {checked && (
                      <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className="text-sm text-[#1A1A1A]">{opt.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Server error */}
        {serverError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1}
            className="rounded-lg border border-[#CCCCCC] px-5 py-2.5 text-sm font-medium text-[#555555] transition hover:border-[#0B6E6E] hover:text-[#0B6E6E] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Back
          </button>

          {step < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className="rounded-lg bg-[#0B6E6E] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0D2B45] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-[#0B6E6E] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0D2B45] disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Calculating score…
                </>
              ) : (
                'Calculate my score →'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Trust note */}
      <p className="mt-4 text-center text-xs text-[#CCCCCC]">
        Your answers are stored securely and used only to personalise your compliance roadmap.
      </p>
    </div>
  );
}
