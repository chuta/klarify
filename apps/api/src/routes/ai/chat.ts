// =============================================================================
// POST /api/ai/chat — FounderCounsel streaming Q&A endpoint (CLAUDE.md §9 + §6).
//
// The single most important AI surface in Klarify. Everything routes through
// here: free-form questions, follow-ups, post-classification clarifications.
//
// Flow:
//   1. requireAuth → identify user
//   2. rateLimitAI → enforce monthly query quota (counter already INCR'd here)
//   3. validate body (Zod)
//   4. load profile + org (Prisma, RLS)
//   5. load or create conversation
//   6. persist user message
//   7. retrieve corpus chunks (pgvector + jurisdiction re-rank)
//   8. assemble context (8K-token budget + user-profile sentence)
//   9. stream Claude response as Server-Sent Events
//  10. on completion: extract citations, persist assistant message, bump
//      conversation.updated_at, generate auto-title if first turn
//
// SSE frame format (matches packages/ai/src/chat/useKlarifyChat.ts):
//   event: chunk
//   data: { "type": "chunk", "content": "..." }
//
//   event: done
//   data: { "type": "done", "conversationId": "...", "messageId": "...",
//           "citations": [...], "queriesUsed": 12, "queriesLimit": 50 }
//
//   event: error
//   data: { "type": "error", "code": "...", "message": "..." }
// =============================================================================
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import {
  getAnthropicClient,
  KLARIFY_BASE_SYSTEM_PROMPT,
  LEGAL_DISCLAIMER,
  getKlarifyModel,
} from '@klarify/ai';
import { retrieveRelevantChunks } from '@klarify/ai/rag';
import { assembleContext } from '@klarify/ai/rag';
import type { JurisdictionCode } from '@klarify/ai/rag';
import { extractCitations, type Citation } from '@klarify/ai/chat';
import { prisma } from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';
import { rateLimitAI, type RateLimitVars } from '../../middleware/rateLimitAI.js';

export const chatRoutes = new Hono<{ Variables: RateLimitVars }>();

// Body schema — minimal so we don't reject valid follow-ups.
const ChatRequestSchema = z.object({
  message: z
    .string()
    .min(1, 'Message must not be empty.')
    .max(2000, 'Messages are limited to 2000 characters.'),
  conversationId: z.string().uuid().nullable().optional(),
  // Allow the caller to override jurisdiction scope (e.g. user is on
  // Compass and wants to ask about Kenya specifically). Defaults to the
  // user's target_markets on their profile.
  jurisdictions: z.array(z.string().min(2).max(8)).optional(),
});

const HISTORY_LIMIT = 10; // last N messages → Claude context

const STREAM_HEADERS = {
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  // Critical for Nginx/Cloudflare proxies — without this they buffer the
  // whole stream and the client sees nothing until completion.
  'X-Accel-Buffering': 'no',
};

interface ProfileForChat {
  productTypes: string[];
  targetMarkets: string[];
  stage: string | null;
  readinessScore: number | null;
  orgId: string;
}

/**
 * Load the user's primary profile + org context. The user might belong to
 * multiple orgs — for chat we pick the one with the latest readiness score
 * (i.e. the workspace they're actively building in).
 */
