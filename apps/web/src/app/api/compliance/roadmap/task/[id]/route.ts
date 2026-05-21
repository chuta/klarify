import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  DIMENSION_INDICATORS,
  DIMENSION_WEIGHTS,
  type DimensionKey,
} from '@klarify/core';
import { resolveOrgId, withRls } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';
import {
  flipIndicatorAndRecalc,
  reconcileLockState,
} from '@/lib/roadmapService';

// ── PUT — update status/owner/dueDate/notes ─────────────────────────────────
const updateTaskSchema = z.object({
  status: z.enum(['not_started', 'in_progress', 'complete', 'blocked']).optional(),
  ownerUserId: z.string().uuid().nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;
  const { id: taskId } = params;

  const rawBody: unknown = await request.json();
  const parsed = updateTaskSchema.safeParse(rawBody);
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

    const result = await withRls({ userId, orgId }, async (tx) => {
      const task = await tx.roadmapTask.findFirst({
        where: { id: taskId, orgId, deletedAt: null },
      });
      if (task === null) return { task: null, scoreUpdate: null };
      if (task.isLocked && body.status === 'complete') {
        return { task: 'locked' as const, scoreUpdate: null };
      }

      const becameComplete = body.status === 'complete' && task.status !== 'complete';

      const updated = await tx.roadmapTask.update({
        where: { id: taskId },
        data: {
          status: body.status ?? task.status,
          completedAt: becameComplete
            ? new Date()
            : body.status !== undefined && body.status !== 'complete'
              ? null
              : task.completedAt,
          ownerUserId:
            body.ownerUserId === undefined ? task.ownerUserId : body.ownerUserId,
          dueDate:
            body.dueDate === undefined
              ? task.dueDate
              : body.dueDate === null
                ? null
                : new Date(body.dueDate),
          notes: body.notes === undefined ? task.notes : body.notes,
        },
      });

      let scoreUpdate: Awaited<ReturnType<typeof flipIndicatorAndRecalc>>['scoreUpdate'] | null = null;
      if (becameComplete && updated.indicatorKey) {
        const [dim, ind] = updated.indicatorKey.split('.');
        const validDims = Object.keys(DIMENSION_WEIGHTS) as DimensionKey[];
        if (
          dim && ind &&
          validDims.includes(dim as DimensionKey) &&
          (DIMENSION_INDICATORS[dim as DimensionKey] as readonly string[]).includes(ind)
        ) {
          const flip = await flipIndicatorAndRecalc(tx, orgId, dim as DimensionKey, ind, true);
          scoreUpdate = flip.scoreUpdate;
        }
      }
      if (becameComplete) {
        await reconcileLockState(tx, orgId);
      }
      return { task: updated, scoreUpdate };
    });

    if (result.task === null) {
      return NextResponse.json(
        { success: false, error: 'Task not found.', code: 'TASK_NOT_FOUND' },
        { status: 404 },
      );
    }
    if (result.task === 'locked') {
      return NextResponse.json(
        {
          success: false,
          error: 'This task is locked. Complete the prerequisite phase first.',
          code: 'TASK_LOCKED',
        },
        { status: 409 },
      );
    }
    return NextResponse.json({
      success: true,
      data: { task: result.task, scoreUpdate: result.scoreUpdate },
    });
  } catch (err) {
    console.error('[compliance/roadmap/task PUT] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to update task.', code: 'TASK_UPDATE_ERROR' },
      { status: 500 },
    );
  }
}

// Backwards-compat PATCH (Sprint 1 UI). Marks complete + propagates indicator.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  // Delegate to PUT { status: 'complete' }.
  return PUT(
    new Request(request.url, {
      method: 'PUT',
      headers: request.headers,
      body: JSON.stringify({ status: 'complete' }),
    }),
    { params },
  );
}

// ── DELETE — soft delete custom tasks; 403 on seed tasks ───────────────────
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;
  const { id: taskId } = params;

  try {
    const orgId = await resolveOrgId(userId);
    if (orgId === null) {
      return NextResponse.json(
        { success: false, error: 'Organisation not found.', code: 'ORG_NOT_FOUND' },
        { status: 404 },
      );
    }
    const result = await withRls({ userId, orgId }, async (tx) => {
      const task = await tx.roadmapTask.findFirst({
        where: { id: taskId, orgId, deletedAt: null },
      });
      if (task === null) return 'not_found' as const;
      if (!task.isCustom) return 'seed_protected' as const;
      await tx.roadmapTask.update({
        where: { id: taskId },
        data: { deletedAt: new Date() },
      });
      return 'deleted' as const;
    });

    if (result === 'not_found') {
      return NextResponse.json(
        { success: false, error: 'Task not found.', code: 'TASK_NOT_FOUND' },
        { status: 404 },
      );
    }
    if (result === 'seed_protected') {
      return NextResponse.json(
        {
          success: false,
          error: 'Seed tasks cannot be deleted — they are part of the regulatory checklist.',
          code: 'SEED_TASK_PROTECTED',
        },
        { status: 403 },
      );
    }
    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (err) {
    console.error('[compliance/roadmap/task DELETE] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to delete task.', code: 'TASK_DELETE_ERROR' },
      { status: 500 },
    );
  }
}
