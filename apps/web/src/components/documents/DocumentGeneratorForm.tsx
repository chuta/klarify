'use client';

/**
 * Document Generator form + preview (Sprint 4 S4-B2).
 *
 * Two-column layout (form left, preview right). On mobile the form
 * stacks on top of the preview.
 *
 * Lifecycle:
 *   1. Idle      — user editing the form.
 *   2. Submitting — POST /api/documents/generate → spinner.
 *   3. Generated  — markdown preview + Download / Edit / Regenerate /
 *                   "Mark roadmap task complete" CTAs.
 *   4. Editing    — TinyMCE editor open (reuses Sprint 3 component).
 *
 * The disclaimer banner is non-dismissible and always present in the
 * preview pane (CLAUDE.md §16 Rule 1).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { htmlToMarkdown, markdownToHtml } from '@klarify/core';
import { TinyEditor } from './TinyEditor';
import {
  CATEGORY_DETAILS,
  type TemplateCategoryKey,
} from './categories';

// Narrow type for envelope responses from `apps/api`.
interface ApiEnvelope {
  success?: boolean;
  error?: string;
  code?: string;
  details?: {
    fieldErrors?: Record<string, string[]>;
  };
  data?: unknown;
}

export interface TemplateForUI {
  templateId: string;
  documentName: string;
  regulatoryBasis: string;
  category: Exclude<TemplateCategoryKey, 'ALL'>;
  requiredFields: Array<{
    key: string;
    label: string;
    type:
      | 'text'
      | 'textarea'
      | 'select'
      | 'multiselect'
      | 'date'
      | 'boolean';
    required: boolean;
    helpText: string;
    options: string[] | null;
    prefilledFrom: string | null;
  }>;
}

interface Props {
  apiBaseUrl: string;
  template: TemplateForUI;
  initialValues: Record<string, unknown>;
  previousVersion: number | null;
  roadmapTaskId: string | null;
  tinyApiKey: string;
}

interface GenerationResult {
  documentId: string;
  templateId: string;
  version: number;
  title: string;
  regulatoryBasis: string;
  downloadUrl: string;
  expiresAt: string;
}

// =============================================================================
// Generating state — animated panel shown while the API call is in-flight.
// Defined before DocumentGeneratorForm so TypeScript resolves the reference.
// =============================================================================

const GENERATING_STEPS = [
  'Searching Nigerian regulatory corpus…',
  'Applying NFIU AML/CFT compliance framework…',
  'Cross-referencing SEC Digital Asset Rules…',
  'Structuring document sections…',
  'Formatting for regulatory submission…',
  'Finalising your document…',
] as const;

function GeneratingState({ templateName }: { templateName: string }): JSX.Element {
  const [stepIdx, setStepIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStepIdx((i) => (i + 1) % GENERATING_STEPS.length);
    }, 3000);
    const elapsedTimer = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);
    return (): void => {
      clearInterval(stepTimer);
      clearInterval(elapsedTimer);
    };
  }, []);

  return (
    <div className="flex h-full min-h-[420px] flex-col items-center justify-center px-6 py-12 text-center">
      {/* Dual-ring spinner */}
      <div className="relative mb-6 h-16 w-16" aria-hidden="true">
        <div className="absolute inset-0 rounded-full border-4 border-[#E6F4F4]" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[#0B6E6E]" />
        <div
          className="absolute inset-[6px] animate-spin rounded-full border-2 border-transparent border-t-[#D4A843]"
          style={{ animationDuration: '1.4s', animationDirection: 'reverse' }}
        />
      </div>

      <h3 className="mb-1 text-base font-semibold text-[#0D2B45]">
        Generating your {templateName}…
      </h3>

      {/* Rotating step message */}
      <p
        key={stepIdx}
        className="mb-5 text-sm text-[#0B6E6E] transition-opacity duration-500"
      >
        {GENERATING_STEPS[stepIdx]}
      </p>

      {/* Indeterminate progress bar */}
      <div className="w-full max-w-xs">
        <div className="h-1.5 overflow-hidden rounded-full bg-[#E6F4F4]">
          <div className="klarify-indeterminate-bar h-full rounded-full bg-[#0B6E6E]" />
        </div>
      </div>

      {/* Elapsed / estimated time */}
      <p className="mt-4 text-xs text-[#999]">
        {elapsed < 6
          ? 'Typically takes 10–20 seconds'
          : elapsed < 25
            ? `${elapsed}s — almost there…`
            : `${elapsed}s — larger documents take a moment, hang tight`}
      </p>
    </div>
  );
}

