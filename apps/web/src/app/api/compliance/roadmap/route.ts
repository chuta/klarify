import { NextResponse } from 'next/server';
import { prisma, resolveOrgId, withRls } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';
import {
  loadFullRoadmap,
  materialiseRoadmapIfEmpty,
  reconcileLockState,
} from '@/lib/roadmapService';
import { z } from 'zod';

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  try {
    const orgId = await resolveOrgId(userId);
    if (orgId === null) {
      return NextResponse.json({
        success: true,
        data: { tasks: [], grouped: {}, phaseProgress: [], orgId: null },
      });
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { productTypes: true },
    });
    const productTypes = profile?.productTypes ?? [];

    const data = await withRls({ userId, orgId }, async (tx) => {
      await materialiseRoadmapIfEmpty(tx, { orgId, productTypes });
      await reconcileLockState(tx, orgId);
      return loadFullRoadmap(tx, orgId);
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[compliance/roadmap] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch roadmap.', code: 'ROADMAP_FETCH_ERROR' },
      { status: 500 },
    );
  }
}

const createTaskSchema = z.object({
  phase: z.number().int().min(1).max(4),
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ownerUserId: z.string().uuid().optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  const rawBody: unknown = await request.json();
  const parsed = createTaskSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.', code: 'VALIDATION_ERROR' },
      { status: 422 },
    );
  }
  const body = parsed.data;

  try {
    const orgId = await resolveOrgId(userId);
    if (orgId === null) {
      return NextResponse.json(
        { success: false, error: 'Organisation not found.', code: 'ORG_NOT_FOUND' },
        { status: 404 },
      );
    }
    const created = await withRls({ userId, orgId }, async (tx) =>
      tx.roadmapTask.create({
        data: {
          orgId,
          phase: body.phase,
          title: body.title,
          description: body.description ?? null,
          regulatoryBasis: null,
          templateId: null,
          indicatorKey: null,
          templateRefId: null,
          isLocked: false,
          isBlocker: false,
          isCustom: true,
          status: 'not_started',
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          ownerUserId: body.ownerUserId ?? null,
        },
      }),
    );
    return NextResponse.json({ success: true, data: { task: created } }, { status: 201 });
  } catch (err) {
    console.error('[compliance/roadmap POST] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to create task.', code: 'TASK_CREATE_ERROR' },
      { status: 500 },
    );
  }
}
