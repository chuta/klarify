'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  RegulatoryIdentityCard,
  type ClassificationResult,
} from './RegulatoryIdentityCard';
import { Spinner } from '@/components/icons';

const MIN_DESCRIPTION = 50;

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
interface ClassifyError {
  success: false;
  error: string;
  code?: string;
}

export function ClassifyForm({ apiBaseUrl }: { apiBaseUrl: string }): JSX.Element {
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [featureDraft, setFeatureDraft] = useState('');
  const [businessModel, setBusinessModel] = useState('');
  const [targetUsers, setTargetUsers] = useState('');
  const [showOptional, setShowOptional] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [classificationId, setClassificationId] = useState<string | null>(null);

  function addFeature(): void {
    const v = featureDraft.trim();
    if (!v) return;
    if (features.length >= 20) return;
    setFeatures((prev) => [...prev, v]);
    setFeatureDraft('');
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (description.trim().length < MIN_DESCRIPTION) {
      setError(`Please add a bit more detail — at least ${MIN_DESCRIPTION} characters.`);
      return;
    }
    setError(null);
    setSubmitting(true);
    setLoadingStep(0);

    // Animate the reassuring copy while Opus thinks.
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
        body: JSON.stringify({
          description: description.trim(),
          features: features.length > 0 ? features : undefined,
          businessModel: businessModel.trim() || undefined,
          targetUsers: targetUsers.trim() || undefined,
        }),
      });

      const body = (await res.json()) as ClassifyResponse | ClassifyError;
      if (!body.success) {
        throw new Error(body.error ?? 'Classification failed.');
      }
      setResult(body.data.result);
      setClassificationId(body.data.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      clearInterval(lineInterval);
      setSubmitting(false);
    }
  }

  // Step 2 — results
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

  // Step 1 — input form / loading state
  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
      className="space-y-4"
    >
      <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
        <label htmlFor="description" className="block text-sm font-semibold text-[#1A1A1A]">
          Describe what your product does
        </label>
        <p className="mt-1 text-xs text-[#777]">
          The more detail you give, the more accurate the classification. Aim for 2–4
          sentences covering what the product does, who uses it, and how you earn revenue.
        </p>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          placeholder="e.g. We let users buy and sell Bitcoin and USDT using naira bank transfers. We make money on a 0.2% spread per trade. Users in Nigeria connect their bank account and trade in-app."
          className="mt-3 block w-full resize-none rounded-lg border border-[#CCCCCC] bg-white p-3 text-sm leading-relaxed text-[#1A1A1A] placeholder:text-[#999] focus:border-[#0B6E6E] focus:outline-none"
          disabled={submitting}
        />
        <div className="mt-2 flex items-center justify-between text-[11px] text-[#777]">
          <span>
            {description.length} / {MIN_DESCRIPTION} minimum
          </span>
        </div>
      </div>

      {/* Optional fields */}
      <div className="rounded-2xl border border-[#E5E5E5] bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setShowOptional((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-3 text-left"
        >
          <span className="text-sm font-semibold text-[#1A1A1A]">
            Add more detail (optional)
          </span>
          <span className="text-xs text-[#0B6E6E]">{showOptional ? 'Hide' : 'Show'}</span>
        </button>
        {showOptional && (
          <div className="space-y-4 border-t border-[#F5F5F5] px-5 py-4">
            <div>
              <label className="block text-xs font-semibold text-[#1A1A1A]">
                Key features
              </label>
              <p className="text-[11px] text-[#777]">
                Press Enter after each feature. Max 20.
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
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
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
                className="mt-2 block w-full rounded-lg border border-[#CCCCCC] bg-white px-3 py-2 text-sm focus:border-[#0B6E6E] focus:outline-none"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A1A1A]">
                Business model
              </label>
              <input
                type="text"
                value={businessModel}
                onChange={(e) => setBusinessModel(e.target.value)}
                placeholder="e.g. 0.2% trading fee + 1% conversion spread"
                className="mt-1 block w-full rounded-lg border border-[#CCCCCC] bg-white px-3 py-2 text-sm focus:border-[#0B6E6E] focus:outline-none"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A1A1A]">
                Target users
              </label>
              <input
                type="text"
                value={targetUsers}
                onChange={(e) => setTargetUsers(e.target.value)}
                placeholder="e.g. retail crypto investors in Nigeria, ages 25–40"
                className="mt-1 block w-full rounded-lg border border-[#CCCCCC] bg-white px-3 py-2 text-sm focus:border-[#0B6E6E] focus:outline-none"
                disabled={submitting}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-[#C0392B]/40 bg-[#FCEAE8] px-4 py-3 text-sm text-[#7a1f15]">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || description.trim().length < MIN_DESCRIPTION}
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

      <p className="text-[11px] text-[#777]">
        Classification uses Claude Opus + the Klarify regulatory corpus. Takes 6–15 seconds.
        This is regulatory information, not legal advice — always verify with a qualified
        practitioner.
      </p>
    </form>
  );
}
