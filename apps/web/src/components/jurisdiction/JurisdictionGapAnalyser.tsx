'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  JURISDICTION_GAP_DISCLAIMER,
  JURISDICTION_GAP_DIMENSIONS,
  type JurisdictionCode,
  type JurisdictionGapResult,
  type JurisdictionGapRow,
} from '@klarify/core';
import { CitationBadge, coreCitationToBadge } from '@/components/chat/CitationBadge';
import { track } from '@/lib/analytics/events';

const TARGET_OPTIONS: { code: JurisdictionCode; label: string }[] = [
  { code: 'GH', label: 'Ghana' },
  { code: 'KE', label: 'Kenya' },
  { code: 'MU', label: 'Mauritius' },
  { code: 'ZA', label: 'South Africa' },
];

const DIMENSION_LABELS: Record<(typeof JURISDICTION_GAP_DIMENSIONS)[number], string> = {
  corporate_structure: 'Corporate structure',
  licensing: 'Licensing',
  capital_requirements: 'Capital requirements',
  aml_cft_programme: 'AML/CFT programme',
  kyc_standards: 'KYC standards',
  reporting_obligations: 'Reporting obligations',
  regulatory_contacts: 'Regulatory contacts',
};

const STATUS_STYLES = {
  green: { pill: 'bg-[#1A7A4A]/10 text-[#1A7A4A]', label: 'Already satisfied' },
  amber: { pill: 'bg-[#D4A843]/15 text-[#8B6914]', label: 'Needs adjustment' },
  red: { pill: 'bg-[#C0392B]/10 text-[#C0392B]', label: 'Action required' },
};

interface HistoryItem {
  id: string;
  sourceJurisdiction: string;
  targetJurisdictions: string[];
  createdAt: string;
  summary: { green: number; amber: number; red: number };
}

interface Props {
  apiBaseUrl: string;
  plan: string;
  defaultSource: JurisdictionCode;
}

