'use client';

import { useState } from 'react';
import {
  parseDraftBody,
  stripMarkdownToPlainText,
  type DraftParagraph,
  type InlineSegment,
} from '@klarify/core';
import { UrgencyBanner } from './UrgencyBanner';

export type Urgency = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ActionUrgency = 'IMMEDIATE' | 'TODAY' | 'THIS_WEEK';

export interface ActionStep {
  step: number;
  action: string;
  urgency: ActionUrgency;
  notes: string | null;
}

export interface Citation {
  regulation: string;
  section: string;
  relevance: string | null;
}

export interface AnalysisResult {
  plain_language_summary: string;
  issuing_regulator: {
    code: string | null;
    name: string | null;
    department: string | null;
  };
  urgency_level: Urgency;
  urgency_reasoning: string;
  regulatory_ask: string[];
  response_deadline: {
    days_remaining: number | null;
    date_string: string | null;
    is_specified: boolean;
  };
  action_plan: ActionStep[];
  draft_response: string;
  citations: Citation[];
  disclaimer: string;
}

export function DocumentAnalysisResult({
  filename,
  result,
  documentId,
  apiBaseUrl,
}: {
  filename: string;
  result: AnalysisResult;
  documentId: string;
  apiBaseUrl: string;
}): JSX.Element {
  const baseUrl = apiBaseUrl.replace(/\/$/, '');
  return (
    <div className="space-y-4">
      <UrgencyBanner
        level={result.urgency_level}
        reasoning={result.urgency_reasoning}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* LEFT COLUMN */}
        <div className="space-y-4">
          <Card title="What this document is saying">
            {result.issuing_regulator.name && (
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#0B6E6E]">
                {result.issuing_regulator.name}
                {result.issuing_regulator.department
                  ? ` — ${result.issuing_regulator.department}`
                  : ''}
              </p>
            )}
            <p className="text-sm leading-relaxed text-[#1A1A1A]">
              {result.plain_language_summary}
            </p>
          </Card>

          <Card title="What the regulator is asking for">
            {result.regulatory_ask.length === 0 ? (
              <p className="text-sm text-[#777]">
                No specific asks identified — this looks like an informational notice.
              </p>
            ) : (
              <ul className="space-y-2">
                {result.regulatory_ask.map((ask, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-[#1A1A1A]"
                  >
                    <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#0B6E6E]" />
                    <span>{ask}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <DeadlineCard deadline={result.response_deadline} />

          {result.citations.length > 0 && (
            <Card title="Regulatory basis">
              <div className="flex flex-wrap gap-2">
                {result.citations.map((c, i) => (
                  <span
                    key={`${c.regulation}-${i}`}
                    className="inline-flex rounded-full border border-[#0B6E6E] bg-[#E6F4F4] px-2.5 py-1 font-mono text-[11px] text-[#0B6E6E]"
                  >
                    {c.regulation}, {c.section}
                  </span>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          <ActionPlanCard steps={result.action_plan} />
          <DraftResponseCard
            documentId={documentId}
            draft={result.draft_response}
            apiBaseUrl={baseUrl}
          />
        </div>
      </div>

      <p className="px-1 text-xs leading-relaxed text-[#777]">
        {result.disclaimer}
      </p>

      <FollowUpChatLink
        documentId={documentId}
        regulator={result.issuing_regulator.name}
        filename={filename}
      />
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#0D2B45]">
        {title}
      </h3>
      {children}
    </div>
  );
}

function DeadlineCard({
  deadline,
}: {
  deadline: AnalysisResult['response_deadline'];
}): JSX.Element {
  if (!deadline.is_specified) {
    return (
      <Card title="Response deadline">
        <p className="text-sm text-[#555]">
          No deadline specified — respond promptly as a best practice.
        </p>
      </Card>
    );
  }
  const days = deadline.days_remaining;
  const past = typeof days === 'number' && days < 0;
  const urgent = typeof days === 'number' && days >= 0 && days < 7;
  return (
    <Card title="Response deadline">
      {typeof days === 'number' ? (
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span
              className={[
                'text-4xl font-bold',
                past
                  ? 'text-[#C0392B]'
                  : urgent
                    ? 'text-[#C0392B]'
                    : 'text-[#0D2B45]',
              ].join(' ')}
            >
              {past ? Math.abs(days) : days}
            </span>
            <span className="text-sm text-[#555]">
              {past
                ? days === -1
                  ? 'day overdue'
                  : 'days overdue'
                : days === 1
                  ? 'day remaining'
                  : 'days remaining'}
            </span>
          </div>
          {deadline.date_string && (
            <p className="text-xs text-[#777]">Deadline: {deadline.date_string}</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-[#1A1A1A]">{deadline.date_string}</p>
      )}
    </Card>
  );
}

const ACTION_BADGE: Record<
  ActionUrgency,
  { bg: string; fg: string; label: string }
> = {
  IMMEDIATE: { bg: 'bg-[#C0392B]', fg: 'text-white', label: 'IMMEDIATE' },
  TODAY: { bg: 'bg-[#D4A843]', fg: 'text-[#1A1A1A]', label: 'TODAY' },
  THIS_WEEK: { bg: 'bg-[#1A7A4A]', fg: 'text-white', label: 'THIS WEEK' },
};

function ActionPlanCard({ steps }: { steps: ActionStep[] }): JSX.Element {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const done = checked.size;
  const total = steps.length;

  return (
    <Card title={`72-hour action plan (${done} of ${total} complete)`}>
      {steps.length === 0 ? (
        <p className="text-sm text-[#555]">No specific actions required.</p>
      ) : (
        <ol className="space-y-3">
          {steps.map((step) => {
            const isDone = checked.has(step.step);
            const badge = ACTION_BADGE[step.urgency];
            return (
              <li
                key={step.step}
                className={[
                  'rounded-lg border p-3 transition',
                  isDone
                    ? 'border-[#E5E5E5] bg-[#FAFAFA]'
                    : 'border-[#E5E5E5] bg-white',
                ].join(' ')}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={(e) => {
                      setChecked((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(step.step);
                        else next.delete(step.step);
                        return next;
                      });
                    }}
                    className="mt-1 h-4 w-4 cursor-pointer rounded border-[#CCC] text-[#0B6E6E] focus:ring-[#0B6E6E]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#777]">
                        Step {step.step}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.bg} ${badge.fg}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p
                      className={[
                        'text-sm leading-relaxed',
                        isDone ? 'text-[#777] line-through' : 'text-[#1A1A1A]',
                      ].join(' ')}
                    >
                      {step.action}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

function DraftResponseCard({
  documentId,
  draft,
  apiBaseUrl,
}: {
  documentId: string;
  draft: string;
  apiBaseUrl: string;
}): JSX.Element {
  const [draftText, setDraftText] = useState(draft);
  const [editing, setEditing] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCopy = async (): Promise<void> => {
    try {
      // Strip markdown markers (`**`, `---`, heading `#`) so the user pastes
      // a clean, sendable letter into Word/Gmail rather than raw markdown.
      await navigator.clipboard.writeText(stripMarkdownToPlainText(draftText));
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setError('Could not copy to clipboard. Try selecting the text manually.');
    }
  };

  const onDownload = async (): Promise<void> => {
    setError(null);
    setDownloading(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error('You must be signed in to download.');
      const res = await fetch(
        `${apiBaseUrl}/api/documents/${documentId}/export-draft`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
      );
      const body = (await res.json()) as
        | { success: true; data: { downloadUrl: string } }
        | { success: false; error: string };
      if (!body.success) throw new Error(body.error);
      window.location.href = body.data.downloadUrl;
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card title="Draft acknowledgement response">
      {editing ? (
        <textarea
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          rows={14}
          className="w-full resize-y rounded-lg border border-[#CCCCCC] bg-white p-3 font-mono text-xs leading-relaxed text-[#1A1A1A] focus:border-[#0B6E6E] focus:outline-none"
        />
      ) : (
        <DraftLetterPreview draft={draftText} />
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="rounded-lg border border-[#CCCCCC] bg-white px-3 py-1.5 text-xs font-medium text-[#1A1A1A] hover:bg-[#F5F5F5]"
        >
          {editing ? 'Done editing' : 'Edit draft'}
        </button>
        <button
          type="button"
          onClick={() => void onCopy()}
          className="rounded-lg border border-[#CCCCCC] bg-white px-3 py-1.5 text-xs font-medium text-[#1A1A1A] hover:bg-[#F5F5F5]"
        >
          {copyState === 'copied' ? 'Copied' : 'Copy text'}
        </button>
        <button
          type="button"
          onClick={() => void onDownload()}
          disabled={downloading}
          className="rounded-lg bg-[#0B6E6E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0a5a5a] disabled:opacity-40"
        >
          {downloading ? 'Preparing…' : 'Download .docx'}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-[#C0392B]">{error}</p>
      )}

      <p className="mt-3 rounded-lg border border-[#D4A843]/30 bg-[#FDF6E3] px-3 py-2 text-[11px] leading-relaxed text-[#5a4a14]">
        This draft was prepared with AI assistance. Review with a qualified
        specialist before sending. Klarify is not liable for the outcome of
        regulatory submissions.
      </p>
    </Card>
  );
}

/**
 * Render the AI-generated draft as a properly formatted letter preview.
 *
 * Uses the shared `parseDraftBody` helper from `@klarify/core` so the web
 * preview matches what the .docx exporter produces — same paragraph
 * boundaries, same bold runs, same `---` stripping.
 *
 * Rendered inside the `Draft acknowledgement response` card. Sized so a
 * typical 30-paragraph letter scrolls cleanly without dominating the
 * viewport.
 */
function DraftLetterPreview({ draft }: { draft: string }): JSX.Element {
  const paragraphs: DraftParagraph[] = parseDraftBody(draft);
  if (paragraphs.length === 0) {
    return (
      <div className="rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] p-3">
        <p className="text-sm italic text-[#777]">
          The draft response is empty. Try regenerating the analysis.
        </p>
      </div>
    );
  }
  return (
    <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-[#E5E5E5] bg-white p-5 font-serif text-[13px] leading-relaxed text-[#1A1A1A] shadow-inner">
      {paragraphs.map((para, idx) => {
        const isEmpty =
          para.segments.length === 0 ||
          para.segments.every((s) => s.text.trim() === '');
        if (isEmpty) {
          return <div key={idx} className="h-3" aria-hidden="true" />;
        }
        if (para.isHeading) {
          return (
            <p
              key={idx}
              className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#0D2B45]"
            >
              {para.segments.map((seg, i) => renderSegment(seg, i))}
            </p>
          );
        }
        return (
          <p key={idx} className="mb-2 last:mb-0">
            {para.segments.map((seg, i) => renderSegment(seg, i))}
          </p>
        );
      })}
    </div>
  );
}

function renderSegment(seg: InlineSegment, key: number): JSX.Element {
  if (seg.bold) {
    return (
      <strong key={key} className="font-semibold text-[#0D2B45]">
        {seg.text}
      </strong>
    );
  }
  return <span key={key}>{seg.text}</span>;
}

function FollowUpChatLink({
  documentId,
  regulator,
  filename,
}: {
  documentId: string;
  regulator: string | null;
  filename: string;
}): JSX.Element {
  const question = encodeURIComponent(
    `I just received this document from ${
      regulator ?? 'a regulator'
    } (${filename}). What are the consequences if I do not respond on time?`,
  );
  return (
    <div className="rounded-2xl border border-[#0B6E6E]/30 bg-[#E6F4F4] p-5">
      <p className="text-sm font-semibold text-[#0D2B45]">
        Have questions about this document?
      </p>
      <p className="mt-1 text-xs leading-relaxed text-[#555]">
        FounderCounsel can answer follow-ups in plain English — what happens if
        you miss the deadline, how to escalate to a specialist, how this affects
        your roadmap.
      </p>
      <a
        href={`/dashboard/chat?from=document&id=${documentId}&q=${question}`}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#0B6E6E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a5a5a]"
      >
        Ask FounderCounsel →
      </a>
    </div>
  );
}
