import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';

const prefsUpdateSchema = z.object({
  emailDeadlineAlerts: z.boolean().optional(),
  emailWeeklyDigest: z.boolean().optional(),
  emailDocumentAnalysis: z.boolean().optional(),
  emailAripAlerts: z.boolean().optional(),
  emailLifecycle: z.boolean().optional(),
});

function serializePrefs(prefs: {
  emailDeadlineAlerts: boolean;
  emailWeeklyDigest: boolean;
  emailDocumentAnalysis: boolean;
  emailAripAlerts: boolean;
  emailLifecycle: boolean;
  emailBilling: boolean;
  updatedAt: Date;
}) {
  return {
    emailDeadlineAlerts: prefs.emailDeadlineAlerts,
    emailWeeklyDigest: prefs.emailWeeklyDigest,
    emailDocumentAnalysis: prefs.emailDocumentAnalysis,
    emailAripAlerts: prefs.emailAripAlerts,
    emailLifecycle: prefs.emailLifecycle,
    emailBilling: prefs.emailBilling,
    updatedAt: prefs.updatedAt.toISOString(),
  };
}

async function upsertPrefs(
  userId: string,
  patch: z.infer<typeof prefsUpdateSchema> = {},
) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_user_id', $1, true)`,
      userId,
    );
    return tx.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...patch },
      update: patch,
    });
  });
}

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();

  try {
    const prefs = await upsertPrefs(auth.userId);
    return NextResponse.json({ success: true, data: serializePrefs(prefs) });
  } catch (err) {
    console.error('[notifications/preferences GET] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to load preferences.', code: 'PREFS_FETCH_ERROR' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = prefsUpdateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.', code: 'VALIDATION_ERROR' },
      { status: 422 },
    );
  }

  try {
    const prefs = await upsertPrefs(auth.userId, parsed.data);
    return NextResponse.json({ success: true, data: serializePrefs(prefs) });
  } catch (err) {
    console.error('[notifications/preferences PATCH] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to save preference.', code: 'PREFS_UPDATE_ERROR' },
      { status: 500 },
    );
  }
}