async function loadProfile(userId: string): Promise<ProfileForChat | null> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_user_id', $1, true)`,
      userId,
    );

    const profile = await tx.userProfile.findUnique({
      where: { userId },
    });

    const membership = await tx.orgMember.findFirst({
      where: { userId },
      include: {
        org: {
          include: {
            readinessScores: {
              orderBy: { calculatedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      // Most-recently-updated org wins as a stand-in for "active" workspace.
      orderBy: { createdAt: 'desc' },
    });

    if (!membership) return null;

    return {
      productTypes: profile?.productTypes ?? [],
      targetMarkets: profile?.targetMarkets ?? [],
      stage: profile?.stage ?? null,
      readinessScore: membership.org.readinessScores[0]?.totalScore ?? null,
      orgId: membership.org.id,
    };
  });
}

interface ConversationContext {
  id: string;
  isNew: boolean;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * Resolve or create the conversation, then fetch the last HISTORY_LIMIT
 * messages so Claude has multi-turn context.
 */
async function loadOrCreateConversation(
  userId: string,
  orgId: string,
  conversationId: string | null | undefined,
): Promise<ConversationContext> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_user_id', $1, true)`,
      userId,
    );
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_org_id', $1, true)`,
      orgId,
    );

    if (conversationId) {
      const existing = await tx.conversation.findFirst({
        where: { id: conversationId, userId, deletedAt: null },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: HISTORY_LIMIT,
          },
        },
      });
      if (existing) {
        // Reverse: we fetched DESC for the limit, but Claude wants oldest-first.
        const ordered = [...existing.messages].reverse();
        const history: Array<{ role: 'user' | 'assistant'; content: string }> =
          ordered.map((m) => ({
            role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
            content: m.content,
          }));
        return {
          id: existing.id,
          isNew: false,
          history,
        };
      }
      // ID supplied but not found (deleted, belongs to other user, etc.) —
      // silently fall through and create a fresh conversation rather than
      // 404. Better UX than failing mid-stream.
    }

    const created = await tx.conversation.create({
      data: {
        userId,
        orgId,
      },
    });
    return { id: created.id, isNew: true, history: [] };
  });
}

/**
 * Save the user message, returning its id. Pulled out of the streaming
 * handler so the streaming path stays read-only on the DB until the very
 * end (where the assistant message lands).
 */
async function saveUserMessage(
  conversationId: string,
  userId: string,
  orgId: string,
  content: string,
): Promise<string> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_user_id', $1, true)`,
      userId,
    );
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_org_id', $1, true)`,
      orgId,
    );
    const msg = await tx.message.create({
      data: {
        conversationId,
        role: 'user',
        content,
      },
    });
    return msg.id;
  });
}

/**
 * Final-step writes after the Claude stream completes successfully:
 *   * Persist the assistant message with extracted citations.
 *   * If this is the conversation's first turn, generate an auto-title from
 *     the user's question (truncated to 60 chars).
 *   * Bump conversation.updated_at so it sorts to the top of the sidebar.
 */
async function finaliseAssistantTurn(args: {
  conversationId: string;
  userId: string;
  orgId: string;
  isNewConversation: boolean;
  firstUserMessage: string;
  assistantContent: string;
  citations: Citation[];
  model: string;
  tokensUsed: number | null;
}): Promise<string> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_user_id', $1, true)`,
      args.userId,
    );
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_org_id', $1, true)`,
      args.orgId,
    );

    const msg = await tx.message.create({
      data: {
        conversationId: args.conversationId,
        role: 'assistant',
        content: args.assistantContent,
        citations: args.citations as unknown as Prisma.JsonArray,
        modelUsed: args.model,
        tokensUsed: args.tokensUsed,
      },
    });

    const updates: Prisma.ConversationUpdateInput = {
      updatedAt: new Date(),
    };
    if (args.isNewConversation) {
      updates.title = autoTitleFromMessage(args.firstUserMessage);
    }
    await tx.conversation.update({
      where: { id: args.conversationId },
      data: updates,
    });

    return msg.id;
  });
}

/**
 * Generate a short, human-friendly conversation title from the user's
 * first message. Truncates at 60 chars on a word boundary so the sidebar
 * label is never cut mid-word.
 */
export function autoTitleFromMessage(message: string): string {
  const cleaned = message.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 60) return cleaned;
  const truncated = cleaned.slice(0, 60);
  const lastSpace = truncated.lastIndexOf(' ');
  // If the last space is way back, just hard-cut (very long words).
  const base = lastSpace > 30 ? truncated.slice(0, lastSpace) : truncated;
  return `${base}…`;
}

