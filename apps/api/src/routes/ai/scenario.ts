// =============================================================================
// POST /api/ai/scenario — Scenario Simulator (US-005, Sprint 6)
// =============================================================================
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { Prisma } from '@prisma/client';
import {
  getAnthropicClient,
  KLARIFY_BASE_SYSTEM_PROMPT,
  KLARIFY_SCENARIO_PROMPT,
  getKlarifyModel,
} from '@klarify/ai';
import { retrieveRelevantChunks, assembleContext } from '@klarify/ai/rag';
import type { JurisdictionCode } from '@klarify/ai/rag';
import { classifyAnthropicError } from '@klarify/ai/chat';
import {
  ScenarioRequestSchema,
  coerceScenarioResult,
  getScenarioTemplate,
  type ScenarioResult,
} from '@klarify/core';
import { prisma, withRls } from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireScenarioSimulator } from '../../middleware/featureGate.js';
import { rateLimitAI, type RateLimitVars } from '../../middleware/rateLimitAI.js';
import { extractJsonObject } from '../../utils/extractJson.js';

export const scenarioRoutes = new Hono<{ Variables: RateLimitVars }>();

interface UserContext {
  orgId: string;
  productTypes: string[];
  targetMarkets: string[];
  stage: string | null;
  readinessScore: number | null;
}

async function loadUserContext(userId: string): Promise<UserContext | null> {
  const membership = await prisma.orgMember.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { orgId: true },
  });
  if (!membership) return null;

  const [profile, scoreRecord] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.readinessScore.findFirst({
      where: { orgId: membership.orgId },
      orderBy: { calculatedAt: 'desc' },
      select: { totalScore: true },
    }),
  ]);

  return {
    orgId: membership.orgId,
    productTypes: profile?.productTypes ?? [],
    targetMarkets: profile?.targetMarkets ?? [],
    stage: profile?.stage ?? null,
    readinessScore: scoreRecord?.totalScore ?? null,
  };
}

