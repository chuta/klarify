'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  RegulatoryIdentityCard,
  type ClassificationResult,
} from './RegulatoryIdentityCard';
import { Spinner } from '@/components/icons';
import { formatApiError } from '@/lib/apiError';
import {
  buildClassifyPayload,
  CLASSIFY_LIMITS,
  descriptionCounterTone,
  isClassifyFormValid,
  validateClassifyForm,
} from '@/lib/classifyFormValidation';

const LOADING_LINES = [
  'Reading your description…',
  'Looking up SEC Nigeria, CBN, and NFIU frameworks…',
  'Mapping your product against SEC Nigeria VASP categories (DAX, DAOP, AVASP, RATOP…)…',
  'Drafting your Regulatory Identity Card…',
];

interface ClassifyResponse {
  success: true;
  data: {
    id: string;
    result: ClassificationResult;
    meta: { model: string; chunksUsed: number; tokensUsed: number };
  };
}

type FieldErrors = ReturnType<typeof validateClassifyForm>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isClassifySuccess(body: unknown): body is ClassifyResponse {
  return (
    isRecord(body) &&
    body.success === true &&
    isRecord(body.data) &&
    isRecord(body.data.result)
  );
}

function counterTone(length: number): string {
  const tone = descriptionCounterTone(length);
  if (tone === 'over') return 'text-[#C0392B] font-semibold';
  if (tone === 'under') return 'text-[#D4A843]';
  return 'text-[#1A7A4A]';
}

