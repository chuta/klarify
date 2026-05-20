// =============================================================================
// POST /api/ai/classify — Product Classification engine (CLAUDE.md §6 + §9).
//
// The user describes their digital asset product in plain English. Klarify
// classifies it under the Nigerian/African regulatory taxonomy (DAX, DAOP,
// DAC, DAI, PAYMENT, HYBRID) and returns:
//
//   * Primary + secondary categories
//   * Primary + secondary regulators
//   * Required licences (with regulator + urgency + link)
//   * Consequence of operating unlicensed
//   * Plain-language reasoning
//   * Citations to specific regulations
//
// Why Opus and not Sonnet:
//   * This is the highest-stakes reasoning task in the product. A wrong
//     classification (e.g. DAX → DAI) routes the founder to the wrong
//     regulator and can cost them months. Worth the extra latency + cost.
//   * temperature=0 — deterministic, compliance-grade output.
//
// Persistence:
//   * Every successful classification → product_classifications row (audit
//     trail, CLAUDE.md §11.7 / §17).
//   * user_profiles.product_types updated (used by chat RAG jurisdiction
//     scoping + roadmap personalisation).
//   * user_profiles.last_classified_at set (used by dashboard nudge banner).
// =============================================================================
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import {
  getAnthropicClient,
  KLARIFY_BASE_SYSTEM_PROMPT,
  KLARIFY_CLASSIFY_PROMPT,
  getKlarifyModel,
} from '@klarify/ai';
import { retrieveRelevantChunks } from '@klarify/ai/rag';
import { assembleContext } from '@klarify/ai/rag';
import type { JurisdictionCode } from '@klarify/ai/rag';
import { prisma } from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';
import { rateLimitAI, type RateLimitVars } from '../../middleware/rateLimitAI.js';

export const classifyRoutes = new Hono<{ Variables: RateLimitVars }>();

// ----- Request validation -----
const ClassifyRequestSchema = z.object({
  description: z
    .string()
    .min(50, 'Please provide at least 50 characters of product description.')
    .max(4000, 'Descriptions are capped at 4000 characters.'),
  features: z.array(z.string().min(1).max(120)).max(20).optional(),
  businessModel: z.string().min(1).max(500).optional(),
  targetUsers: z.string().min(1).max(500).optional(),
});

// ----- Result schema (validates Claude's JSON output) -----
const RequiredLicenceSchema = z.object({
  name: z.string(),
  regulator: z.string(),
  url: z.string().url().nullable().optional(),
  urgency: z.enum(['CRITICAL', 'HIGH', 'MEDIUM']),
});

const CitationSchema = z.object({
  regulation: z.string(),
  section: z.string(),
  relevance: z.string().optional(),
});

const ClassificationResultSchema = z.object({
  primary_category: z.enum(['DAX', 'DAOP', 'DAC', 'DAI', 'PAYMENT', 'HYBRID']),
  secondary_categories: z.array(z.string()).default([]),
  primary_regulator: z.enum(['SEC_NIGERIA', 'CBN', 'BOTH']),
  secondary_regulators: z.array(z.string()).default([]),
  required_licences: z.array(RequiredLicenceSchema).default([]),
  risk_if_unlicensed: z.enum(['CRITICAL', 'HIGH', 'MEDIUM']),
  dual_licence_required: z.boolean().default(false),
  reasoning: z.string().min(1),
  citations: z.array(CitationSchema).default([]),
});

export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

interface UserContext {
  orgId: string;
  productTypes: string[];
  targetMarkets: string[];
  stage: string | null;
}

async function loadUserContext(userId: string): Promise<UserContext | null> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_user_id', $1, true)`,
      userId,
    );
    const profile = await tx.userProfile.findUnique({ where: { userId } });
    const membership = await tx.orgMember.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (!membership) return null;
    return {
      orgId: membership.orgId,
      productTypes: profile?.productTypes ?? [],
      targetMarkets: profile?.targetMarkets ?? [],
      stage: profile?.stage ?? null,
    };
  });
}

/**
 * Strip code fences and locate the first JSON object in Claude's reply.
 *
 * Even with `system` instructing JSON-only output, Claude occasionally wraps
 * the JSON in ```json … ``` fences. We accept both formats so a single stray
 * fence doesn't break the parse.
 */
function extractJsonObject(raw: string): unknown {
  let text = raw.trim();
  // Strip ```json … ``` or ``` … ``` fences if present.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced && fenced[1]) text = fenced[1].trim();

  // If still not pure JSON, find first `{` and last `}` and slice.
  if (!text.startsWith('{')) {
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first >= 0 && last > first) text = text.slice(first, last + 1);
  }
  return JSON.parse(text);
}

