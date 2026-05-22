import { NextResponse } from 'next/server';
import { prisma, resolveOrgId, withRls } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';

/**
 * GET /api/arip/history
 *
 * Returns the stage transition history for the ARIP application.
 * Ordered by transitioned_at DESC (most recent first).
 *
 * Regulatory source: ARIP Framework, SEC Nigeria, June 2024.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  try {
    const orgId = await resolveOrgId(userId);
    if (!orgId) return NextResponse.json({ success: true, data: [] });

    const app = await withRls({ userId, orgId }, (tx) =>
      tx.aripApplication.findFirst({ where: { orgId }, orderBy: { createdAt: 'desc' } }),
    );
    if (!app) return NextResponse.json({ success: true, data: [] });

    // Query arip_stage_history for this application
    const history = await prisma.$queryRaw<Array<{
      id: string;
      from_stage: string | null;
      to_stage: string;
      notes: string | null;
      transitioned_at: Date;
    }>>`
      SELECT id, from_stage, to_stage, notes, transitioned_at
      FROM arip_stage_history
      WHERE arip_id = ${app.id}::uuid
      ORDER BY transitioned_at ASC
    `;

    return NextResponse.json({
      success: true,
      data: history.map((h) => ({
        id: h.id,
        fromStage: h.from_stage,
        toStage: h.to_stage,
        notes: h.notes,
        transitionedAt: h.transitioned_at.toISOString(),
      })),
    });
  } catch (err) {
    console.error('[arip/history] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stage history.', code: 'HISTORY_ERROR' },
      { status: 500 },
    );
  }
}
