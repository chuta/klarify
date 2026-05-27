import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma, resolveOrgId } from '@/lib/db';
import { getPublicApiBaseUrl } from '@/lib/env';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { WhitePaperDetailClient } from './_client';
import type { WhitePaperAnalysisResult } from '@klarify/core';
import { PLAN_LIMITS, type Plan } from '@klarify/core';
import Link from 'next/link';

interface PageProps {
  params: { id: string };
}

export default async function WhitePaperAnalyzerResultPage({
  params,
}: PageProps): Promise<JSX.Element> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect('/sign-in');

  const plan = await resolveEffectivePlan(user.id);
  if (!PLAN_LIMITS[plan].white_paper_analyzer) {
    redirect('/dashboard/compliance/documents?tab=analyzer');
  }

  const orgId = await resolveOrgId(user.id);
  if (!orgId) redirect('/dashboard/compliance/documents?tab=analyzer');

  const row = await prisma.whitePaperAnalysis.findFirst({
    where: { id: params.id, orgId, deletedAt: null },
  });
  if (!row) notFound();

  const initial = {
    status: row.status as 'pending' | 'extracting' | 'analysing' | 'complete' | 'error',
    errorMessage: row.errorMessage,
    result: (row.result as WhitePaperAnalysisResult | null) ?? null,
    filename: row.originalFilename ?? 'White paper',
  };

  return (
    <DashboardPageShell>
      <Link
        href="/dashboard/compliance/documents?tab=analyzer"
        className="mb-4 inline-block text-sm text-[#0B6E6E] hover:underline"
      >
        ← White Paper Analyzer
      </Link>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">White paper analysis</h1>
      </header>
      <WhitePaperDetailClient
        analysisId={params.id}
        initial={initial}
        apiBaseUrl={getPublicApiBaseUrl()}
      />
    </DashboardPageShell>
  );
}

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
