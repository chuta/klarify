import { NextResponse } from 'next/server';
import { prisma, resolveOrgId, withRls } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  try {
    const orgId = await resolveOrgId(userId);
    if (orgId === null) {
      return NextResponse.json({ success: true, data: { tasks: [], orgId: null } });
    }

    const tasks = await withRls({ userId, orgId }, (tx) =>
      tx.roadmapTask.findMany({
        where: { orgId },
        orderBy: [{ phase: 'asc' }, { createdAt: 'asc' }],
      }),
    );

    const grouped: Record<number, typeof tasks> = {};
    for (const task of tasks) {
      if (!grouped[task.phase]) grouped[task.phase] = [];
      grouped[task.phase]!.push(task);
    }

    return NextResponse.json({ success: true, data: { tasks, grouped, orgId } });
  } catch (err) {
    console.error('[compliance/roadmap] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch roadmap.', code: 'ROADMAP_FETCH_ERROR' },
      { status: 500 },
    );
  }
}
