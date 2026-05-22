// Regulator CRM routes — CLAUDE.md §9, Sprint 5-C1.
//
// Public endpoints (no auth required):
//   GET  /api/regulators           — all 7 pre-seeded Nigerian regulators
//   GET  /api/regulators/:code     — single regulator profile
//
// Authenticated + Compass-gated endpoints (requireFeature('regulator_crm')):
//   POST /api/regulators/interactions          — create interaction log
//   GET  /api/regulators/interactions          — list org's interactions
//   PUT  /api/regulators/interactions/:id      — update / mark complete
//   GET  /api/regulators/interactions/export   — CSV download
//
// IMPORTANT: The literal-prefix routes (/interactions, /interactions/export)
// MUST be registered before the wildcard /:code route so Hono doesn't
// absorb "interactions" as a code parameter.

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../db.js';
import { requireAuth, type AuthVars } from '../middleware/auth.js';
import { requireFeature } from '../middleware/featureGate.js';
import type { CreateInteractionBody, UpdateInteractionBody } from '@klarify/core';

export const regulatorRoutes = new Hono<{ Variables: AuthVars }>();

// ── Helper: resolve the user's first org ─────────────────────────────────────
async function resolveOrgId(userId: string): Promise<string | null> {
  const membership = await prisma.orgMember.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { orgId: true },
  });
  return membership?.orgId ?? null;
}

// ── Validation schemas ────────────────────────────────────────────────────────

const INTERACTION_TYPES = ['call', 'email', 'meeting', 'submission', 'letter'] as const;

const createInteractionSchema = z.object({
  regulatorCode: z.string().min(1).max(50).toUpperCase(),
  interactionType: z.enum(INTERACTION_TYPES),
  subject: z.string().min(1).max(200),
  outcome: z.string().max(2000).optional(),
  followUpRequired: z.boolean().optional().default(false),
  followUpDate: z.string().nullable().optional(),
  occurredAt: z.string().optional(),
});

const updateInteractionSchema = z.object({
  outcome: z.string().max(2000).optional(),
  followUpRequired: z.boolean().optional(),
  followUpDate: z.string().nullable().optional(),
  isComplete: z.boolean().optional(),
  occurredAt: z.string().optional(),
});

// ============================================================================ //
// POST /api/regulators/interactions — create interaction                        //
// Requires auth + Compass plan.                                                 //
// ============================================================================ //
regulatorRoutes.post(
  '/interactions',
  requireAuth,
  requireFeature('regulator_crm'),
  zValidator('json', createInteractionSchema),
  async (c) => {
    const userId = c.get('userId');
    const body = c.req.valid('json') as CreateInteractionBody;

    try {
      const orgId = await resolveOrgId(userId);
      if (!orgId) {
        return c.json(
          { success: false as const, error: 'Organisation not found.', code: 'ORG_NOT_FOUND' },
          404,
        );
      }

      // Validate follow-up date is present when required.
      if (body.followUpRequired && !body.followUpDate) {
        return c.json(
          {
            success: false as const,
            error: 'Follow-up date is required when follow-up is enabled.',
            code: 'FOLLOW_UP_DATE_REQUIRED',
          },
          422,
        );
      }

      // Verify the regulator code exists.
      const regulator = await prisma.regulator.findUnique({ where: { code: body.regulatorCode } });
      if (!regulator) {
        return c.json(
          { success: false as const, error: 'Regulator code not found.', code: 'REGULATOR_NOT_FOUND' },
          404,
        );
      }

      const interaction = await prisma.regulatorInteraction.create({
        data: {
          orgId,
          regulatorCode: body.regulatorCode,
          interactionType: body.interactionType,
          subject: body.subject,
          outcome: body.outcome ?? null,
          followUpRequired: body.followUpRequired ?? false,
          followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
          isComplete: false,
          createdBy: userId,
          occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
        },
      });

      return c.json({ success: true as const, data: serializeInteraction(interaction) }, 201);
    } catch (err) {
      console.error('[regulators/interactions/post] error', err);
      return c.json(
        { success: false as const, error: 'Failed to create interaction.', code: 'INTERACTION_CREATE_ERROR' },
        500,
      );
    }
  },
);

