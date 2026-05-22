import { NextResponse } from 'next/server';
import { createCalendarEventSchema } from '@klarify/core';
import { prisma, resolveOrgId, withRls } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';
import { serializeCalendarEvent } from '@/lib/calendar';

function parseDueDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0));
}

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  try {
    const orgId = await resolveOrgId(userId);
    if (!orgId) {
      return NextResponse.json({ success: true, data: [], meta: { total: 0 } });
    }

    const url = new URL(request.url);
    const daysParam = url.searchParams.get('days');
    const status = url.searchParams.get('status'); // open | complete | all
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 200), 500);

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const where: {
      orgId: string;
      isComplete?: boolean;
      dueDate?: { gte?: Date; lte?: Date };
    } = { orgId };

    if (status === 'open') where.isComplete = false;
    if (status === 'complete') where.isComplete = true;

    if (daysParam) {
      const days = Number(daysParam);
      if (!Number.isNaN(days) && days > 0) {
        const end = new Date(now);
        end.setDate(end.getDate() + days);
        where.dueDate = { gte: now, lte: end };
        where.isComplete = false;
      }
    }

    const events = await withRls({ userId, orgId }, (tx) =>
      tx.complianceEvent.findMany({
        where,
        orderBy: [{ isComplete: 'asc' }, { dueDate: 'asc' }],
        take: limit,
      }),
    );

    return NextResponse.json({
      success: true,
      data: events.map(serializeCalendarEvent),
      meta: { total: events.length },
    });
  } catch (err) {
    console.error('[api/calendar/events/get]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch calendar events.', code: 'CALENDAR_FETCH_ERROR' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
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

  const parsed = createCalendarEventSchema.safeParse(rawBody);
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
    const created = await withRls({ userId, orgId }, (tx) =>
      tx.complianceEvent.create({
        data: {
          orgId,
          eventType: body.eventType,
          title: body.title,
          description: body.description ?? null,
          dueDate: parseDueDate(body.dueDate),
          recurrence: body.recurrence ?? null,
          isComplete: false,
        },
      }),
    );

    return NextResponse.json({ success: true, data: serializeCalendarEvent(created) }, { status: 201 });
  } catch (err) {
    console.error('[api/calendar/events/post]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to create calendar event.', code: 'CALENDAR_CREATE_ERROR' },
      { status: 500 },
    );
  }
}
