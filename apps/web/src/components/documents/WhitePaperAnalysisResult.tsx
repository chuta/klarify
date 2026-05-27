'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { WhitePaperAnalysisResult } from '@klarify/core';

function completenessColor(pct: number): string {
  if (pct <= 35) return '#C0392B';
  if (pct <= 70) return '#D4A843';
  return '#1A7A4A';
}

const STATUS_STYLE: Record<string, string> = {
  adequate: 'bg-[#E6F4F4] text-[#0B6E6E]',
  partial: 'bg-[#FDF6E3] text-[#8a6d1a]',
  missing: 'bg-[#FEE5E1] text-[#9F2E20]',
  not_applicable: 'bg-[#F5F5F5] text-[#777]',
};

export function WhitePaperAnalysisResultView({
  analysisId,
  filename,
  result,
  apiBaseUrl,
}: {
  analysisId: string;
  filename: string;
  result: WhitePaperAnalysisResult;
  apiBaseUrl: string;
}): JSX.Element {
  const [exporting, setExporting] = useState<'gap' | 'outline' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const baseUrl = apiBaseUrl.replace(/\/$/, '');
  const color = completenessColor(result.completeness_pct);

  const exportDoc = async (kind: 'gap' | 'outline'): Promise<void> => {
    setExporting(kind);
    setExportError(null);
    try {
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error('Sign in required.');
      const path =
        kind === 'gap'
          ? `/api/documents/whitepaper/${analysisId}/export-gap-report`
          : `/api/documents/whitepaper/${analysisId}/export-outline`;
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json()) as
        | { success: true; data: { downloadUrl: string } }
        | { success: false; error: string };
      if (!body.success) throw new Error(body.error);
      window.location.href = body.data.downloadUrl;
    } catch (err) {
      setExportError((err as Error).message);
    } finally {
      setExporting(null);
    }
  };

  const prefill = encodeURIComponent(JSON.stringify(result.generator_prefill));

  return (
    <div className="space-y-6">
      <div
        className="rounded-lg px-4 py-3 text-white"
        style={{ backgroundColor: color }}
      >
        <p className="text-lg font-semibold">
          {result.sections_adequate_count} of {result.sections_total} required sections
          adequately covered
        </p>
        <p className="mt-1 text-sm opacity-90">{result.executive_summary}</p>
      </div>

      {result.low_structure_confidence ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This document may not be a structured white paper. Results may be less reliable —
          consider pasting key sections or uploading a clearer PDF.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-[#0D2B45]">Gap report</h2>

          {result.critical_gaps.length > 0 ? (
            <div className="rounded-lg border border-[#E5E5E5] bg-white p-4">
              <h3 className="text-sm font-semibold text-[#C0392B]">Critical gaps</h3>
              <ol className="mt-2 list-decimal space-y-3 pl-5 text-sm">
                {result.critical_gaps.map((g) => (
                  <li key={g.rank}>
                    <p className="font-medium">{g.title}</p>
                    <p className="text-[#555]">{g.gap_description}</p>
                    <p className="mt-1 text-[#0B6E6E]">{g.remediation}</p>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-lg border border-[#E5E5E5] bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-[#F9F9F9] text-left text-xs uppercase text-[#777]">
                <tr>
                  <th className="px-3 py-2">Section</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {result.section_assessments.map((s) => (
                  <tr key={s.section_id}>
                    <td className="px-3 py-2">
                      <p className="font-medium">{s.section_name}</p>
                      {s.gap_summary ? (
                        <p className="mt-1 text-xs text-[#555]">{s.gap_summary}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[s.status] ?? ''}`}
                      >
                        {s.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-[#E5E5E5] bg-white p-4 text-sm">
            <h3 className="font-semibold text-[#0D2B45]">Source jurisdiction notes</h3>
            <p className="mt-2 text-[#555]">{result.source_jurisdiction_notes.comparative_notes}</p>
            {result.source_jurisdiction_notes.must_rewrite.length > 0 ? (
              <ul className="mt-2 list-disc pl-5 text-[#555]">
                {result.source_jurisdiction_notes.must_rewrite.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-semibold text-[#0D2B45]">Draft ARIP outline</h2>
          <div className="max-h-[600px] overflow-y-auto rounded-lg border border-[#E5E5E5] bg-white p-4 text-sm">
            {result.draft_outline.sections.map((sec) => (
              <div key={sec.number} className="mb-4 border-b border-[#F0F0F0] pb-4 last:border-0">
                <h3 className="font-semibold text-[#0B6E6E]">
                  {sec.number}. {sec.title}
                </h3>
                <p className="mt-1 whitespace-pre-wrap text-[#555]">{sec.guidance}</p>
                {sec.suggested_content ? (
                  <p className="mt-2 whitespace-pre-wrap text-[#1A1A1A]">{sec.suggested_content}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={exporting !== null}
          onClick={(): void => void exportDoc('gap')}
          className="rounded-md border border-[#0B6E6E] px-3 py-2 text-sm font-medium text-[#0B6E6E] disabled:opacity-50"
        >
          {exporting === 'gap' ? 'Exporting…' : 'Download gap report (.docx)'}
        </button>
        <button
          type="button"
          disabled={exporting !== null}
          onClick={(): void => void exportDoc('outline')}
          className="rounded-md border border-[#0B6E6E] px-3 py-2 text-sm font-medium text-[#0B6E6E] disabled:opacity-50"
        >
          {exporting === 'outline' ? 'Exporting…' : 'Download outline (.docx)'}
        </button>
        <Link
          href={`/dashboard/compliance/documents/generate/ARIP_WHITEPAPER?fromAnalysis=${analysisId}&prefill=${prefill}`}
          className="rounded-md bg-[#0B6E6E] px-4 py-2 text-sm font-semibold text-white"
        >
          Open in Document Generator →
        </Link>
      </div>

      {exportError ? <p className="text-sm text-[#C0392B]">{exportError}</p> : null}

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        {result.disclaimer} This gap report and outline are first drafts for review with your
        registered Nigerian solicitor. Under Section 16 of the ARIP Framework, ARIP applications
        MUST be filed through a registered solicitor or adviser.
      </div>

      <p className="text-xs text-[#777]">Analysed: {filename}</p>
    </div>
  );
}
