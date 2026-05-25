import { prisma } from '@/lib/db';

const PLAN_RANK: Record<string, number> = {
  free: 0,
  navigator: 1,
  compass: 2,
  flagship: 3,
};

/** Highest plan across all org memberships for the user. */
export async function resolveUserPlan(userId: string): Promise<string> {
  try {
    const memberships = await prisma.orgMember.findMany({
      where: { userId },
      include: { org: { select: { plan: true } } },
    });
    let best = 'free';
    for (const m of memberships) {
      const p = m.org.plan ?? 'free';
      if ((PLAN_RANK[p] ?? 0) > (PLAN_RANK[best] ?? 0)) best = p;
    }
    return best;
  } catch {
    return 'free';
  }
}

export function hasCompassAccess(plan: string): boolean {
  return plan === 'compass' || plan === 'flagship';
}