export function ClassifyForm({ apiBaseUrl }: { apiBaseUrl: string }): JSX.Element {
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [featureDraft, setFeatureDraft] = useState('');
  const [businessModel, setBusinessModel] = useState('');
  const [targetUsers, setTargetUsers] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [classificationId, setClassificationId] = useState<string | null>(null);

  const descLen = description.trim().length;

  const formValues = useMemo(
    () => ({ description, features, businessModel, targetUsers, featureDraft }),
    [description, features, businessModel, targetUsers, featureDraft],
  );

  const canSubmit = isClassifyFormValid(formValues);

  function addFeature(): void {
    const v = featureDraft.trim();
    if (!v) return;
    if (v.length > CLASSIFY_LIMITS.maxFeatureLen) {
      setFieldErrors((prev) => ({
        ...prev,
        featureDraft: `Each feature must be ${CLASSIFY_LIMITS.maxFeatureLen} characters or fewer.`,
      }));
      return;
    }
    if (features.length >= CLASSIFY_LIMITS.maxFeatures) {
      setFieldErrors((prev) => ({
        ...prev,
        featureDraft: `Maximum ${CLASSIFY_LIMITS.maxFeatures} features.`,
      }));
      return;
    }
    setFeatures((prev) => [...prev, v]);
    setFeatureDraft('');
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.featureDraft;
      delete next.features;
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();

    const errors = validateClassifyForm(formValues);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Please complete all fields using the guidance below before classifying.');
      return;
    }

    const payload = buildClassifyPayload(formValues);

    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    setLoadingStep(0);

    const lineInterval = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_LINES.length - 1));
    }, 2500);

    try {
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error('You must be signed in to classify a product.');

      const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/ai/classify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const body: unknown = await res.json();

      if (!isClassifySuccess(body)) {
        const fallback =
          res.status === 402
            ? 'Monthly AI query limit reached. Upgrade to continue.'
            : res.status === 401
              ? 'Your session expired. Please sign in again.'
              : 'Classification failed. Please try again.';
        throw new Error(formatApiError(body, fallback));
      }

      setResult(body.data.result);
      setClassificationId(body.data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : formatApiError(err));
    } finally {
      clearInterval(lineInterval);
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-4">
        <RegulatoryIdentityCard
          result={result}
          classificationId={classificationId ?? undefined}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setClassificationId(null);
            }}
            className="rounded-lg border border-[#CCCCCC] bg-white px-4 py-2 text-sm font-medium text-[#1A1A1A] hover:bg-[#F5F5F5]"
          >
            Classify another product
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
      className="space-y-4"
    >
      {/* Requirements callout */}
      <div className="rounded-xl border border-[#0B6E6E]/30 bg-[#E6F4F4] px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#0B6E6E]">
          Before you classify
        </p>
        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-[#1A1A1A]">
          <li>
            <span className="font-semibold text-[#0D2B45]">Product description</span>{' '}
            — between {CLASSIFY_LIMITS.minDescription} and {CLASSIFY_LIMITS.maxDescription}{' '}
            characters. Too short or too long will block submission.
          </li>
          <li>
            <span className="font-semibold text-[#0D2B45]">Key features</span> — add at
            least one (press Enter after each). Max {CLASSIFY_LIMITS.maxFeatures} features,{' '}
            {CLASSIFY_LIMITS.maxFeatureLen} characters each.
          </li>
          <li>
            <span className="font-semibold text-[#0D2B45]">Business model</span> and{' '}
            <span className="font-semibold text-[#0D2B45]">Target users</span> — both
            required. Empty fields are not sent to the classifier.
          </li>
        </ul>
      </div>

      {/* Description */}
      <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
        <label htmlFor="description" className="block text-sm font-semibold text-[#1A1A1A]">
          Describe what your product does{' '}
          <span className="font-normal text-[#C0392B]">*</span>
        </label>
        <p className="mt-1 text-xs text-[#777]">
          Aim for 2–4 sentences: what the product does, who uses it, and how you earn
          revenue. Minimum {CLASSIFY_LIMITS.minDescription} characters, maximum{' '}
          {CLASSIFY_LIMITS.maxDescription}.
        </p>
        <textarea
          id="description"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            if (fieldErrors.description) {
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.description;
                return next;
              });
            }
          }}
          rows={6}
          maxLength={CLASSIFY_LIMITS.maxDescription}
          placeholder="e.g. We let users buy and sell Bitcoin and USDT using naira bank transfers. We make money on a 0.2% spread per trade. Users in Nigeria connect their bank account and trade in-app."
          className={`mt-3 block w-full resize-none rounded-lg border bg-white p-3 text-sm leading-relaxed text-[#1A1A1A] placeholder:text-[#999] focus:outline-none ${
            fieldErrors.description
              ? 'border-[#C0392B] focus:border-[#C0392B]'
              : 'border-[#CCCCCC] focus:border-[#0B6E6E]'
          }`}
          disabled={submitting}
          aria-invalid={Boolean(fieldErrors.description)}
          aria-describedby="description-hint description-counter"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <span id="description-hint" className="text-[#777]">
            Required · {CLASSIFY_LIMITS.minDescription}–{CLASSIFY_LIMITS.maxDescription}{' '}
            characters
          </span>
          <span
            id="description-counter"
            className={counterTone(descLen)}
          >
            {descLen} / {CLASSIFY_LIMITS.minDescription} min ·{' '}
            {CLASSIFY_LIMITS.maxDescription} max
          </span>
        </div>
        {fieldErrors.description ? (
          <p className="mt-1 text-xs text-[#C0392B]">{fieldErrors.description}</p>
        ) : null}
      </div>

      {/* Supplementary fields — all required */}
      <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1A1A1A]">
          Product details <span className="font-normal text-[#C0392B]">*</span>
        </h2>
        <p className="mt-1 text-xs text-[#777]">
          All fields below are required for an accurate Regulatory Identity Card.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="features" className="block text-xs font-semibold text-[#1A1A1A]">
              Key features <span className="text-[#C0392B]">*</span>
            </label>
            <p className="text-[11px] text-[#777]">
              Press Enter after each feature. At least one required · max{' '}
              {CLASSIFY_LIMITS.maxFeatures}.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {features.map((f, i) => (
                <span
                  key={`${f}-${i}`}
                  className="inline-flex items-center gap-1 rounded-full bg-[#E6F4F4] px-2 py-0.5 text-xs text-[#0B6E6E]"
                >
                  {f}
                  <button
                    type="button"
                    onClick={() =>
                      setFeatures((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="text-[#0B6E6E] hover:text-[#0a5a5a]"
                    aria-label={`Remove feature ${f}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              id="features"
              type="text"
              value={featureDraft}
              onChange={(e) => setFeatureDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addFeature();
                }
              }}
              placeholder="e.g. naira on-ramp, KYC tier 2, mobile-first"
              className={`mt-2 block w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none ${
                fieldErrors.features || fieldErrors.featureDraft
                  ? 'border-[#C0392B] focus:border-[#C0392B]'
                  : 'border-[#CCCCCC] focus:border-[#0B6E6E]'
              }`}
              disabled={submitting}
              maxLength={CLASSIFY_LIMITS.maxFeatureLen}
            />
            {fieldErrors.features ? (
              <p className="mt-1 text-xs text-[#C0392B]">{fieldErrors.features}</p>
            ) : null}
            {fieldErrors.featureDraft ? (
              <p className="mt-1 text-xs text-[#C0392B]">{fieldErrors.featureDraft}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="business-model" className="block text-xs font-semibold text-[#1A1A1A]">
              Business model <span className="text-[#C0392B]">*</span>
            </label>
            <p className="text-[11px] text-[#777]">
              How you earn revenue — fees, spreads, subscriptions, etc. Max{' '}
              {CLASSIFY_LIMITS.maxBusinessModel} characters.
            </p>
            <input
              id="business-model"
              type="text"
              value={businessModel}
              onChange={(e) => setBusinessModel(e.target.value)}
              placeholder="e.g. 0.2% trading fee + 1% conversion spread"
              className={`mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none ${
                fieldErrors.businessModel
                  ? 'border-[#C0392B] focus:border-[#C0392B]'
                  : 'border-[#CCCCCC] focus:border-[#0B6E6E]'
              }`}
              disabled={submitting}
              maxLength={CLASSIFY_LIMITS.maxBusinessModel}
              required
            />
            {fieldErrors.businessModel ? (
              <p className="mt-1 text-xs text-[#C0392B]">{fieldErrors.businessModel}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="target-users" className="block text-xs font-semibold text-[#1A1A1A]">
              Target users <span className="text-[#C0392B]">*</span>
            </label>
            <p className="text-[11px] text-[#777]">
              Who uses the product and in which markets. Max{' '}
              {CLASSIFY_LIMITS.maxTargetUsers} characters.
            </p>
            <input
              id="target-users"
              type="text"
              value={targetUsers}
              onChange={(e) => setTargetUsers(e.target.value)}
              placeholder="e.g. retail crypto investors in Nigeria, ages 25–40"
              className={`mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none ${
                fieldErrors.targetUsers
                  ? 'border-[#C0392B] focus:border-[#C0392B]'
                  : 'border-[#CCCCCC] focus:border-[#0B6E6E]'
              }`}
              disabled={submitting}
              maxLength={CLASSIFY_LIMITS.maxTargetUsers}
              required
            />
            {fieldErrors.targetUsers ? (
              <p className="mt-1 text-xs text-[#C0392B]">{fieldErrors.targetUsers}</p>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-[#C0392B]/40 bg-[#FCEAE8] px-4 py-3 text-sm text-[#7a1f15]">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting || !canSubmit}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0B6E6E] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0a5a5a] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? (
          <span className="flex items-center gap-2">
            <Spinner className="animate-spin" />
            <span>{LOADING_LINES[loadingStep]}</span>
          </span>
        ) : (
          <>Classify My Product</>
        )}
      </button>

      {!canSubmit && !submitting ? (
        <p className="text-center text-[11px] text-[#777]">
          Complete all required fields above to enable classification.
        </p>
      ) : null}

      <p className="text-[11px] text-[#777]">
        Classification uses Claude Opus + the Klarify regulatory corpus. Takes 6–15 seconds.
        This is regulatory information, not legal advice — always verify with a qualified
        practitioner.
      </p>
    </form>
  );
}
