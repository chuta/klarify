import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api';
import { prisma } from '@/lib/db';
import { ScoreGauge } from '@/components/ScoreGauge';
import { ARIPRestrictionsWidget } from '@/components/dashboard/ARIPRestrictionsWidget';
import {
  RecentDocumentsWidget,
  type RecentDoc,
} from '@/components/dashboard/RecentDocumentsWidget';
import { CriticalDocumentBanner } from '@/components/dashboard/CriticalDocumentBanner';
// Import the label map from the pure-data module, NOT from the widget itself.
// The widget is `'use client'`, and named exports from client modules become
// opaque client references inside Server Components — reading a property off
// one and serialising the result into the RSC stream throws:
//   "Could not find the module
//    `…ARIPRestrictionsWidget.tsx#ARIP_STAGE_LABELS#…` in the React Client
//    Manifest."
import { ARIP_STAGE_LABELS } from '@/components/dashboard/aripLabels';
import type { DimensionKey } from '@klarify/core';
import { DimensionBreakdown } from '@/components/compliance/DimensionBreakdown';
import { ScoreHistorySection } from './_score-history';
import { FollowUpAlertsWidget, type FollowUpAlert } from '@/components/dashboard/FollowUpAlertsWidget';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ARIPData {
  current_stage: string;
  stage_status: string;
  aip_issued_date: string | null;
  aip_expiry_date: string | null;
  arip_entry_customer_count: number | null;
  current_customer_count: number | null;
  growth_cap_breached: boolean;
  next_filing?: { title: string; due_date: string } | null;
}

interface ComplianceScoreData {
  totalScore: number;
  // API returns dimensions as a nested object with snake_case keys.
  dimensions: Record<DimensionKey, number>;
  calculatedAt?: string;
  orgId?: string;
}

interface ScoreHistoryData {
  days: number;
  points: Array<{
    date: string;
    total: number;
    corporate_structure: number;
    capital_licensing: number;
    kyc_infrastructure: number;
    aml_cft_programme: number;
    transaction_monitoring: number;
    regulatory_reporting: number;
    regulatory_relationships: number;
    product_classification: number;
  }>;
  current: ScoreHistoryData['points'][number] | null;
  baseline: ScoreHistoryData['points'][number] | null;
  delta: number;
}

// ── Page ───────────────────────────────────────────────────────────────────────

/**
 * /dashboard — Real Sprint 1 dashboard.
 *
 * 1. Fetches user identity from Supabase (getUser is safe — server-side).
 * 2. Fetches compliance score from the Hono API using the Supabase JWT.
 * 3. If no score exists (user hasn't completed onboarding), prompts to do so.
 * 4. Renders ReadinessScore gauge + 8 dimension cards + quick actions.
 *
 * Auth redirect is handled by the parent layout.tsx — this page can assume
 * the user is authenticated.
 */
