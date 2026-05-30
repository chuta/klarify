'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SCENARIO_TEMPLATES, SCENARIO_DISCLAIMER, type ScenarioResult } from '@klarify/core';
import { CitationBadge, coreCitationToBadge } from '@/components/chat/CitationBadge';
import { track } from '@/lib/analytics/events';

const MIN_CHARS = 30;
const MAX_CHARS = 2000;

interface HistoryItem {
  id: string;
  scenarioSummary: string;
  templateId: string | null;
  createdAt: string;
}

interface ScenarioResponse {
  success: true;
  data: {
    analysisId: string;
    result: ScenarioResult;
  };
}

interface ApiError {
  success: false;
  error: string;
  code?: string;
}

interface Props {
  apiBaseUrl: string;
  hasAccess: boolean;
}

const OUTCOME_CONFIG = [
  { key: 'best_case' as const, title: 'Best Case', border: '#1A7A4A' },
  { key: 'likely_case' as const, title: 'Likely Case', border: '#D4A843' },
  { key: 'worst_case' as const, title: 'Worst Case', border: '#C0392B' },
];

export function ScenarioSimulator({ apiBaseUrl, hasAccess }: Props): JSX.Element {
  const [scenario, setScenario] = useState('');
  const [templateId, setTemplateId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [iteration, setIteration] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const base = apiBaseUrl.replace(/\/$/, '');

  const loadHistory = useCallback(async (): Promise<void> => {
    if (!hasAccess) return;
    const supabase = createClient();
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) return;
    const res = await fetch(`${base}/api/ai/scenario/history`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await res.json()) as { success: boolean; data?: HistoryItem[] };
    if (body.success && body.data) setHistory(body.data);
  }, [base, hasAccess]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  async function runAnalysis(
    text: string,
    opts?: { parentAnalysisId?: string; template?: string },
  ): Promise<void> {
    if (text.trim().length < MIN_CHARS) {
      setError(`Describe your scenario in at least ${MIN_CHARS} characters.`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error('You must be signed in.');

      const res = await fetch(`${base}/api/ai/scenario`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          scenario: text.trim(),
          templateId: opts?.template ?? templateId,
          parentAnalysisId: opts?.parentAnalysisId,
        }),
      });
      const body = (await res.json()) as ScenarioResponse | ApiError;
      if (!body.success) throw new Error(body.error ?? 'Analysis failed.');
      setResult(body.data.result);
      setAnalysisId(body.data.analysisId);
      setScenario(text.trim());
      track('ai_query_made', { surface: 'scenario' });
      await loadHistory();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function loadAnalysis(id: string): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) return;
      const res = await fetch(`${base}/api/ai/scenario/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json()) as {
        success: boolean;
        data?: { result: ScenarioResult; id: string; scenarioText: string };
      };
      if (!body.success || !body.data) throw new Error('Could not load analysis.');
      setResult(body.data.result);
      setAnalysisId(body.data.id);
      setScenario(body.data.scenarioText);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function reset(): void {
    setResult(null);
    setAnalysisId(null);
    setScenario('');
    setTemplateId(undefined);
    setIteration('');
    setError(null);
  }

  if (!hasAccess) {
    return (
      <div className="rounded-2xl border border-[#0B6E6E] bg-[#E6F4F4] p-8">
        <p className="text-lg font-semibold text-[#0D2B45]">Available on Compass plan</p>
        <p className="mt-2 text-sm text-[#555]">
          Scenario Simulator lets you stress-test regulatory decisions before you make them —
          with Best, Likely, and Worst case outcomes grounded in African frameworks.
        </p>
        <Link
          href="/dashboard/billing?plan=compass"
          className="mt-4 inline-block rounded-lg bg-[#0B6E6E] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Upgrade to Compass →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <aside className="lg:w-72 lg:shrink-0">
        <div className="rounded-xl border border-[#CCCCCC] bg-white p-4">
          <h2 className="text-sm font-semibold text-[#1A1A1A]">Recent scenarios</h2>
          {history.length === 0 ? (
            <p className="mt-2 text-xs text-[#555]">Your analyses will appear here.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {history.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => void loadAnalysis(item.id)}
                    className="w-full rounded-lg px-2 py-2 text-left text-xs hover:bg-[#E6F4F4]"
                  >
                    <span className="line-clamp-2 text-[#1A1A1A]">{item.scenarioSummary}</span>
                    <span className="mt-1 block text-[#999]">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-4 rounded-lg border border-[#CCCCCC] bg-[#F5F5F5] px-4 py-3 text-xs text-[#555]">
          {SCENARIO_DISCLAIMER}
        </div>

        {!result ? (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              {SCENARIO_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setScenario(t.prefillText);
                    setTemplateId(t.id);
                  }}
                  className={`rounded-xl border p-4 text-left transition ${
                    templateId === t.id
                      ? 'border-[#0B6E6E] bg-[#E6F4F4]'
                      : 'border-[#CCCCCC] bg-white hover:border-[#0B6E6E]/50'
                  }`}
                >
                  <p className="text-sm font-semibold text-[#0D2B45]">{t.title}</p>
                  <p className="mt-1 text-xs text-[#555]">{t.description}</p>
                </button>
              ))}
            </div>

            <label className="block text-sm font-medium text-[#1A1A1A]">
              Describe your scenario
              <textarea
                value={scenario}
                onChange={(e) => setScenario(e.target.value.slice(0, MAX_CHARS))}
                rows={8}
                className="mt-2 w-full rounded-xl border border-[#CCCCCC] px-4 py-3 text-sm"
                placeholder="What are you planning to do, and what regulatory tension does it create?"
              />
            </label>
            <p className="mt-1 text-xs text-[#999]">
              {scenario.trim().length}/{MAX_CHARS} characters (min {MIN_CHARS})
            </p>

            {error && <p className="mt-3 text-sm text-[#C0392B]">{error}</p>}

            <button
              type="button"
              disabled={loading || scenario.trim().length < MIN_CHARS}
              onClick={() => void runAnalysis(scenario)}
              className="mt-4 rounded-lg bg-[#0B6E6E] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? 'Analysing regulatory consequences…' : 'Analyse Scenario'}
            </button>
            {loading && (
              <p className="mt-2 text-xs text-[#555]">This usually takes 10–20 seconds.</p>
            )}
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-[#555]">{result.scenario_summary}</p>

            <div className="grid gap-4 lg:grid-cols-3">
              {OUTCOME_CONFIG.map(({ key, title, border }) => {
                const outcome = result.outcomes[key];
                return (
                  <div
                    key={key}
                    className="rounded-xl border border-[#CCCCCC] bg-white p-4"
                    style={{ borderTopWidth: 4, borderTopColor: border }}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-semibold text-[#0D2B45]">{title}</h3>
                      <span className="rounded-full bg-[#E6F4F4] px-2 py-0.5 font-mono text-[10px] text-[#0B6E6E]">
                        {outcome.probability}
                      </span>
                    </div>
                    <p className="text-sm text-[#1A1A1A]">{outcome.summary}</p>
                    <p className="mt-3 font-mono text-xs text-[#0B6E6E]">{outcome.regulatory_basis}</p>
                    <p className="mt-2 text-xs text-[#555]">
                      <span className="font-semibold">Business impact: </span>
                      {outcome.business_impact}
                    </p>
                    <p className="mt-2 text-xs text-[#555]">
                      <span className="font-semibold">Mitigation: </span>
                      {outcome.recommended_mitigation}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {outcome.citations.map((cite, i) => (
                        <CitationBadge key={`${key}-${i}`} citation={coreCitationToBadge(cite)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {result.key_assumptions.length > 0 && (
              <div className="mt-6 rounded-xl border border-[#CCCCCC] bg-[#FAFAFA] p-4">
                <h3 className="text-sm font-semibold text-[#1A1A1A]">Key assumptions</h3>
                <ul className="mt-2 list-disc pl-5 text-sm text-[#555]">
                  {result.key_assumptions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 rounded-xl border border-[#CCCCCC] p-4">
              <label className="block text-sm font-medium text-[#1A1A1A]">
                What if you do something different?
                <input
                  value={iteration}
                  onChange={(e) => setIteration(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm"
                  placeholder='e.g. "What if I apply for ARIP before launching?"'
                />
              </label>
              <button
                type="button"
                disabled={loading || iteration.trim().length < MIN_CHARS || !analysisId}
                onClick={() =>
                  void runAnalysis(iteration, { parentAnalysisId: analysisId ?? undefined })
                }
                className="mt-3 rounded-lg border border-[#0B6E6E] px-4 py-2 text-sm font-semibold text-[#0B6E6E]"
              >
                Run iteration
              </button>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={reset}
                className="rounded-lg bg-[#0B6E6E] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Run another scenario
              </button>
              {analysisId && (
                <Link
                  href={`/dashboard/chat?scenarioId=${analysisId}`}
                  className="rounded-lg border border-[#0B6E6E] px-5 py-2.5 text-sm font-semibold text-[#0B6E6E]"
                >
                  Ask Klarify about this →
                </Link>
              )}
            </div>

            <p className="mt-4 text-xs text-[#999]">{result.disclaimer}</p>
          </>
        )}
      </div>
    </div>
  );
}
