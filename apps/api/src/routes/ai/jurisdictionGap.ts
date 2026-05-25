// =============================================================================
// POST /api/ai/jurisdiction-gap — Jurisdiction Expansion Adviser (US-004)
// =============================================================================
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { Prisma } from '@prisma/client';
import {
  getAnthropicClient,
  KLARIFY_BASE_SYSTEM_PROMPT,
  KLARIFY_JURISDICTION_PROMPT,
  getKlarifyModel,
} from '@klarify/ai';
import { retrieveRelevantChunks, assembleContext } from '@klarify/ai/rag';
import type { JurisdictionCode } from '@klarify/ai/rag';
import { classifyAnthropicError } from '@klarify/ai/chat';
import {
  JurisdictionGapRequestSchema,
  coerceJurisdictionGapResult,
  JURISDICTION_GAP_DIMENSIONS,
  getRegulatorContactsForJurisdictions,
  type JurisdictionGapResult,
  type JurisdictionCode as CoreJurisdictionCode,
} from '@klarify/core';
import { prisma, withRls } from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';
import {
  checkJurisdictionExpansionAccess,
  requireFeature,
  resolveOrgPlan,
} from '../../middleware/featureGate.js';
import { rateLimitAI, type RateLimitVars } from '../../middleware/rateLimitAI.js';
import { extractJsonObject } from '../../utils/extractJson.js';
import { exportJurisdictionGapDocx } from '../../services/jurisdictionGapExport.js';

export const jurisdictionGapRoutes = new Hono<{ Variables: RateLimitVars }>();

interface UserContext {
  orgId: string;
  orgName: string;
  productTypes: string[];
  targetMarkets: string[];
  stage: string | null;
  readinessScore: number | null;
  indicatorSnapshot: Record<string, unknown> | null;
}

async function loadUserContext(userId: string): Promise<UserContext | null> {
  const membership = await prisma.orgMember.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: { org: { select: { id: true, name: true } } },
  });
  if (!membership) return null;

  const [profile, scoreRecord] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.readinessScore.findFirst({
      where: { orgId: membership.orgId },
      orderBy: { calculatedAt: 'desc' },
    }),
  ]);

  return {
    orgId: membership.orgId,
    orgName: membership.org.name,
    productTypes: profile?.productTypes ?? [],
    targetMarkets: profile?.targetMarkets ?? [],
    stage: profile?.stage ?? null,
    readinessScore: scoreRecord?.totalScore ?? null,
    indicatorSnapshot:
      scoreRecord?.snapshot && typeof scoreRecord.snapshot === 'object'
        ? (scoreRecord.snapshot as Record<string, unknown>)
        : null,
  };
}

function mergeRegulatorContacts(
  result: JurisdictionGapResult,
  targets: readonly CoreJurisdictionCode[],
): JurisdictionGapResult {
  const seeded = getRegulatorContactsForJurisdictions(targets);
  const byJurisdiction = new Map(
    [...result.regulator_contacts, ...seeded].map((c) => [c.jurisdiction, c]),
  );
  return {
    ...result,
    regulator_contacts: [...byJurisdiction.values()],
  };
}

function validateDimensionCoverage(
  result: JurisdictionGapResult,
  targets: readonly CoreJurisdictionCode[],
): boolean {
  for (const target of targets) {
    for (const dimension of JURISDICTION_GAP_DIMENSIONS) {
      const found = result.dimensions.some(
        (row) => row.jurisdiction === target && row.dimension === dimension,
      );
      if (!found) return false;
    }
  }
  return true;
}

