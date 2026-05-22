// Next.js Route Handler — /api/regulators/interactions
// Proxies GET/POST to the Hono API for client component access.
// Client components cannot call the Hono API directly (no access token in browser).

import { NextResponse } from 'next/server';
import { prisma, resolveOrgId, withRls } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';
import { PLAN_LIMITS } from '@klarify/core';
import type { CreateInteractionBody } from '@klarify/core';

const INTERACTION_TYPES = ['call', 'email', 'meeting', 'submission', 'letter'] as const;
type InteractionType = (typeof INTERACTION_TYPES)[number];

// ── Plan gate helper ──────────────────────────────────────────────────────────

async function checkCrmAccess(userId: string): Promise<boolean> {
  const memberships = await prisma.orgMember.findMany({
    where: { userId },
    include: { org: { select: { plan: true } } },
  });
  const planRank: Record<string, number> = { free: 0, navigator: 1, compass: 2, flagship: 3 };
  const best = memberships.reduce((acc, m) => {
    const r = planRank[m.org.plan ?? 'free'] ?? 0;
    return r > acc ? r : acc;
  }, 0);
  // compass = 2, flagship = 3
  return best >= 2;
}

// ── GET /api/regulators/interactions ─────────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  const hasCrm = await checkCrmAccess(userId);
  if (!hasCrm) {
    return NextResponse.json(
      {
        success: false,
        error: 'This feature requires the compass plan or higher.',
        code: 'PLAN_LIMIT_REACHED',
        details: { feature: 'regulator_crm', requiredPlan: 'compass', upgradeUrl: '/dashboard/billing' },
      },
      { status: 402 },
    );
  }

  try {
    const orgId = await resolveOrgId(userId);
    if (!orgId) return NextResponse.json({ success: true, data: [], meta: { total: 0 } });

    const url = new URL(request.url);
    const regulatorCode = url.searchParams.get('regulator_code')?.toUpperCase() ?? undefined;
    const type = url.searchParams.get('type') ?? undefined;
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200);
    const offset = Number(url.searchParams.get('offset') ?? 0);

    const where = {
      orgId,
      ...(regulatorCode && { regulatorCode }),
      ...(type && INTERACTION_TYPES.includes(type as InteractionType) && { interactionType: type }),
    };

    const [interactions, total] = await withRls({ userId, orgId }, (tx) =>
      Promise.all([
        tx.regulatorInteraction.findMany({
          where,
          orderBy: { occurredAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        tx.regulatorInteraction.count({ where }),
      ]),
    );

    return NextResponse.json({
      success: true,
      data: interactions.map(serializeInteraction),
      meta: { total, limit, offset },
    });
  } catch (err) {
    console.error('[api/regulators/interactions/get]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch interactions.', code: 'FETCH_ERROR' },
      { status: 500 },
    );
  }
}

// ── POST /api/regulators/interactions ────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  const hasCrm = await checkCrmAccess(userId);
  if (!hasCrm) {
    return NextResponse.json(
      {
        success: false,
        error: 'This feature requires the compass plan or higher.',
        code: 'PLAN_LIMIT_REACHED',
        details: { feature: 'regulator_crm', requiredPlan: 'compass', upgradeUrl: '/dashboard/billing' },
      },
      { status: 402 },
    );
  }

  try {
    const body = (await request.json()) as CreateInteractionBody;

    // Input validation
    if (!body.regulatorCode || !body.interactionType || !body.subject) {
      return NextResponse.json(
        { success: false, error: 'regulatorCode, interactionType, and subject are required.', code: 'VALIDATION_ERROR' },
        { status: 422 },
      );
    }
    if (!INTERACTION_TYPES.includes(body.interactionType as InteractionType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid interaction type.', code: 'VALIDATION_ERROR' },
        { status: 422 },
      );
    }
    if (body.followUpRequired && !body.followUpDate) {
      return NextResponse.json(
        { success: false, error: 'Follow-up date is required when follow-up is enabled.', code: 'FOLLOW_UP_DATE_REQUIRED' },
        { status: 422 },
      );
    }

    const orgId = await resolveOrgId(userId);
    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'Organisation not found.', code: 'ORG_NOT_FOUND' },
        { status: 404 },
      );
    }

    const interaction = await withRls({ userId, orgId }, (tx) =>
      tx.regulatorInteraction.create({
        data: {
          orgId,
          regulatorCode: body.regulatorCode.toUpperCase(),
          interactionType: body.interactionType,
          subject: body.subject.slice(0, 200),
          outcome: body.outcome ?? null,
          followUpRequired: body.followUpRequired ?? false,
          followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
          isComplete: false,
          createdBy: userId,
          occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
        },
      }),
    );

    return NextResponse.json({ success: true, data: serializeInteraction(interaction) }, { status: 201 });
  } catch (err) {
    console.error('[api/regulators/interactions/post]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to create interaction.', code: 'CREATE_ERROR' },
      { status: 500 },
    );
  }
}

// ── Serialisation ─────────────────────────────────────────────────────────────

function serializeInteraction(i: {
  id: string;
  orgId: string;
  regulatorCode: string;
  interactionType: string;
  subject: string;
  outcome: string | null;
  followUpRequired: boolean;
  followUpDate: Date | null;
  isComplete: boolean;
  createdBy: string | null;
  occurredAt: Date;
  createdAt: Date;
}) {
  return {
    id: i.id,
    orgId: i.orgId,
    regulatorCode: i.regulatorCode,
    interactionType: i.interactionType,
    subject: i.subject,
    outcome: i.outcome,
    followUpRequired: i.followUpRequired,
    followUpDate: i.followUpDate?.toISOString().slice(0, 10) ?? null,
    isComplete: i.isComplete,
    createdBy: i.createdBy,
    occurredAt: i.occurredAt.toISOString(),
    createdAt: i.createdAt.toISOString(),
  };
}