export default async function DashboardPage(): Promise<JSX.Element> {
  const supabase = createClient();

  // Parallelise the two auth reads. getUser() hits the Supabase auth API
  // (slow); getSession() reads cookies (effectively free). Running them
  // serially gated TTFB on the sum; Promise.all gates it on the slower one.
  const [sessionRes, userRes] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser(),
  ]);
  const session = sessionRes.data.session;
  const user = userRes.data.user;

  if (!session || !user) redirect('/sign-in');

  const accessToken = session.access_token;
  const displayName = (user.user_metadata?.name as string | undefined)
    ?? user.email?.split('@')[0]
    ?? 'Founder';

  // Parallelise all independent API fetches. With Supabase in eu-north-1
  // and Netlify functions likely in us-east-1, each call is a transatlantic
  // round-trip — running them serially roughly doubled the dashboard's TTFB.
  const [scoreResult, aripResult, recentDocs, historyResult, followUpAlerts] = await Promise.all([
    apiFetch<ComplianceScoreData>('/api/compliance/score', accessToken),
    apiFetch<ARIPData>('/api/arip', accessToken),
    loadRecentDocs(user.id),
    apiFetch<ScoreHistoryData>('/api/compliance/score/history?days=30', accessToken),
    loadFollowUpAlerts(user.id),
  ]);

  const score: ComplianceScoreData | null = scoreResult.success ? scoreResult.data : null;
  const hasOnboarded = score !== null && score.totalScore >= 0;
  const historyData: ScoreHistoryData | null = historyResult.success ? historyResult.data : null;

  const arip: ARIPData | null = aripResult.success ? aripResult.data : null;
  const isAIPActive =
    arip?.current_stage === 'aip_active' && arip?.stage_status === 'active';

  const criticalDoc = await pickCriticalDoc(user.id);

  return (
    <DashboardPageShell>
      {/* ── Welcome header ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">
          Welcome back, {displayName} 👋
        </h1>
        <p className="mt-1 text-sm text-[#555555]">
          {hasOnboarded
            ? 'Here is your live compliance status.'
            : 'Complete your profile to get your Readiness Score.'}
        </p>
      </div>

      {/* ── CRITICAL document banner (highest priority — supersedes ARIP) ── */}
      <CriticalDocumentBanner doc={criticalDoc} />

      {/* ── Outstanding follow-up alerts from Regulator CRM ── */}
      {followUpAlerts.length > 0 && (
        <FollowUpAlertsWidget alerts={followUpAlerts} />
      )}

      {/* ── AIP Restrictions Widget (next-highest urgency) ── */}
      {isAIPActive && arip && (
        <ARIPRestrictionsWidget arip={arip} accessToken={accessToken} />
      )}

      {/* ── Onboarding CTA (shown when score doesn't exist yet) ── */}
      {!hasOnboarded && (
        <div className="mb-8 rounded-2xl border-2 border-dashed border-[#0B6E6E] bg-[#E6F4F4] p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white">
            <svg className="h-7 w-7 text-[#0B6E6E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 8l2 2 4-4" />
            </svg>
          </div>
          <h2 className="mb-2 text-lg font-semibold text-[#0B6E6E]">
            Calculate your Regulatory Readiness Score
          </h2>
          <p className="mb-6 text-sm text-[#555555]">
            Answer 5 quick questions about your product and infrastructure. Takes less than 3 minutes.
          </p>
          <Link
            href="/onboarding"
            className="inline-block rounded-xl bg-[#0B6E6E] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#0D2B45]"
          >
            Start free assessment →
          </Link>
        </div>
      )}

      {/* ── Score + dimensions (shown when onboarded) ── */}
      {hasOnboarded && score && (
        <>
          {/* Readiness Score hero */}
          <div className="mb-8 overflow-hidden rounded-2xl border border-[#CCCCCC] bg-white shadow-sm">
            <div className="flex flex-col items-center gap-8 p-8 md:flex-row">
              {/* Gauge */}
              <div className="shrink-0">
                <ScoreGauge score={score.totalScore} size={220} />
              </div>

              {/* Copy */}
              <div className="flex-1">
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#CCCCCC]">
                  Regulatory Readiness Score
                </p>
                <h2 className="mb-3 text-3xl font-bold text-[#1A1A1A]">
                  {score.totalScore} / 100
                </h2>
                <p className="mb-5 text-sm text-[#555555]">
                  Your score is calculated across 8 compliance dimensions weighted by their regulatory
                  impact. Improve by completing tasks in your Roadmap.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/dashboard/roadmap"
                    className="rounded-lg bg-[#0B6E6E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0D2B45]"
                  >
                    View Roadmap
                  </Link>
                  <Link
                    href="/dashboard/chat"
                    className="rounded-lg border border-[#0B6E6E] px-4 py-2 text-sm font-semibold text-[#0B6E6E] transition hover:bg-[#E6F4F4]"
                  >
                    Ask FounderCounsel
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Dimension Breakdown — interactive expandable list (Sprint 4-C) */}
          <div className="mb-8 overflow-hidden rounded-2xl border border-[#CCCCCC] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-[#1A1A1A]">Dimension Breakdown</h2>
            <DimensionBreakdown dimensions={score.dimensions} />
          </div>

          {/* Score History — client wrapper handles days-switching (Sprint 4-C) */}
          {historyData && Array.isArray(historyData.points) && (
            <div className="mb-8">
              <ScoreHistorySection
                initialData={historyData}
                accessToken={accessToken}
              />
            </div>
          )}

          {/* Recent documents widget — S3-C2 */}
          <div className="mb-8">
            <RecentDocumentsWidget docs={recentDocs} />
          </div>

          {/* Quick actions */}
          <h2 className="mb-4 text-base font-semibold text-[#1A1A1A]">Quick Actions</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4">
            <QuickAction
              title="Upload a Regulator Letter"
              description="Received something from SEC, CBN, or NFIU? Get a plain-English summary and a 72-hour action plan."
              href="/dashboard/documents"
              accent="#C0392B"
              urgent
            />
            <QuickAction
              title="Generate an AML Document"
              description="Draft your BWRA, AML/CFT Policy, KYC Tiers framework, or STR template in minutes."
              href="/dashboard/documents"
              accent="#0B6E6E"
            />
            <QuickAction
              title="Classify your Product"
              description="Not sure if you need a DAX, DAOP, or DAC licence? Get an instant classification."
              href="/dashboard/classify"
              accent="#D4A843"
            />
            <QuickAction
              title="ARIP Tracker"
              description="Track your 5-stage ARIP application, manage AIP conditions, and monitor your compliance calendar."
              href="/dashboard/arip"
              accent="#0B6E6E"
              aripStageBadge={arip ? (ARIP_STAGE_LABELS[arip.current_stage] ?? null) : null}
            />
          </div>
        </>
      )}
    </DashboardPageShell>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface QuickActionProps {
  title: string;
  description: string;
  href: string;
  accent: string;
  urgent?: boolean;
  aripStageBadge?: string | null;
}

