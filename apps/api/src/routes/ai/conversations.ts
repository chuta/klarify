// =============================================================================
// FounderCounsel — conversation CRUD (CLAUDE.md §9).
//
// GET    /api/ai/conversations           → cursor-paginated list (sidebar)
// GET    /api/ai/conversations/:id       → full thread (chat view + reload)
// DELETE /api/ai/conversations/:id       → soft delete via deleted_at
//
// Hard delete is intentionally not supported: the user's regulatory questions
// and our cited answers are part of the audit trail Klarify provides — soft
// delete preserves it for compliance review while hiding from the UI.
// =============================================================================
import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { Prisma } from '@prisma/client';
import { prisma } from '../../db.js';
import { requireAuth, type AuthVars } from '../../middleware/auth.js';

export const conversationRoutes = new Hono<{ Variables: AuthVars }>();

const PAGE_SIZE = 20;

const ListQuerySchema = z.object({
  /** opaque cursor — the updatedAt timestamp of the last item from the previous page (ISO string). */
  cursor: z.string().datetime().optional(),
  /** Override page size for power users. Capped server-side at 50. */
  limit: z.coerce.number().int().positive().max(50).optional(),
});

const IdParamSchema = z.object({
  id: z.string().uuid(),
});

/**
 * GET /api/ai/conversations — paginated list for the sidebar.
 *
 * Cursor pagination on updatedAt DESC. The cursor is just the ISO timestamp
 * of the last row on the previous page; safer than offset for active datasets
 * where new conversations are constantly bumping the order.
 */
conversationRoutes.get(
  '/',
  requireAuth,
  zValidator('query', ListQuerySchema),
  async (c) => {
    const userId = c.get('userId');
    const { cursor, limit } = c.req.valid('query');
    const take = limit ?? PAGE_SIZE;

    const where: Prisma.ConversationWhereInput = {
      userId,
      deletedAt: null,
    };
    if (cursor) {
      where.updatedAt = { lt: new Date(cursor) };
    }

    const items = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await tx.$executeRawUnsafe(
          `SELECT set_config('app.current_user_id', $1, true)`,
          userId,
        );
        return tx.conversation.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          take: take + 1, // sentinel for hasMore
          select: {
            id: true,
            title: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { messages: true } },
          },
        });
      },
    );

    const hasMore = items.length > take;
    const trimmed = hasMore ? items.slice(0, take) : items;
    const nextCursor = hasMore
      ? trimmed[trimmed.length - 1]?.updatedAt.toISOString() ?? null
      : null;

    return c.json({
      success: true as const,
      data: trimmed.map((row) => ({
        id: row.id,
        title: row.title ?? 'Untitled conversation',
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        messageCount: row._count.messages,
      })),
      meta: { hasMore, nextCursor, limit: take },
    });
  },
);

/**
 * GET /api/ai/conversations/:id — full thread for chat view + reload.
 *
 * Returns every message (chronological) including citations + model used.
 * 404 if the conversation doesn't exist or belongs to another user / has
 * been soft-deleted.
 */
conversationRoutes.get(
  '/:id',
  requireAuth,
  zValidator('param', IdParamSchema),
  async (c) => {
    const userId = c.get('userId');
    const { id } = c.req.valid('param');

    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await tx.$executeRawUnsafe(
          `SELECT set_config('app.current_user_id', $1, true)`,
          userId,
        );
        return tx.conversation.findFirst({
          where: { id, userId, deletedAt: null },
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              select: {
                id: true,
                role: true,
                content: true,
                citations: true,
                modelUsed: true,
                createdAt: true,
              },
            },
          },
        });
      },
    );

    if (!result) {
      return c.json(
        {
          success: false as const,
          error: 'Conversation not found.',
          code: 'NOT_FOUND',
        },
        404,
      );
    }

    return c.json({
      success: true as const,
      data: {
        id: result.id,
        title: result.title ?? 'Untitled conversation',
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
        messages: result.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          citations: m.citations,
          modelUsed: m.modelUsed,
          createdAt: m.createdAt.toISOString(),
        })),
      },
    });
  },
);

/**
 * DELETE /api/ai/conversations/:id — soft delete.
 *
 * Idempotent: deleting an already-deleted conversation also returns 204.
 * Cross-user requests get 404 (not 403) to avoid leaking conversation IDs.
 */
conversationRoutes.delete(
  '/:id',
  requireAuth,
  zValidator('param', IdParamSchema),
  async (c) => {
    const userId = c.get('userId');
    const { id } = c.req.valid('param');

    const updated = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await tx.$executeRawUnsafe(
          `SELECT set_config('app.current_user_id', $1, true)`,
          userId,
        );
        return tx.conversation.updateMany({
          where: { id, userId },
          data: { deletedAt: new Date() },
        });
      },
    );

    if (updated.count === 0) {
      return c.json(
        {
          success: false as const,
          error: 'Conversation not found.',
          code: 'NOT_FOUND',
        },
        404,
      );
    }

    // 204 No Content — Hono helper.
    return c.body(null, 204);
  },
);