classifyRoutes.post(
  '/classify',
  requireAuth,
  rateLimitAI,
  zValidator('json', ClassifyRequestSchema),
  async (c) => {
    const userId = c.get('userId');
    const body = c.req.valid('json');

    const ctx = await loadUserContext(userId);
    if (!ctx) {
      return c.json(
        {
          success: false as const,
          error:
            'No organisation found for this user. Complete onboarding first.',
          code: 'NO_ORG',
        },
        409,
      );
    }

    // ----- Retrieve relevant corpus chunks (VASP categorisation focus) -----
    const retrievalQuery =
      'VASP classification DAX DAOP DAC DAI securities payment digital asset definition ' +
      body.description.slice(0, 600);

    const jurisdictions = (ctx.targetMarkets.length > 0
      ? ctx.targetMarkets
      : ['NG']) as JurisdictionCode[];

    const chunks = await retrieveRelevantChunks(retrievalQuery, {
      topK: 10,
      jurisdictions,
      minSimilarity: 0.45,
    });

    const ragContext = assembleContext(chunks, {
      productTypes: ctx.productTypes,
      targetMarkets: ctx.targetMarkets,
      stage: ctx.stage,
      readinessScore: null,
    });

    // ----- Build prompt -----
    const systemBlocks: string[] = [
      KLARIFY_BASE_SYSTEM_PROMPT,
      KLARIFY_CLASSIFY_PROMPT,
      'OUTPUT FORMAT — respond with ONE valid JSON object only. No prose. ' +
        'No code fences. Match this exact shape:\n' +
        '{\n' +
        '  "primary_category": "DAX|DAOP|DAC|DAI|PAYMENT|HYBRID",\n' +
        '  "secondary_categories": [string],\n' +
        '  "primary_regulator": "SEC_NIGERIA|CBN|BOTH",\n' +
        '  "secondary_regulators": [string],\n' +
        '  "required_licences": [{\n' +
        '    "name": string,\n' +
        '    "regulator": string,\n' +
        '    "url": string|null,\n' +
        '    "urgency": "CRITICAL|HIGH|MEDIUM"\n' +
        '  }],\n' +
        '  "risk_if_unlicensed": "CRITICAL|HIGH|MEDIUM",\n' +
        '  "dual_licence_required": boolean,\n' +
        '  "reasoning": string (plain language, 2–4 sentences),\n' +
        '  "citations": [{ "regulation": string, "section": string, "relevance": string }]\n' +
        '}',
    ];

    if (ragContext.text) {
      systemBlocks.push(
        `--- RELEVANT REGULATORY CONTEXT ---\n${ragContext.text}\n--- END CONTEXT ---`,
      );
    }

    const userBlocks: string[] = [
      `Product description:\n${body.description}`,
    ];
    if (body.features && body.features.length > 0) {
      userBlocks.push(`Key features:\n- ${body.features.join('\n- ')}`);
    }
    if (body.businessModel) {
      userBlocks.push(`Business model:\n${body.businessModel}`);
    }
    if (body.targetUsers) {
      userBlocks.push(`Target users:\n${body.targetUsers}`);
    }

    const model = getKlarifyModel('architect'); // Opus for highest-stakes reasoning
    const anthropic = getAnthropicClient();

    let claudeRaw: string;
    let inputTokens = 0;
    let outputTokens = 0;
    try {
      const completion = await anthropic.messages.create({
        model,
        max_tokens: 2000,
        temperature: 0,
        system: systemBlocks.join('\n\n'),
        messages: [{ role: 'user', content: userBlocks.join('\n\n') }],
      });
      claudeRaw = completion.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as { type: 'text'; text: string }).text)
        .join('');
      inputTokens = completion.usage?.input_tokens ?? 0;
      outputTokens = completion.usage?.output_tokens ?? 0;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[ai/classify] anthropic error:', msg);
      return c.json(
        {
          success: false as const,
          error:
            'Klarify ran into a problem while classifying your product. Please try again.',
          code: 'CLASSIFICATION_ERROR',
        },
        503,
      );
    }

    let parsed: unknown;
    try {
      parsed = extractJsonObject(claudeRaw);
    } catch (err) {
      console.error('[ai/classify] JSON parse failed:', err, 'raw=', claudeRaw);
      return c.json(
        {
          success: false as const,
          error:
            'Could not interpret the classification result. Please rephrase your description and try again.',
          code: 'CLASSIFICATION_INVALID',
        },
        502,
      );
    }

    const validation = ClassificationResultSchema.safeParse(parsed);
    if (!validation.success) {
      console.error(
        '[ai/classify] result shape invalid:',
        validation.error.flatten(),
      );
      return c.json(
        {
          success: false as const,
          error:
            'Classification produced an invalid result. Please try again with a clearer product description.',
          code: 'CLASSIFICATION_INVALID',
          details: validation.error.flatten(),
        },
        502,
      );
    }

    const result = validation.data;

    // ----- Persist + update profile -----
    const persistedId = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await tx.$executeRawUnsafe(
          `SELECT set_config('app.current_user_id', $1, true)`,
          userId,
        );
        await tx.$executeRawUnsafe(
          `SELECT set_config('app.current_org_id', $1, true)`,
          ctx.orgId,
        );

        const row = await tx.productClassification.create({
          data: {
            orgId: ctx.orgId,
            userId,
            description: body.description,
            result: result as unknown as Prisma.JsonObject,
            primaryCategory: result.primary_category,
            riskLevel: result.risk_if_unlicensed,
            modelUsed: model,
          },
        });

        // Project the classification into user_profiles. We replace
        // productTypes wholesale: the latest classification is the most
        // accurate source of truth.
        const productTypes = Array.from(
          new Set([result.primary_category, ...result.secondary_categories]),
        );
        await tx.userProfile.update({
          where: { userId },
          data: {
            productTypes,
            lastClassifiedAt: new Date(),
          },
        });

        return row.id;
      },
    );

    return c.json({
      success: true as const,
      data: {
        id: persistedId,
        result,
        meta: {
          model,
          chunksUsed: ragContext.chunksUsed,
          contextTokens: ragContext.tokenCount,
          tokensUsed: inputTokens + outputTokens,
        },
      },
    });
  },
);