jurisdictionGapRoutes.post(
  '/',
  requireAuth,
  rateLimitAI,
  zValidator('json', JurisdictionGapRequestSchema),
  async (c) => {
    const userId = c.get('userId');
    const body = c.req.valid('json');

    const plan = await resolveOrgPlan(userId);
    const access = checkJurisdictionExpansionAccess(
      plan,
      body.sourceJurisdiction,
      body.targetJurisdictions,
    );
    if (!access.allowed) {
      return c.json(
        {
          success: false as const,
          error: access.error,
          code: 'PLAN_LIMIT_REACHED',
          details: {
            currentPlan: plan,
            requiredPlan: access.requiredPlan,
            upgradeUrl: '/dashboard/billing',
          },
        },
        402,
      );
    }

    const ctx = await loadUserContext(userId);
    if (!ctx) {
      return c.json(
        {
          success: false as const,
          error: 'No organisation found. Complete onboarding first.',
          code: 'NO_ORG',
        },
        409,
      );
    }

    const retrievalQuery =
      'licensing capital AML KYC reporting VASP registration requirements cross-border expansion';

    const jurisdictions = Array.from(
      new Set([body.sourceJurisdiction, ...body.targetJurisdictions, 'FATF']),
    ) as JurisdictionCode[];

    const chunks = await retrieveRelevantChunks(retrievalQuery, {
      topK: 12,
      jurisdictions,
      minSimilarity: 0.75,
    });

    const ragContext = assembleContext(chunks, {
      productTypes: ctx.productTypes,
      targetMarkets: ctx.targetMarkets,
      stage: ctx.stage,
      readinessScore: ctx.readinessScore,
    });

    const postureBlock = ctx.indicatorSnapshot
      ? `Current compliance indicator snapshot (JSON):\n${JSON.stringify(ctx.indicatorSnapshot, null, 2)}`
      : 'No detailed indicator snapshot available — infer from readiness score and profile.';

    const systemBlocks = [
      KLARIFY_BASE_SYSTEM_PROMPT,
      KLARIFY_JURISDICTION_PROMPT,
      postureBlock,
    ];
    if (ragContext.text) {
      systemBlocks.push(
        `--- RELEVANT REGULATORY CONTEXT ---\n${ragContext.text}\n--- END CONTEXT ---`,
      );
    }

    const userMessage = [
      `Organisation: ${ctx.orgName}`,
      `Source jurisdiction: ${body.sourceJurisdiction}`,
      `Target jurisdictions: ${body.targetJurisdictions.join(', ')}`,
      `Product types: ${ctx.productTypes.join(', ') || 'not specified'}`,
      `Target markets on profile: ${ctx.targetMarkets.join(', ') || 'NG'}`,
      `Stage: ${ctx.stage ?? 'not specified'}`,
      `Readiness score: ${ctx.readinessScore ?? 'unknown'}/100`,
      'Produce the full gap analysis JSON for these targets.',
    ].join('\n');

    const model = getKlarifyModel('architect');
    const anthropic = getAnthropicClient();

    let claudeRaw: string;
    let tokensUsed = 0;
    try {
      const completion = await anthropic.messages.create({
        model,
        max_tokens: 4000,
        temperature: 0,
        system: systemBlocks.join('\n\n'),
        messages: [{ role: 'user', content: userMessage }],
      });
      claudeRaw = completion.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as { type: 'text'; text: string }).text)
        .join('');
      tokensUsed =
        (completion.usage?.input_tokens ?? 0) + (completion.usage?.output_tokens ?? 0);
    } catch (err) {
      const classified = classifyAnthropicError(err);
      return c.json(
        {
          success: false as const,
          error: classified.message,
          code: classified.category,
        },
        classified.httpStatus,
      );
    }

    let parsed: unknown;
    try {
      parsed = extractJsonObject(claudeRaw);
    } catch {
      return c.json(
        {
          success: false as const,
          error:
            'Could not interpret the jurisdiction gap analysis. Please try again.',
          code: 'JURISDICTION_GAP_INVALID',
        },
        503,
      );
    }

    let result: JurisdictionGapResult;
    try {
      result = coerceJurisdictionGapResult(parsed);
      result = mergeRegulatorContacts(result, body.targetJurisdictions);
      if (!validateDimensionCoverage(result, body.targetJurisdictions)) {
        throw new Error('Incomplete dimension coverage for one or more targets.');
      }
    } catch (err) {
      console.error('[ai/jurisdiction-gap] validation failed:', err);
      return c.json(
        {
          success: false as const,
          error:
            'Jurisdiction analysis produced an incomplete result. Please try again.',
          code: 'JURISDICTION_GAP_INVALID',
        },
        503,
      );
    }

    const analysisId = await withRls({ userId, orgId: ctx.orgId }, async (tx) => {
      const row = await tx.jurisdictionGapAnalysis.create({
        data: {
          orgId: ctx.orgId,
          userId,
          sourceJurisdiction: body.sourceJurisdiction,
          targetJurisdictions: body.targetJurisdictions,
          result: result as unknown as Prisma.JsonObject,
          modelUsed: model,
          tokensUsed,
        },
      });
      return row.id;
    });

    return c.json({
      success: true as const,
      data: {
        analysisId,
        result,
        meta: {
          model,
          chunksUsed: ragContext.chunksUsed,
          contextTokens: ragContext.tokenCount,
          tokensUsed,
        },
      },
    });
  },
);

jurisdictionGapRoutes.get('/history', requireAuth, async (c) => {
  const userId = c.get('userId');
  const ctx = await loadUserContext(userId);
  if (!ctx) {
    return c.json({ success: true as const, data: [] });
  }

  const rows = await withRls({ userId, orgId: ctx.orgId }, (tx) =>
    tx.jurisdictionGapAnalysis.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        sourceJurisdiction: true,
        targetJurisdictions: true,
        createdAt: true,
        result: true,
      },
    }),
  );

  return c.json({
    success: true as const,
    data: rows.map((row) => {
      const result = row.result as unknown as JurisdictionGapResult;
      const green = result.dimensions.filter((d) => d.status === 'green').length;
      const amber = result.dimensions.filter((d) => d.status === 'amber').length;
      const red = result.dimensions.filter((d) => d.status === 'red').length;
      return {
        id: row.id,
        sourceJurisdiction: row.sourceJurisdiction,
        targetJurisdictions: row.targetJurisdictions,
        createdAt: row.createdAt.toISOString(),
        summary: { green, amber, red },
      };
    }),
  });
});

jurisdictionGapRoutes.post('/:id/export', requireAuth, requireFeature('scenario_simulator'), async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  try {
    const exported = await exportJurisdictionGapDocx(id, userId);
    return c.json({
      success: true as const,
      data: exported,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed.';
    return c.json(
      {
        success: false as const,
        error: message,
        code: 'EXPORT_FAILED',
      },
      message.includes('not found') ? 404 : 500,
    );
  }
});

jurisdictionGapRoutes.get('/:id', requireAuth, async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const ctx = await loadUserContext(userId);
  if (!ctx) {
    return c.json(
      { success: false as const, error: 'Not found.', code: 'NOT_FOUND' },
      404,
    );
  }

  const plan = await resolveOrgPlan(userId);
  const row = await withRls({ userId, orgId: ctx.orgId }, (tx) =>
    tx.jurisdictionGapAnalysis.findFirst({
      where: { id, orgId: ctx.orgId },
    }),
  );

  if (!row) {
    return c.json(
      {
        success: false as const,
        error: 'Jurisdiction gap analysis not found.',
        code: 'NOT_FOUND',
      },
      404,
    );
  }

  return c.json({
    success: true as const,
    data: {
      id: row.id,
      sourceJurisdiction: row.sourceJurisdiction,
      targetJurisdictions: row.targetJurisdictions,
      result: row.result as unknown as JurisdictionGapResult,
      createdAt: row.createdAt.toISOString(),
      plan,
    },
  });
});