export function DocumentGeneratorForm({
  apiBaseUrl,
  template,
  initialValues,
  previousVersion,
  roadmapTaskId,
  tinyApiKey,
}: Props): JSX.Element {
  const baseUrl = apiBaseUrl.replace(/\/$/, '');
  const [values, setValues] = useState<Record<string, unknown>>(() => ({
    ...initialValues,
  }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [markdown, setMarkdown] = useState<string>('');
  const [editing, setEditing] = useState(false);
  const [editedHtml, setEditedHtml] = useState<string>('');
  const [taskMarkedComplete, setTaskMarkedComplete] = useState(false);
  const [showHelp, setShowHelp] = useState<Record<string, boolean>>({});

  const meta = CATEGORY_DETAILS[template.category] ?? CATEGORY_DETAILS.OTHER;

  // Required-fields fulfilment — drives the Generate-button enabled state.
  const allRequiredFilled = useMemo(() => {
    for (const f of template.requiredFields) {
      if (!f.required) continue;
      const v = values[f.key];
      if (v === undefined || v === null) return false;
      if (typeof v === 'string' && v.trim().length === 0) return false;
      if (Array.isArray(v) && v.length === 0) return false;
    }
    return true;
  }, [template.requiredFields, values]);

  const handleSubmit = useCallback(async (): Promise<void> => {
    setSubmitting(true);
    setError(null);
    setValidationErrors({});
    setTaskMarkedComplete(false);
    try {
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error('You must be signed in.');

      const res = await fetch(`${baseUrl}/api/documents/generate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: template.templateId,
          formData: values,
        }),
      });

      const body = (await res.json().catch(() => null)) as ApiEnvelope | null;

      if (res.status === 402) {
        // Quota / upgrade gate
        if (body?.code === 'UPGRADE_REQUIRED') {
          window.location.href = '/billing/upgrade';
          return;
        }
        setError(
          body?.error ??
            'You have reached your monthly document generation limit.',
        );
        return;
      }

      const fieldErrors = body?.details?.fieldErrors;
      if (res.status === 422 && fieldErrors) {
        const flat: Record<string, string> = {};
        for (const [k, msgs] of Object.entries(fieldErrors)) {
          if (Array.isArray(msgs) && msgs.length > 0) {
            flat[k] = msgs[0]!;
          }
        }
        setValidationErrors(flat);
        setError('Some fields need attention before we can generate.');
        return;
      }

      if (!res.ok) {
        throw new Error(body?.error ?? `Generation failed (${res.status}).`);
      }

      const data = body?.data as GenerationResult | undefined;
      if (!data?.documentId) {
        throw new Error('Generation succeeded but no document id was returned.');
      }

      // Fetch the parsed markdown for preview rendering.
      const docRes = await fetch(
        `${baseUrl}/api/documents/generated/${data.documentId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const docJson = (await docRes.json().catch(() => null)) as {
        data?: { content?: { markdown?: string } };
      } | null;
      const fetchedMd = docJson?.data?.content?.markdown ?? '';

      setResult(data);
      setMarkdown(fetchedMd);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error.');
    } finally {
      setSubmitting(false);
    }
  }, [baseUrl, template.templateId, values]);

  const handleDownload = useCallback((): void => {
    if (!result?.downloadUrl) return;
    window.location.href = result.downloadUrl;
  }, [result]);

  const handleEditOpen = useCallback((): void => {
    if (markdown.length === 0) return;
    setEditedHtml(markdownToHtml(markdown));
    setEditing(true);
  }, [markdown]);

  const handleEditSave = useCallback((): void => {
    setMarkdown(htmlToMarkdown(editedHtml));
    setEditing(false);
  }, [editedHtml]);

  const handleMarkTaskComplete = useCallback(async (): Promise<void> => {
    if (!roadmapTaskId) return;
    try {
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error('You must be signed in.');
      const res = await fetch(
        `${baseUrl}/api/compliance/roadmap/task/${roadmapTaskId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'complete' }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as ApiEnvelope | null;
        throw new Error(body?.error ?? 'Could not mark task complete.');
      }
      setTaskMarkedComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark task complete.');
    }
  }, [baseUrl, roadmapTaskId]);

  const setFieldValue = (key: string, value: unknown): void => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (validationErrors[key]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <Link
          href="/dashboard/compliance/documents"
          className="text-xs text-[#0B6E6E] hover:underline"
        >
          ← Document library
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-md text-base"
            style={{ backgroundColor: meta.tintBg, color: meta.tintFg }}
            aria-hidden="true"
          >
            {meta.icon}
          </span>
          <div>
            <h1 className="text-xl font-semibold text-[#0D2B45]">
              {template.documentName}
            </h1>
            <p className="font-mono text-[11px] text-[#0B6E6E]">
              {template.regulatoryBasis}
            </p>
          </div>
        </div>
        {previousVersion ? (
          <p className="mt-2 text-xs text-[#777]">
            You have already generated v{previousVersion} of this document. This
            run will create v{previousVersion + 1}; v{previousVersion} stays in
            your history.
          </p>
        ) : null}
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[2fr_3fr]">
        {/* ---------- LEFT: FORM ---------- */}
        <section className="rounded-xl border border-[#E5E5E5] bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-[#0D2B45]">
            Tell Klarify about your business
          </h2>
          <form
            onSubmit={(e): void => {
              e.preventDefault();
              void handleSubmit();
            }}
            className="space-y-4"
          >
            {template.requiredFields.map((f) => {
              const value = values[f.key];
              const errorMsg = validationErrors[f.key];
              const isPrefilled =
                f.prefilledFrom !== null &&
                value !== undefined &&
                value !== '' &&
                value !== null;
              return (
                <div key={f.key}>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor={`field-${f.key}`}
                      className="block text-xs font-medium text-[#1A1A1A]"
                    >
                      {f.label}
                      {f.required ? (
                        <span className="ml-1 text-[#C0392B]">*</span>
                      ) : null}
                      {isPrefilled ? (
                        <span className="ml-2 inline-flex items-center rounded-full bg-[#E6F4F4] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[#0B6E6E]">
                          Pre-filled
                        </span>
                      ) : null}
                    </label>
                    <button
                      type="button"
                      onClick={(): void =>
                        setShowHelp((s) => ({ ...s, [f.key]: !s[f.key] }))
                      }
                      className="text-[10px] uppercase text-[#777] hover:text-[#0B6E6E]"
                    >
                      {showHelp[f.key] ? 'Hide help' : 'What is this?'}
                    </button>
                  </div>
                  {showHelp[f.key] ? (
                    <p className="mt-1 rounded-md bg-[#F9F9F9] px-3 py-2 text-[11px] text-[#555]">
                      {f.helpText}
                    </p>
                  ) : null}

                  <FieldInput
                    field={f}
                    value={value}
                    onChange={(v): void => setFieldValue(f.key, v)}
                  />

                  {errorMsg ? (
                    <p className="mt-1 text-[11px] text-[#C0392B]">{errorMsg}</p>
                  ) : null}
                </div>
              );
            })}

            {error ? (
              <div className="rounded-md border border-[#E8B4AB] bg-[#FDECEA] px-3 py-2 text-sm text-[#9F2E20]">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!allRequiredFilled || submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#0B6E6E] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#085656] disabled:cursor-not-allowed disabled:bg-[#CCCCCC]"
            >
              {submitting ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span>Generating… 10–20 seconds</span>
                </>
              ) : result ? (
                `Regenerate (will create v${result.version + 1})`
              ) : (
                `Generate ${template.documentName}`
              )}
            </button>
          </form>
        </section>

        {/* ---------- RIGHT: PREVIEW ---------- */}
        <section className="rounded-xl border border-[#E5E5E5] bg-white">
          {result === null ? (
            submitting ? (
              <GeneratingState templateName={template.documentName} />
            ) : (
              <div className="flex h-full min-h-[420px] flex-col items-center justify-center px-6 py-12 text-center">
                <div className="mb-3 text-4xl opacity-40" aria-hidden="true">
                  📄
                </div>
                <h3 className="mb-2 text-base font-medium text-[#0D2B45]">
                  Your generated document will appear here
                </h3>
                <p className="max-w-sm text-sm text-[#777]">
                  Fill in the form, then click Generate. Klarify will use
                  Nigerian regulation as context — typically takes 10–20
                  seconds.
                </p>
              </div>
            )
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center justify-between border-b border-[#F0F0F0] px-5 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#0D2B45]">
                    {result.title} — v{result.version}
                  </h3>
                  <p className="font-mono text-[10px] text-[#0B6E6E]">
                    {result.regulatoryBasis}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="rounded-md border border-[#0B6E6E] px-3 py-1 text-xs font-medium text-[#0B6E6E] hover:bg-[#E6F4F4]"
                  >
                    Download .docx
                  </button>
                  {!editing ? (
                    <button
                      type="button"
                      onClick={handleEditOpen}
                      className="rounded-md border border-[#0D2B45] px-3 py-1 text-xs font-medium text-[#0D2B45] hover:bg-[#E8EEF4]"
                    >
                      Edit
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleEditSave}
                      className="rounded-md bg-[#0B6E6E] px-3 py-1 text-xs font-medium text-white"
                    >
                      Save edits
                    </button>
                  )}
                </div>
              </div>

              <div className="px-5 py-5">
                {editing ? (
                  <TinyEditor
                    apiKey={tinyApiKey}
                    initialValue={editedHtml}
                    onEditorChange={(html): void => setEditedHtml(html)}
                    height={560}
                  />
                ) : (
                  <article
                    className="prose prose-sm max-w-none text-[#1A1A1A] [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-[#0D2B45] [&_strong]:text-[#0D2B45]"
                    dangerouslySetInnerHTML={{
                      __html: markdown ? markdownToHtml(markdown) : '<p>Loading preview…</p>',
                    }}
                  />
                )}
              </div>

              <div className="border-t border-[#F0F0F0] px-5 py-3">
                {roadmapTaskId ? (
                  taskMarkedComplete ? (
                    <p className="text-xs text-[#1A7A4A]">
                      ✓ Roadmap task marked complete.
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={(): void => {
                        void handleMarkTaskComplete();
                      }}
                      className="rounded-md bg-[#1A7A4A] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#146138]"
                    >
                      Mark roadmap task complete
                    </button>
                  )
                ) : null}

                <Link
                  href={`/dashboard/chat?from=document&type=generated&id=${result.documentId}`}
                  className="ml-2 inline-block text-xs text-[#0B6E6E] hover:underline"
                >
                  Ask Klarify about this document →
                </Link>
              </div>

              {/* Disclaimer — mandatory, non-dismissible */}
              <div className="border-t border-amber-200 bg-amber-50 px-5 py-3">
                <p className="text-[11px] text-amber-800">
                  This document was generated with Klarify AI assistance. It is
                  regulatory information, not legal advice. Review with a
                  qualified practitioner before adopting for production use.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// =============================================================================
// Field renderer
// =============================================================================

interface FieldInputProps {
  field: TemplateForUI['requiredFields'][number];
  value: unknown;
  onChange: (next: unknown) => void;
}

function FieldInput({ field, value, onChange }: FieldInputProps): JSX.Element {
  const className =
    'mt-1 block w-full rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#1A1A1A] shadow-sm focus:border-[#0B6E6E] focus:outline-none focus:ring-1 focus:ring-[#0B6E6E]';
  switch (field.type) {
    case 'text':
      return (
        <input
          id={`field-${field.key}`}
          type="text"
          value={(value as string | undefined) ?? ''}
          onChange={(e): void => onChange(e.target.value)}
          className={className}
        />
      );
    case 'date':
      return (
        <input
          id={`field-${field.key}`}
          type="date"
          value={(value as string | undefined) ?? ''}
          onChange={(e): void => onChange(e.target.value)}
          className={className}
        />
      );
    case 'textarea':
      return (
        <textarea
          id={`field-${field.key}`}
          rows={4}
          value={(value as string | undefined) ?? ''}
          onChange={(e): void => onChange(e.target.value)}
          className={`${className} min-h-[96px]`}
        />
      );
    case 'select':
      return (
        <select
          id={`field-${field.key}`}
          value={(value as string | undefined) ?? ''}
          onChange={(e): void => onChange(e.target.value)}
          className={className}
        >
          <option value="">Select…</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    case 'multiselect':
      return (
        <div className="mt-1 grid grid-cols-1 gap-x-3 gap-y-0.5 rounded-md border border-[#D1D5DB] bg-white p-2 sm:grid-cols-2">
          {(field.options ?? []).map((opt) => {
            const arr = Array.isArray(value) ? (value as string[]) : [];
            const checked = arr.includes(opt);
            const displayLabel = opt
              .replace(/_/g, ' ')
              .toLowerCase()
              .replace(/\b\w/g, (c) => c.toUpperCase());
            return (
              <label
                key={opt}
                className="flex min-w-0 cursor-pointer items-start gap-2 rounded px-1.5 py-1 text-xs text-[#1A1A1A] hover:bg-[#F5F5F5]"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(): void => {
                    const next = checked
                      ? arr.filter((v) => v !== opt)
                      : [...arr, opt];
                    onChange(next);
                  }}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#0B6E6E]"
                />
                <span className="min-w-0 leading-snug">{displayLabel}</span>
              </label>
            );
          })}
        </div>
      );
    case 'boolean':
      return (
        <label className="mt-1 inline-flex items-center gap-2 text-sm text-[#1A1A1A]">
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e): void => onChange(e.target.checked)}
            className="h-4 w-4"
          />
          <span>Yes</span>
        </label>
      );
    default:
      return <input type="text" className={className} />;
  }
}