scenarioRoutes.post(
  '/',
  requireAuth,
  requireScenarioSimulator,
  rateLimitAI,
  zValidator('json', ScenarioRequestSchema),
  async (c) => {
    const userId = c.get('userId');
    const body = c.req.valid('json');

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

    let parentContext: { scenarioText: string; result: ScenarioResult } | null = null;
    if (body.parentAnalysisId) {
      parentContext = await withRls({ userId, orgId: ctx.orgId }, async (tx) => {
        const row = await tx.scenarioAnalysis.findFirst({
          where: { id: body.parentAnalysisId, orgId: ctx.orgId },
        });
        if (!row) return null;
        return {
          scenarioText: row.scenarioText,
          result: row.result as unknown as ScenarioResult,
        };
      });
      if (!parentContext) {
        return c.json(
          {
            success: false as const,
            error: 'Previous scenario analysis not found.',
            code: 'NOT_FOUND',
          },
          404,
        );
      }
    }

    const retrievalQuery =
      `${body.scenario.slice(0, 800)} regulatory consequences enforcement licence ARIP SEC CBN NFIU`;

    const jurisdictions = Array.from(
      new Set([
        ...(ctx.targetMarkets.length > 0 ? ctx.targetMarkets : ['NG']),
        'NG',
        'FATF',
      ]),
    ) as JurisdictionCode[];

    const chunks = await retrieveRelevantChunks(retrievalQuery, {
      topK: 10,
      jurisdictions,
      minSimilarity: 0.75,
    });

    const ragContext = assembleContext(chunks, {
      productTypes: ctx.productTypes,
      targetMarkets: ctx.targetMarkets,
      stage: ctx.stage,
      readinessScore: ctx.readinessScore,
    });

    const template = body.templateId ? getScenarioTemplate(body.templateId) : undefined;

    const systemBlocks = [
      KLARIFY_BASE_SYSTEM_PROMPT,
      KLARIFY_SCENARIO_PROMPT,
    ];
    if (ragContext.text) {
      systemBlocks.push(
        `--- RELEVANT REGULATORY CONTEXT ---\n${ragContext.text}\n--- END CONTEXT ---`,
      );
    }

    const userBlocks = [`Scenario to analyse:\n${body.scenario}`];
    if (template) {
      userBlocks.push(`Template context: ${template.title}`);
    }
    if (parentContext) {
      userBlocks.push(
        '--- PRIOR ANALYSIS (iteration — compare explicitly) ---',
        `Prior scenario:\n${parentContext.scenarioText}`,
        `Prior summary:\n${parentContext.result.scenario_summary}`,
        `Prior likely case:\n${parentContext.result.outcomes.likely_case.summary}`,
        '--- END PRIOR ANALYSIS ---',
        'Treat the new scenario as a "what if" variation of the prior analysis.',
      );
    }

    const model = getKlarifyModel('architect');
    const anthropic = getAnthropicClient();

    let claudeRaw: string;
    let tokensUsed = 0;
    try {
      const completion = await anthropic.messages.create({
        model,
        max_tokens: 3000,
        temperature: 0,
        system: systemBlocks.join('\n\n'),
        messages: [{ role: 'user', content: userBlocks.join('\n\n') }],
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
            'Could not interpret the scenario analysis. Please try again with a clearer description.',
          code: 'SCENARIO_INVALID',
        },
        503,
      );
    }

    let result: ScenarioResult;
    try {
      result = coerceScenarioResult(parsed);
    } catch (err) {
      console.error('[ai/scenario] validation failed:', err);
      return c.json(
        {
          success: false as const,
          error:
            'Scenario analysis produced an invalid result. Please try again.',
          code: 'SCENARIO_INVALID',
        },
        503,
      );
    }

    const analysisId = await withRls({ userId, orgId: ctx.orgId }, async (tx) => {
      const row = await tx.scenarioAnalysis.create({
        data: {
          orgId: ctx.orgId,
          userId,
          scenarioText: body.scenario,
          templateId: body.templateId ?? null,
          parentId: body.parentAnalysisId ?? null,
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

scenarioRoutes.get('/history', requireAuth, requireScenarioSimulator, async (c) => {
  const userId = c.get('userId');
  const ctx = await loadUserContext(userId);
  if (!ctx) {
    return c.json({ success: true as const, data: [] });
  }

  const rows = await withRls({ userId, orgId: ctx.orgId }, (tx) =>
    tx.scenarioAnalysis.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        templateId: true,
        createdAt: true,
        result: true,
      },
    }),
  );

  return c.json({
    success: true as const,
    data: rows.map((row) => {
      const result = row.result as unknown as ScenarioResult;
      return {
        id: row.id,
        scenarioSummary: result.scenario_summary,
        templateId: row.templateId,
        createdAt: row.createdAt.toISOString(),
      };
    }),
  });
});

scenarioRoutes.get('/:id', requireAuth, requireScenarioSimulator, async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const ctx = await loadUserContext(userId);
  if (!ctx) {
    return c.json(
      { success: false as const, error: 'Not found.', code: 'NOT_FOUND' },
      404,
    );
  }

  const row = await withRls({ userId, orgId: ctx.orgId }, (tx) =>
    tx.scenarioAnalysis.findFirst({
      where: { id, orgId: ctx.orgId },
    }),
  );

  if (!row) {
    return c.json(
      { success: false as const, error: 'Scenario analysis not found.', code: 'NOT_FOUND' },
      404,
    );
  }

  let parent: { id: string; scenarioSummary: string } | null = null;
  if (row.parentId) {
    const parentRow = await withRls({ userId, orgId: ctx.orgId }, (tx) =>
      tx.scenarioAnalysis.findFirst({
        where: { id: row.parentId!, orgId: ctx.orgId },
        select: { id: true, result: true },
      }),
    );
    if (parentRow) {
      const parentResult = parentRow.result as unknown as ScenarioResult;
      parent = { id: parentRow.id, scenarioSummary: parentResult.scenario_summary };
    }
  }

  return c.json({
    success: true as const,
    data: {
      id: row.id,
      scenarioText: row.scenarioText,
      templateId: row.templateId,
      parentId: row.parentId,
      parent,
      result: row.result as unknown as ScenarioResult,
      createdAt: row.createdAt.toISOString(),
    },
  });
});
