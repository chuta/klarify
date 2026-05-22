import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { prisma, resolveOrgId } from '@/lib/db';
import { loadRegulatorsForUser } from '@/lib/regulators';
import { RegulatorHubClient } from './_client';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';

/**
 * /dashboard/regulators — Regulator Engagement Hub
 *
 * Server component: fetches auth + regulator list + interaction counts.
 * Client component (_client.tsx) handles: log-interaction modal, view-history slide-over,
 * and plan gating for Compass+ CRM features.
 *
 * CLAUDE.md §16 Rule 2: no regulatory data hardcoded — fetched from DB.
 * CLAUDE.md §10: CRM features (interaction log, history) gated at Compass+.
 */

interface InteractionCount {
  regulatorCode: string;
  _count: { id: number };
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function RegulatorsPage(): Promise<JSX.Element> {
  const supabase = createClient();
  const [sessionRes, userRes] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser(),
  ]);
  const session = sessionRes.data.session;
  const user = userRes.data.user;
  if (!session || !user) redirect('/sign-in');

  // Parallelise: regulator list (RLS-scoped), interaction counts, plan.
  const [regulators, interactionCounts, plan] = await Promise.all([
    loadRegulatorsForUser(user.id),
    loadInteractionCounts(user.id),
    resolvePlan(user.id),
  ]);

  // Build count map for quick lookup.
  const countMap: Record<string, number> = {};
  for (const row of interactionCounts) {
    countMap[row.regulatorCode] = row._count.id;
  }

  const hasCrm = plan === 'compass' || plan === 'flagship';

  return (
    <DashboardPageShell>
      {/* ── Page header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">Regulator Engagement Hub</h1>
        <p className="mt-1 text-sm text-[#555555]">
          Track your relationships with Nigeria&apos;s key digital asset regulators.
          Every interaction documented. Every deadline met.
        </p>
      </div>

      {/* ── ARIP Programme Banner ── */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-[#0B6E6E] bg-[#E6F4F4]">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="mt-0.5 text-2xl">🏛️</span>
            <div>
              <span className="mb-1 inline-block rounded-full bg-[#0B6E6E] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                ARIP Programme
              </span>
              <h2 className="mt-1 text-base font-semibold text-[#1A1A1A]">
                Currently in the ARIP Programme?
              </h2>
              <p className="mt-0.5 text-sm text-[#555555]">
                Track your 5-stage application progress, manage AIP conditions, and monitor
                your compliance calendar in the ARIP Tracker.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/regulators/arip"
            className="shrink-0 rounded-xl bg-[#0B6E6E] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0D2B45]"
          >
            Open ARIP Tracker →
          </Link>
        </div>
      </div>

      {/* ── Regulator cards — client component handles CRM actions ── */}
      <RegulatorHubClient
        regulators={regulators}
        interactionCounts={countMap}
        hasCrm={hasCrm}
        plan={plan}
      />
    </DashboardPageShell>
  );
}

// ── Server-side data loaders ───────────────────────────────────────────────────

async function loadInteractionCounts(userId: string): Promise<InteractionCount[]> {
  try {
    const orgId = await resolveOrgId(userId);
    if (!orgId) return [];
    const rows = await prisma.regulatorInteraction.groupBy({
      by: ['regulatorCode'],
      where: { orgId },
      _count: { id: true },
    });
    return rows.map((r) => ({
      regulatorCode: r.regulatorCode,
      _count: { id: r._count.id },
    }));
  } catch (err) {
    console.warn('[regulators] interaction count query failed', err);
    return [];
  }
}

async function resolvePlan(userId: string): Promise<string> {
  try {
    const memberships = await prisma.orgMember.findMany({
      where: { userId },
      include: { org: { select: { plan: true } } },
    });
    const planRank: Record<string, number> = { free: 0, navigator: 1, compass: 2, flagship: 3 };
    let best = 'free';
    for (const m of memberships) {
      const p = m.org.plan ?? 'free';
      if ((planRank[p] ?? 0) > (planRank[best] ?? 0)) best = p;
    }
    return best;
  } catch {
    return 'free';
  }
}