chatRoutes.post(
  '/chat',
  requireAuth,
  rateLimitAI,
  zValidator('json', ChatRequestSchema),
  async (c) => {
    const userId = c.get('userId');
    const body = c.req.valid('json');
    const plan = c.get('plan');
    const queriesUsed = c.get('aiQueriesUsed');
    const queriesLimit = c.get('aiQueriesLimit');

    const profile = await loadProfile(userId);
    if (!profile) {
      return c.json(
        {
          success: false as const,
          error: 'No organisation found for this user. Complete onboarding first.',
          code: 'NO_ORG',
        },
        409,
      );
    }

    const conversation = await loadOrCreateConversation(
      userId,
      profile.orgId,
      body.conversationId ?? null,
    );

    await saveUserMessage(conversation.id, userId, profile.orgId, body.message);

    // Open the SSE stream — everything below this runs inside the stream
    // body so errors surface to the client as `event: error` frames rather
    // than dangling sockets.
    return streamSSE(
      c,
      async (stream) => {
        // Re-emit the standard CORS-friendly SSE headers explicitly.
        for (const [k, v] of Object.entries(STREAM_HEADERS)) {
          c.header(k, v);
        }

        try {
          // ----- Retrieve relevant chunks -----
          const requestedJurisdictions =
            body.jurisdictions ??
            (profile.targetMarkets.length > 0
              ? profile.targetMarkets
              : ['NG']);
          const jurisdictions = requestedJurisdictions as JurisdictionCode[];

          const chunks = await retrieveRelevantChunks(body.message, {
            topK: 8,
            jurisdictions,
            minSimilarity: 0.5,
          });

          const context = assembleContext(chunks, {
            productTypes: profile.productTypes,
            targetMarkets: profile.targetMarkets,
            stage: profile.stage,
            readinessScore: profile.readinessScore,
          });

          // ----- Build Claude messages -----
          const systemBlocks: string[] = [KLARIFY_BASE_SYSTEM_PROMPT];
          if (context.text) {
            systemBlocks.push(
              `--- RELEVANT REGULATORY CONTEXT ---\n${context.text}\n--- END CONTEXT ---\n\n` +
                `When citing this material, use the exact format [Regulation, Section] ` +
                `(e.g. "[ISA 2025, Section 357]") so the UI can render clickable badges.`,
            );
          }
          systemBlocks.push(
            `End your response with this sentence on its own line:\n"${LEGAL_DISCLAIMER}"`,
          );

          const claudeMessages = [
            ...conversation.history.map((h) => ({
              role: h.role,
              content: h.content,
            })),
            { role: 'user' as const, content: body.message },
          ];

          const model = getKlarifyModel('advisory');
          const anthropic = getAnthropicClient();

          // ----- Stream from Anthropic -----
          let fullText = '';
          let inputTokens = 0;
          let outputTokens = 0;

          const anthropicStream = anthropic.messages.stream({
            model,
            max_tokens: 2000,
            system: systemBlocks.join('\n\n'),
            messages: claudeMessages,
          });

          for await (const event of anthropicStream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              const piece = event.delta.text;
              fullText += piece;
              await stream.writeSSE({
                event: 'chunk',
                data: JSON.stringify({ type: 'chunk', content: piece }),
              });
            } else if (event.type === 'message_start') {
              // Usage on a streaming response is finalised in `message_delta`,
              // but Anthropic emits input_tokens at message_start. Grab it.
              inputTokens = event.message.usage?.input_tokens ?? 0;
            } else if (event.type === 'message_delta') {
              outputTokens = event.usage?.output_tokens ?? outputTokens;
            }
          }

          // ----- Finalise: extract citations + persist -----
          const citations = extractCitations(fullText);
          const totalTokens = inputTokens + outputTokens;

          const messageId = await finaliseAssistantTurn({
            conversationId: conversation.id,
            userId,
            orgId: profile.orgId,
            isNewConversation: conversation.isNew,
            firstUserMessage: body.message,
            assistantContent: fullText,
            citations,
            model,
            tokensUsed: totalTokens > 0 ? totalTokens : null,
          });

          await stream.writeSSE({
            event: 'done',
            data: JSON.stringify({
              type: 'done',
              conversationId: conversation.id,
              messageId,
              citations,
              queriesUsed,
              queriesLimit: Number.isFinite(queriesLimit) ? queriesLimit : null,
              plan,
              chunksUsed: context.chunksUsed,
            }),
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error('[ai/chat] stream error:', msg);
          await stream.writeSSE({
            event: 'error',
            data: JSON.stringify({
              type: 'error',
              code: 'STREAM_ERROR',
              message:
                'Klarify ran into a problem generating that response. Please try again in a moment.',
            }),
          });
        }
      },
      // onError: Hono invokes this if the SSE writer itself throws. Just log
      // — the client has already received whatever frames we wrote.
      async (err, _stream) => {
        console.error('[ai/chat] SSE writer error:', err);
      },
    );
  },
);
