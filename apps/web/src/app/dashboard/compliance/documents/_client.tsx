'use client';

/**
 * Client shell for the document library page.
 *
 * Two state slices:
 *   * selectedCategory — the sidebar filter.
 *   * downloadingId    — which generated doc is currently being downloaded.
 *
 * Everything else (template list, generated list, plan, quota) is server-
 * rendered as props. No useEffect data fetching — keeps the first paint
 * crisp and avoids hydration mismatches.
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getPublicApiBaseUrl } from '@/lib/publicEnv';
import { DocumentTemplateCard } from '@/components/documents/DocumentTemplateCard';
import {
  CATEGORY_DETAILS,
  CATEGORY_ORDER,
  type TemplateCategoryKey,
} from '@/components/documents/categories';
import type { Plan } from '@klarify/core';

export interface TemplateMeta {
  templateId: string;
  documentName: string;
  regulatoryBasis: string;
  category: Exclude<TemplateCategoryKey, 'ALL'>;
  requiredPlan?: 'navigator' | 'compass' | 'flagship';
}

export interface GeneratedMeta {
  id: string;
  templateType: string;
  documentName: string;
  regulatoryBasis: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  templates: TemplateMeta[];
  generated: GeneratedMeta[];
  plan: Plan;
  monthlyLimit: number | null;
  monthlyUsed: number;
}

export function DocumentLibraryClient({
  templates,
  generated,
  plan,
  monthlyLimit,
  monthlyUsed,
}: Props): JSX.Element {
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategoryKey>('ALL');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const visibleTemplates = useMemo(() => {
    if (selectedCategory === 'ALL') return templates;
    return templates.filter((t) => t.category === selectedCategory);
  }, [templates, selectedCategory]);

  // Map template_type → latest version we've generated (if any). Used to
  // decide whether each card shows "Generate" or "Regenerate".
  const generatedByTemplate = useMemo(() => {
    const m = new Map<string, GeneratedMeta>();
    for (const g of generated) m.set(g.templateType, g);
    return m;
  }, [generated]);

  const quotaExhausted =
    monthlyLimit !== null && monthlyUsed >= monthlyLimit;

  const apiBase = getPublicApiBaseUrl().replace(/\/$/, '');

  const downloadDoc = async (docId: string): Promise<void> => {
    setDownloadingId(docId);
    setDownloadError(null);
    try {
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error('You must be signed in.');
      const res = await fetch(`${apiBase}/api/documents/generated/${docId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Download failed (${res.status})`);
      }
      const json = (await res.json()) as {
        success: boolean;
        data?: { downloadUrl?: string };
      };
      const url = json.data?.downloadUrl;
      if (!url) throw new Error('No download URL returned.');
      window.location.href = url;
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="w-full min-w-0">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">
          Compliance Document Generator
        </h1>
        <p className="mt-1 text-sm text-[#555]">
          Generate audit-ready compliance documents grounded in Nigerian
          regulation. Edit, download as Word, and version your drafts.
        </p>
      </header>

      {/* Monthly quota chip — shown for navigator users only */}
      {monthlyLimit !== null && plan !== 'free' ? (
        <div
          className={`mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
            quotaExhausted
              ? 'bg-[#FEE5E1] text-[#9F2E20]'
              : 'bg-[#E6F4F4] text-[#0B6E6E]'
          }`}
        >
          <span>
            {monthlyUsed} of {monthlyLimit} documents generated this month
          </span>
          {quotaExhausted ? (
            <Link
              href="/dashboard/billing?plan=navigator"
              className="ml-1 underline underline-offset-2"
            >
              Upgrade
            </Link>
          ) : null}
        </div>
      ) : null}

      {plan === 'free' ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">
            <strong>Document generation is a Navigator+ feature.</strong>{' '}
            Upgrade to Navigator to generate up to 3 compliance documents per
            month, or to Compass for unlimited.{' '}
            <Link
              href="/dashboard/billing?plan=navigator"
              className="font-medium underline underline-offset-2"
            >
              See plans
            </Link>
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr]">
        {/* Sidebar */}
        <aside>
          <nav aria-label="Categories" className="space-y-1">
            {CATEGORY_ORDER.map((cat) => {
              const meta = CATEGORY_DETAILS[cat];
              const isActive = selectedCategory === cat;
              const count =
                cat === 'ALL'
                  ? templates.length
                  : templates.filter((t) => t.category === cat).length;
              return (
                <button
                  type="button"
                  key={cat}
                  onClick={(): void => setSelectedCategory(cat)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition ${
                    isActive
                      ? 'bg-[#E6F4F4] font-medium text-[#0B6E6E]'
                      : 'text-[#555] hover:bg-[#F5F5F5]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden="true">{meta.icon}</span>
                    <span>{meta.label}</span>
                  </span>
                  <span className="text-xs text-[#999]">{count}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main grid */}
        <section>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {visibleTemplates.map((t) => {
              const existing = generatedByTemplate.get(t.templateId);
              return (
                <DocumentTemplateCard
                  key={t.templateId}
                  templateId={t.templateId}
                  documentName={t.documentName}
                  regulatoryBasis={t.regulatoryBasis}
                  category={t.category}
                  isGenerated={existing !== undefined}
                  currentVersion={existing?.version ?? null}
                  plan={plan}
                  quotaExhausted={quotaExhausted}
                  requiredPlan={t.requiredPlan}
                />
              );
            })}
          </div>

          {/* Generated documents list */}
          <div className="mt-8">
            <h2 className="mb-3 text-base font-semibold text-[#0D2B45]">
              Your generated documents
            </h2>
            {generated.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#CCCCCC] bg-[#FAFAFA] p-6 text-center text-sm text-[#777]">
                No documents generated yet. Choose a template above to get started.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-[#E5E5E5] bg-white">
                <table className="min-w-full divide-y divide-[#E5E5E5] text-sm">
                  <thead className="bg-[#F9F9F9] text-left text-xs uppercase tracking-wide text-[#777]">
                    <tr>
                      <th className="px-4 py-3">Document</th>
                      <th className="px-4 py-3">Version</th>
                      <th className="px-4 py-3">Generated</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F0]">
                    {generated.map((g) => (
                      <tr key={g.id} className="hover:bg-[#FAFAFA]">
                        <td className="px-4 py-3">
                          <div className="font-medium text-[#1A1A1A]">
                            {g.documentName}
                          </div>
                          <div className="font-mono text-[10px] text-[#0B6E6E]">
                            {g.regulatoryBasis ?? ''}
                          </div>
                        </td>
                        <td className="px-4 py-3">v{g.version}</td>
                        <td className="px-4 py-3 text-[#555]">
                          {new Date(g.updatedAt).toLocaleDateString('en-NG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={(): void => {
                              void downloadDoc(g.id);
                            }}
                            disabled={downloadingId === g.id}
                            className="mr-2 inline-flex items-center rounded-md border border-[#0B6E6E] px-2.5 py-1 text-xs font-medium text-[#0B6E6E] transition hover:bg-[#E6F4F4] disabled:opacity-50"
                          >
                            {downloadingId === g.id ? 'Loading…' : 'Download .docx'}
                          </button>
                          <Link
                            href={`/dashboard/compliance/documents/generate/${g.templateType}`}
                            className="inline-flex items-center rounded-md bg-[#0B6E6E] px-2.5 py-1 text-xs font-medium text-white"
                          >
                            Regenerate
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {downloadError ? (
              <p className="mt-2 text-xs text-[#C0392B]">{downloadError}</p>
            ) : null}
          </div>
        </section>
      </div>

      {/* Mandatory legal disclaimer (CLAUDE.md §16 Rule 1) */}
      <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs text-amber-800">
          All generated documents are first drafts for review. Klarify provides
          regulatory information, not legal advice. Review with a qualified
          practitioner before adopting for production use.
        </p>
      </div>
    </div>
  );
}
