'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  INFRASTRUCTURE_OPTIONS,
  STAGE_OPTIONS,
  type ReadinessReassessmentInput,
} from '@klarify/core';
import { CheckSolid, Spinner } from '@/components/icons';
import { track } from '@/lib/analytics/events';
import { submitReadinessReassessment } from '@/app/dashboard/readiness-assessment/actions';

const STEP_TITLES = ['Where are you now?', 'Your team', "What's already in place?"] as const;

const STEP_SUBTITLES = [
  'Be honest — this helps us give you the most accurate roadmap and score.',
  'A compliance officer dramatically improves your readiness score.',
  'Tick everything you currently have in place. This rebuilds your Readiness Score from scratch.',
] as const;

export interface ReadinessReassessmentDefaults {
  stage: string;
  team_size: number;
  has_compliance_officer: boolean;
  existing_infrastructure: string[];
}

export interface ReadinessReassessmentWizardProps {
  defaults: ReadinessReassessmentDefaults;
}

export function ReadinessReassessmentWizard({
  defaults,
}: ReadinessReassessmentWizardProps): JSX.Element {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [state, setState] = useState<ReadinessReassessmentDefaults>(defaults);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const toggleMulti = (key: keyof ReadinessReassessmentDefaults, value: string): void => {
    if (key !== 'existing_infrastructure') return;
    setState((prev) => {
      const list = prev.existing_infrastructure;
      return {
        ...prev,
        existing_infrastructure: list.includes(value)
          ? list.filter((v) => v !== value)
          : [...list, value],
      };
    });
  };

  const canProceed = (): boolean => {
    if (step === 1) return state.stage.length > 0;
    if (step === 2) return state.team_size >= 1;
    return true;
  };

  const handleSubmit = (): void => {
    setServerError(null);
    const payload: ReadinessReassessmentInput = {
      stage: state.stage as ReadinessReassessmentInput['stage'],
      team_size: state.team_size,
      has_compliance_officer: state.has_compliance_officer,
      existing_infrastructure: state.existing_infrastructure,
    };

    setIsPending(true);
    void submitReadinessReassessment(payload).then((result) => {
      if (result.error) {
        setServerError(result.error);
        setIsPending(false);
        return;
      }
      track('readiness_reassessment_completed', {
        score: result.score,
        infrastructure_count: state.existing_infrastructure.length,
      });
      router.push('/dashboard');
      router.refresh();
    });
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between text-xs text-[#555555]">
          <span>
            Step {step} of {STEP_TITLES.length}
          </span>
          <span>{Math.round((step / STEP_TITLES.length) * 100)}% complete</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[#F5F5F5]">
          <div
            className="h-full rounded-full bg-[#0B6E6E] transition-all duration-300"
            style={{ width: `${(step / STEP_TITLES.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-[#CCCCCC] bg-white p-6 shadow-sm sm:p-8">
        <h2 className="mb-1 text-xl font-bold text-[#1A1A1A]">{STEP_TITLES[step - 1]}</h2>
        <p className="mb-6 text-sm text-[#555555]">{STEP_SUBTITLES[step - 1]}</p>

        {step === 1 && (
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
                  {state.stage === opt.value && <CheckSolid className="text-white" />}
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#1A1A1A]">{opt.label}</p>
                  <p className="text-xs text-[#555555]">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
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
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    team_size: Math.max(1, parseInt(e.target.value, 10) || 1),
                  }))
                }
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
                  Under MLPPA 2022, a VASP must appoint a qualified MLRO. This will appear as a roadmap
                  task.
                </p>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
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
                    {checked && <CheckSolid className="h-2.5 w-2.5 text-white" />}
                  </span>
                  <span className="text-sm text-[#1A1A1A]">{opt.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {serverError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || isPending}
            className="rounded-lg border border-[#CCCCCC] px-5 py-2.5 text-sm font-medium text-[#555555] transition hover:border-[#0B6E6E] hover:text-[#0B6E6E] disabled:cursor-not-allowed disabled:opacity-30"
          >
            Back
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="rounded-lg bg-[#0B6E6E] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0D2B45] disabled:cursor-not-allowed disabled:opacity-40"
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
                  <Spinner className="animate-spin" />
                  Calculating score…
                </>
              ) : (
                'Calculate my score →'
              )}
            </button>
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-[#CCCCCC]">
        Completed roadmap tasks are still counted toward your score.{' '}
        <Link href="/dashboard" className="text-[#0B6E6E] hover:underline">
          Cancel and return to dashboard
        </Link>
      </p>
    </div>
  );
}