// ── Server-side data loaders ────────────────────────────────────────────────

/** Last 10 uploaded documents for the current user. RLS-scoped via the userId filter. */
async function loadRecentDocs(userId: string): Promise<RecentDoc[]> {
  try {
    const docs = await prisma.uploadedDocument.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        filename: true,
        urgencyLevel: true,
        uploadedAt: true,
        status: true,
      },
    });
    return docs.map((d): RecentDoc => ({
      id: d.id,
      filename: d.filename,
      urgencyLevel: d.urgencyLevel as RecentDoc['urgencyLevel'],
      uploadedAt: d.uploadedAt.toISOString(),
      status: d.status,
    }));
  } catch (err) {
    console.warn('[dashboard] recent docs query failed', err);
    return [];
  }
}

interface CriticalDoc {
  id: string;
  filename: string;
  daysRemaining: number | null;
}

/**
 * Pick the most actionable CRITICAL document for the persistent banner.
 * Triggers when: urgency='CRITICAL' AND (deadline < 7d OR no deadline).
 *
 * We read `days_remaining` from analysis_result JSON because it is the
 * authoritative parsed value — the table doesn't have a dedicated column
 * for it (the column would have to be recomputed daily).
 */
async function pickCriticalDoc(userId: string): Promise<CriticalDoc | null> {
  try {
    const candidates = await prisma.uploadedDocument.findMany({
      where: { userId, urgencyLevel: 'CRITICAL', status: 'complete' },
      orderBy: { uploadedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        filename: true,
        analysisResult: true,
      },
    });
    for (const c of candidates) {
      const days = extractDaysRemaining(c.analysisResult);
      if (days === null || days < 7) {
        return { id: c.id, filename: c.filename, daysRemaining: days };
      }
    }
    return null;
  } catch (err) {
    console.warn('[dashboard] critical-doc query failed', err);
    return null;
  }
}

function extractDaysRemaining(analysis: unknown): number | null {
  if (!analysis || typeof analysis !== 'object') return null;
  const obj = analysis as Record<string, unknown>;
  const deadline = obj['response_deadline'];
  if (!deadline || typeof deadline !== 'object') return null;
  const days = (deadline as Record<string, unknown>)['days_remaining'];
  return typeof days === 'number' ? days : null;
}

/** Follow-up interactions due within 7 days and not yet completed. */
async function loadFollowUpAlerts(userId: string): Promise<FollowUpAlert[]> {
  try {
    const membership = await prisma.orgMember.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { orgId: true },
    });
    if (!membership) return [];
    const { orgId } = membership;

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const interactions = await prisma.regulatorInteraction.findMany({
      where: {
        orgId,
        followUpRequired: true,
        isComplete: false,
        followUpDate: { lte: sevenDaysFromNow },
      },
      orderBy: { followUpDate: 'asc' },
      take: 5,
      select: {
        id: true,
        regulatorCode: true,
        subject: true,
        followUpDate: true,
      },
    });

    return interactions.map((i): FollowUpAlert => ({
      id: i.id,
      regulatorCode: i.regulatorCode,
      subject: i.subject,
      followUpDate: i.followUpDate?.toISOString().slice(0, 10) ?? null,
    }));
  } catch (err) {
    console.warn('[dashboard] follow-up alerts query failed', err);
    return [];
  }
}

function QuickAction({ title, description, href, accent, urgent, aripStageBadge }: QuickActionProps): JSX.Element {
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-[#CCCCCC] bg-white p-5 shadow-sm transition hover:border-current hover:shadow-md"
      style={{ '--tw-ring-color': accent } as React.CSSProperties}
    >
      {urgent && (
        <span
          className="mb-3 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ backgroundColor: accent }}
        >
          Urgent
        </span>
      )}
      {aripStageBadge && (
        <span className="mb-3 inline-block rounded-full bg-[#D4A843] px-2 py-0.5 text-[10px] font-bold text-white">
          {aripStageBadge}
        </span>
      )}
      <div
        className="mb-2 h-1 w-8 rounded-full"
        style={{ backgroundColor: accent }}
      />
      <h3 className="mb-1.5 text-sm font-semibold text-[#1A1A1A] group-hover:text-[#0B6E6E] transition">
        {title}
      </h3>
      <p className="text-xs text-[#555555] leading-relaxed">{description}</p>
    </Link>
  );
}
