import { NextResponse } from 'next/server';
import { updateCalendarEventSchema } from '@klarify/core';
import { prisma, resolveOrgId, withRls } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';
import { serializeCalendarEvent } from '@/lib/calendar';

function parseDueDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0));
}

interface RouteParams {
  params: { id: string };
}

export async function PUT(request: Request, { params }: RouteParams): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.', code: 'VALIDATION_ERROR' },
      { status: 422 },
    );
  }

  const parsed = updateCalendarEventSchema.safeParse(rawBody);
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? 'Invalid request body.';
    return NextResponse.json(
      { success: false, error: first, code: 'VALIDATION_ERROR' },
      { status: 422 },
    );
  }

  try {
    const orgId = await resolveOrgId(userId);
    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'Organisation not found.', code: 'ORG_NOT_FOUND' },
        { status: 404 },
      );
    }

    const body = parsed.data;
    const patch: {
      title?: string;
      description?: string | null;
      dueDate?: Date;
      isComplete?: boolean;
      completedAt?: Date | null;
    } = {};

    if (body.title !== undefined) patch.title = body.title;
    if (body.description !== undefined) patch.description = body.description;
    if (body.dueDate !== undefined) patch.dueDate = parseDueDate(body.dueDate);
    if (body.isComplete !== undefined) {
      patch.isComplete = body.isComplete;
      patch.completedAt = body.isComplete ? new Date() : null;
    }

    const updated = await withRls({ userId, orgId }, async (tx) => {
      const existing = await tx.complianceEvent.findFirst({
        where: { id: params.id, orgId },
      });
      if (!existing) return null;

      return tx.complianceEvent.update({
        where: { id: params.id },
        data: patch,
      });
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Event not found.', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: serializeCalendarEvent(updated) });
  } catch (err) {
    console.error('[api/calendar/events/put]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to update calendar event.', code: 'CALENDAR_UPDATE_ERROR' },
      { status: 500 },
    );
  }
}
