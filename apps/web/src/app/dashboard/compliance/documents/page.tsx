import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { prisma, resolveOrgId } from '@/lib/db';
import {
  DOCUMENT_TEMPLATES,
  listTemplates,
  type TemplateId,
} from '@klarify/ai/prompts/documents';
import { PLAN_LIMITS, type Plan } from '@klarify/core';
import { getPublicApiBaseUrl } from '@/lib/env';
import { DocumentLibraryClient } from './_client';

interface PageProps {
  searchParams: { tab?: string };
}

/**
 * /dashboard/compliance/documents — Document Generator library (Sprint 4 S4-B2).
 * US-008B — White Paper Analyzer sub-tab (?tab=analyzer).
 */
export default async function DocumentLibraryPage({
  searchParams,
}: PageProps): Promise<JSX.Element> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect('/sign-in');

  const orgId = await resolveOrgId(user.id);
  const plan = await resolveEffectivePlan(user.id);
  const limit = PLAN_LIMITS[plan].document_templates;

  // Monthly counter — we don't query Redis from the web app (no client),
  // so we surface a count derived from generated_documents created in the
  // current calendar month. This drifts from the Redis truth ONLY in the
  // rare edge case of a Redis outage during dev fail-open — acceptable
  // for the UI hint, which is for guidance, not enforcement (enforcement
  // is server-side on the API).
  const generatedThisMonth = orgId
    ? await countGenerationsThisMonth(orgId)
    : 0;

  const generated = orgId ? await loadCurrentDocs(orgId, user.id) : [];
  const recentWhitePapers = orgId ? await loadRecentWhitePapers(orgId) : [];
  const hasWhitePaperAnalyzer = PLAN_LIMITS[plan].white_paper_analyzer;
  const initialTab = searchParams.tab === 'analyzer' ? 'analyzer' : 'templates';

  return (
    <Suspense fallback={<div className="p-6 text-sm text-[#555]">Loading documents…</div>}>
      <DocumentLibraryClient
        templates={listTemplates().map((t) => ({
          templateId: t.templateId,
          documentName: t.documentName,
          regulatoryBasis: t.regulatoryBasis,
          category: t.category,
          requiredPlan: t.requiredPlan,
        }))}
        generated={generated.map((g) => ({
          id: g.id,
          templateType: g.templateType,
          documentName: DOCUMENT_TEMPLATES[g.templateType as TemplateId]?.documentName ?? g.title,
          regulatoryBasis: g.regulatoryBasis,
          version: g.version,
          createdAt: g.createdAt.toISOString(),
          updatedAt: g.updatedAt.toISOString(),
        }))}
        plan={plan}
        monthlyLimit={Number.isFinite(limit) ? limit : null}
        monthlyUsed={generatedThisMonth}
        recentWhitePapers={recentWhitePapers}
        hasWhitePaperAnalyzer={hasWhitePaperAnalyzer}
        initialTab={initialTab}
        apiBaseUrl={getPublicApiBaseUrl()}
      />
    </Suspense>
  );
}

/**
 * Highest-tier plan across the user's org memberships. Mirrors the API
 * `resolvePlan()` so the UI quotas match what the server enforces.
 */
async function resolveEffectivePlan(userId: string): Promise<Plan> {
  const memberships = await prisma.orgMember.findMany({
    where: { userId },
    include: { org: { select: { plan: true } } },
  });
  const rank: Record<Plan, number> = { free: 0, navigator: 1, compass: 2, flagship: 3 };
  let best: Plan = 'free';
  for (const m of memberships) {
    const p = (m.org.plan ?? 'free') as Plan;
    if ((rank[p] ?? -1) > rank[best]) best = p;
  }
  return best;
}

async function countGenerationsThisMonth(orgId: string): Promise<number> {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const count = await prisma.generatedDocument.count({
    where: {
      orgId,
      deletedAt: null,
      createdAt: { gte: start },
    },
  });
  return count;
}

interface CurrentDocRow {
  id: string;
  templateType: string;
  title: string;
  regulatoryBasis: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

async function loadRecentWhitePapers(orgId: string) {
  return prisma.whitePaperAnalysis.findMany({
    where: { orgId, deletedAt: null },
    orderBy: { uploadedAt: 'desc' },
    take: 10,
    select: {
      id: true,
      originalFilename: true,
      status: true,
      completenessPct: true,
      uploadedAt: true,
      sourceJurisdiction: true,
      licenceCategorySought: true,
    },
  }).then((rows) =>
    rows.map((r) => ({
      id: r.id,
      originalFilename: r.originalFilename,
      status: r.status,
      completenessPct: r.completenessPct,
      uploadedAt: r.uploadedAt.toISOString(),
      sourceJurisdiction: r.sourceJurisdiction,
      licenceCategorySought: r.licenceCategorySought,
    })),
  );
}

async function loadCurrentDocs(orgId: string, _userId: string): Promise<CurrentDocRow[]> {
  return prisma.generatedDocument.findMany({
    where: { orgId, isCurrent: true, deletedAt: null },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      templateType: true,
      title: true,
      regulatoryBasis: true,
      version: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