export function JurisdictionGapAnalyser({
  apiBaseUrl,
  plan,
  defaultSource,
}: Props): JSX.Element {
  const hasAccess = plan === 'compass' || plan === 'flagship';
  const maxTargets = plan === 'flagship' ? 4 : 1;

  const [targets, setTargets] = useState<JurisdictionCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JurisdictionGapResult | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<JurisdictionGapRow | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [exporting, setExporting] = useState(false);

  const base = apiBaseUrl.replace(/\/$/, '');

  const loadHistory = useCallback(async (): Promise<void> => {
    if (!hasAccess) return;
    const supabase = createClient();
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) return;
    const res = await fetch(`${base}/api/ai/jurisdiction-gap/history`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await res.json()) as { success: boolean; data?: HistoryItem[] };
    if (body.success && body.data) setHistory(body.data);
  }, [base, hasAccess]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  function toggleTarget(code: JurisdictionCode): void {
    setTargets((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      if (prev.length >= maxTargets) return prev;
      return [...prev, code];
    });
  }

  async function runAnalysis(): Promise<void> {
    if (targets.length === 0) {
      setError('Select at least one target jurisdiction.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error('You must be signed in.');

      const res = await fetch(`${base}/api/ai/jurisdiction-gap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sourceJurisdiction: defaultSource,
          targetJurisdictions: targets,
        }),
      });
      const body = (await res.json()) as {
        success: boolean;
        data?: { analysisId: string; result: JurisdictionGapResult };
        error?: string;
      };
      if (!body.success || !body.data) throw new Error(body.error ?? 'Analysis failed.');
      setResult(body.data.result);
      setAnalysisId(body.data.analysisId);
      track('ai_query_made', { surface: 'jurisdiction' });
      await loadHistory();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function exportReport(): Promise<void> {
    if (!analysisId) return;
    setExporting(true);
    try {
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error('You must be signed in.');
      const res = await fetch(`${base}/api/ai/jurisdiction-gap/${analysisId}/export`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json()) as {
        success: boolean;
        data?: { downloadUrl: string };
        error?: string;
      };
      if (!body.success || !body.data) throw new Error(body.error ?? 'Export failed.');
      window.open(body.data.downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  if (!hasAccess) {
    return (
      <div className="rounded-2xl border border-[#0B6E6E] bg-[#E6F4F4] p-8">
        <p className="text-lg font-semibold text-[#0D2B45]">Available on Compass plan</p>
        <p className="mt-2 text-sm text-[#555]">
          Compare your Nigeria compliance posture against Ghana, Kenya, Mauritius, or South Africa
          before you expand — with a structured 7-dimension gap analysis.
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

  const rowsByTarget = result
    ? result.target_jurisdictions.map((j) => ({
        jurisdiction: j,
        rows: result.dimensions.filter((d) => d.jurisdiction === j),
      }))
    : [];

  return (
    <div>
      <div className="mb-4 rounded-lg border border-[#CCCCCC] bg-[#F5F5F5] px-4 py-3 text-xs text-[#555]">
        {JURISDICTION_GAP_DISCLAIMER}
      </div>

      {!result ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-[#555]">Source:</span>
            <span className="rounded-full bg-[#0D2B45] px-3 py-1 text-xs font-semibold text-white">
              {defaultSource} (Nigeria)
            </span>
          </div>

          <p className="mb-2 text-sm font-medium text-[#1A1A1A]">
            Target jurisdiction{maxTargets > 1 ? 's' : ''}{' '}
            <span className="font-normal text-[#555]">
              ({plan === 'flagship' ? 'up to 4' : '1 on Compass'})
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {TARGET_OPTIONS.map((opt) => {
              const selected = targets.includes(opt.code);
              const disabled = !selected && targets.length >= maxTargets;
              return (
                <button
                  key={opt.code}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleTarget(opt.code)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    selected
                      ? 'border-[#0B6E6E] bg-[#E6F4F4] text-[#0B6E6E]'
                      : 'border-[#CCCCCC] bg-white text-[#555] disabled:opacity-40'
                  }`}
                >
                  {opt.label} ({opt.code})
                </button>
              );
            })}
          </div>

          {error && <p className="mt-3 text-sm text-[#C0392B]">{error}</p>}

          <button
            type="button"
            disabled={loading || targets.length === 0}
            onClick={() => void runAnalysis()}
            className="mt-6 rounded-lg bg-[#0B6E6E] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? 'Running gap analysis…' : 'Run Gap Analysis'}
          </button>
        </>
      ) : (
        <>
          {rowsByTarget.map(({ jurisdiction, rows }) => {
            const green = rows.filter((r) => r.status === 'green').length;
            const amber = rows.filter((r) => r.status === 'amber').length;
            const red = rows.filter((r) => r.status === 'red').length;
            return (
              <section key={jurisdiction} className="mb-8">
                <h2 className="text-lg font-semibold text-[#0D2B45]">
                  Expansion to {jurisdiction}
                </h2>
                <p className="mt-1 text-sm text-[#555]">
                  {green} already satisfied · {amber} need adjustment · {red} action required
                </p>

                <div className="mt-4 overflow-x-auto rounded-xl border border-[#CCCCCC]">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-[#FAFAFA] text-xs uppercase text-[#555]">
                      <tr>
                        <th className="px-4 py-3">Dimension</th>
                        <th className="px-4 py-3">Your current state</th>
                        <th className="px-4 py-3">Target requirement</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr
                          key={`${row.jurisdiction}-${row.dimension}`}
                          className="cursor-pointer border-t border-[#EEEEEE] hover:bg-[#FAFAFA]"
                          onClick={() => setExpandedRow(row)}
                        >
                          <td className="px-4 py-3 font-medium">
                            {DIMENSION_LABELS[row.dimension]}
                          </td>
                          <td className="max-w-xs px-4 py-3 text-[#555]">{row.current_state}</td>
                          <td className="max-w-xs px-4 py-3 text-[#555]">{row.target_requirement}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_STYLES[row.status].pill}`}
                            >
                              {STATUS_STYLES[row.status].label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}

          {result.regulator_contacts.length > 0 && (
            <div className="mb-6 rounded-xl border border-[#CCCCCC] bg-white p-4">
              <h3 className="text-sm font-semibold text-[#1A1A1A]">Regulator contacts</h3>
              <ul className="mt-3 space-y-2 text-sm text-[#555]">
                {result.regulator_contacts.map((c) => (
                  <li key={c.jurisdiction}>
                    <span className="font-semibold text-[#0D2B45]">{c.name}</span>
                    {' · '}
                    <a href={c.website} className="text-[#0B6E6E] underline" target="_blank" rel="noreferrer">
                      {c.website}
                    </a>
                    {' · '}
                    <a href={`mailto:${c.email}`} className="text-[#0B6E6E]">
                      {c.email}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setAnalysisId(null);
                setTargets([]);
              }}
              className="rounded-lg bg-[#0B6E6E] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Run another analysis
            </button>
            <button
              type="button"
              disabled={exporting}
              onClick={() => void exportReport()}
              className="rounded-lg border border-[#0B6E6E] px-5 py-2.5 text-sm font-semibold text-[#0B6E6E]"
            >
              {exporting ? 'Preparing Word report…' : 'Download Word report'}
            </button>
            {analysisId && (
              <Link
                href={`/dashboard/chat?jurisdictionId=${analysisId}`}
                className="rounded-lg border border-[#0B6E6E] px-5 py-2.5 text-sm font-semibold text-[#0B6E6E]"
              >
                Ask Klarify about expanding →
              </Link>
            )}
          </div>

          <p className="mt-4 text-xs text-[#999]">{result.disclaimer}</p>
        </>
      )}

      {history.length > 0 && !result && (
        <div className="mt-8 rounded-xl border border-[#CCCCCC] p-4">
          <h3 className="text-sm font-semibold text-[#1A1A1A]">Past analyses</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {history.map((h) => (
              <li key={h.id} className="text-[#555]">
                {h.sourceJurisdiction} → {h.targetJurisdictions.join(', ')} ·{' '}
                {new Date(h.createdAt).toLocaleDateString()} ·{' '}
                {h.summary.green}G / {h.summary.amber}A / {h.summary.red}R
              </li>
            ))}
          </ul>
        </div>
      )}

      {expandedRow && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/30"
          onClick={() => setExpandedRow(null)}
          onKeyDown={(e) => e.key === 'Escape' && setExpandedRow(null)}
          role="presentation"
        >
          <div
            className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-lg font-semibold text-[#0D2B45]">
              {DIMENSION_LABELS[expandedRow.dimension]}
            </h3>
            <p className="mt-4 text-sm text-[#555]">{expandedRow.gap_summary}</p>
            {expandedRow.how_to_close && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-[#1A1A1A]">How to close this gap</h4>
                <p className="mt-1 text-sm text-[#555]">{expandedRow.how_to_close}</p>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-1">
              {expandedRow.citations.map((cite, i) => (
                <CitationBadge key={i} citation={coreCitationToBadge(cite)} />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setExpandedRow(null)}
              className="mt-6 text-sm font-semibold text-[#0B6E6E]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