// ============================================================================ //
// GET /api/regulators/interactions — list org's interactions                    //
// Optional query: ?regulator_code=SEC_NIGERIA&type=call&limit=50&offset=0      //
// ============================================================================ //
regulatorRoutes.get(
  '/interactions',
  requireAuth,
  requireFeature('regulator_crm'),
  async (c) => {
    const userId = c.get('userId');
    const regulatorCode = c.req.query('regulator_code')?.toUpperCase() ?? undefined;
    const type = c.req.query('type') ?? undefined;
    const limit = Math.min(Number(c.req.query('limit') ?? 50), 200);
    const offset = Number(c.req.query('offset') ?? 0);

    try {
      const orgId = await resolveOrgId(userId);
      if (!orgId) {
        return c.json({ success: true as const, data: [], meta: { total: 0 } });
      }

      const where = {
        orgId,
        ...(regulatorCode && { regulatorCode }),
        ...(type && INTERACTION_TYPES.includes(type as (typeof INTERACTION_TYPES)[number]) && {
          interactionType: type,
        }),
      };

      const [interactions, total] = await Promise.all([
        prisma.regulatorInteraction.findMany({
          where,
          orderBy: { occurredAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.regulatorInteraction.count({ where }),
      ]);

      return c.json({
        success: true as const,
        data: interactions.map(serializeInteraction),
        meta: { total, limit, offset },
      });
    } catch (err) {
      console.error('[regulators/interactions/get] error', err);
      return c.json(
        { success: false as const, error: 'Failed to fetch interactions.', code: 'INTERACTIONS_FETCH_ERROR' },
        500,
      );
    }
  },
);

// ============================================================================ //
// GET /api/regulators/interactions/export — CSV download                        //
// Requires Compass+.                                                            //
// ============================================================================ //
regulatorRoutes.get(
  '/interactions/export',
  requireAuth,
  requireFeature('regulator_crm'),
  async (c) => {
    const userId = c.get('userId');

    try {
      const orgId = await resolveOrgId(userId);
      if (!orgId) {
        return new Response('No interactions found.', { status: 404 });
      }

      const interactions = await prisma.regulatorInteraction.findMany({
        where: { orgId },
        orderBy: { occurredAt: 'desc' },
        take: 5000,
      });

      const rows = [
        ['Date', 'Regulator', 'Type', 'Subject', 'Outcome', 'Follow-up Required', 'Follow-up Date', 'Completed'],
        ...interactions.map((i) => [
          i.occurredAt.toISOString().slice(0, 10),
          i.regulatorCode,
          i.interactionType,
          csvEscape(i.subject),
          csvEscape(i.outcome ?? ''),
          i.followUpRequired ? 'Yes' : 'No',
          i.followUpDate ? new Date(i.followUpDate).toISOString().slice(0, 10) : '',
          i.isComplete ? 'Yes' : 'No',
        ]),
      ];

      const csv = rows.map((r) => r.join(',')).join('\n');

      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="klarify-regulator-interactions.csv"',
        },
      });
    } catch (err) {
      console.error('[regulators/interactions/export] error', err);
      return c.json(
        { success: false as const, error: 'Failed to export interactions.', code: 'EXPORT_ERROR' },
        500,
      );
    }
  },
);

// ============================================================================ //
// PUT /api/regulators/interactions/:id — update (mark complete, add outcome)    //
// ============================================================================ //
regulatorRoutes.put(
  '/interactions/:id',
  requireAuth,
  zValidator('json', updateInteractionSchema),
  async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id');
    const body = c.req.valid('json') as UpdateInteractionBody;

    try {
      const orgId = await resolveOrgId(userId);
      if (!orgId) {
        return c.json(
          { success: false as const, error: 'Organisation not found.', code: 'ORG_NOT_FOUND' },
          404,
        );
      }

      // Verify the interaction belongs to this org (RLS enforcement).
      const existing = await prisma.regulatorInteraction.findFirst({
        where: { id, orgId },
      });
      if (!existing) {
        return c.json(
          { success: false as const, error: 'Interaction not found.', code: 'NOT_FOUND' },
          404,
        );
      }

      const updated = await prisma.regulatorInteraction.update({
        where: { id },
        data: {
          ...(body.outcome !== undefined && { outcome: body.outcome }),
          ...(body.followUpRequired !== undefined && { followUpRequired: body.followUpRequired }),
          ...(body.followUpDate !== undefined && {
            followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
          }),
          ...(body.isComplete !== undefined && { isComplete: body.isComplete }),
          ...(body.occurredAt !== undefined && { occurredAt: new Date(body.occurredAt) }),
        },
      });

      return c.json({ success: true as const, data: serializeInteraction(updated) });
    } catch (err) {
      console.error('[regulators/interactions/put] error', err);
      return c.json(
        { success: false as const, error: 'Failed to update interaction.', code: 'INTERACTION_UPDATE_ERROR' },
        500,
      );
    }
  },
);

// ============================================================================ //
// GET /api/regulators — all regulators (no auth needed — public reference data) //
// ============================================================================ //
regulatorRoutes.get('/', async (c) => {
  try {
    const regulators = await prisma.regulator.findMany({
      orderBy: { code: 'asc' },
    });
    return c.json({ success: true as const, data: regulators });
  } catch (err) {
    console.error('[regulators/get-all] error', err);
    return c.json(
      { success: false as const, error: 'Failed to fetch regulators.', code: 'REGULATORS_FETCH_ERROR' },
      500,
    );
  }
});

// ============================================================================ //
// GET /api/regulators/:code — single regulator profile                          //
// Must be registered AFTER /interactions/* routes.                              //
// ============================================================================ //
regulatorRoutes.get('/:code', async (c) => {
  const code = c.req.param('code').toUpperCase();
  try {
    const regulator = await prisma.regulator.findUnique({
      where: { code },
    });
    if (!regulator) {
      return c.json(
        { success: false as const, error: 'Regulator not found.', code: 'NOT_FOUND' },
        404,
      );
    }
    return c.json({ success: true as const, data: regulator });
  } catch (err) {
    console.error('[regulators/get-one] error', err);
    return c.json(
      { success: false as const, error: 'Failed to fetch regulator.', code: 'REGULATOR_FETCH_ERROR' },
      500,
    );
  }
});

// ── Serialisation helper ──────────────────────────────────────────────────────

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

/** Escape a CSV cell value: wrap in quotes if it contains comma/newline/quote. */
function csvEscape(val: string): string {
  if (/[",\n\r]/.test(val)) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
