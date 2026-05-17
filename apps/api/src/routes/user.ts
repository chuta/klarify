import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { ApiSuccess, UserMeResponse } from '@klarify/core';
import { updateProfileSchema } from '@klarify/core';
import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { requireAuth, type AuthVars } from '../middleware/auth.js';

export const userRoutes = new Hono<{ Variables: AuthVars }>();

/**
 * CLAUDE.md §9: GET /api/user/profile — Klarify identity + org memberships.
 * Implemented at /api/user/me for the more conventional name; alias added in index.ts.
 *
 * Runs inside a transaction with the RLS GUC set so this respects the same
 * row-level security as every other org-scoped query (§16 Rule 3).
 */
userRoutes.get('/me', requireAuth, async (c) => {
  const userId = c.get('userId');

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_user_id', $1, true)`,
      userId,
    );

    const user = await tx.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: { org: { select: { id: true, name: true, plan: true } } },
        },
      },
    });

    return user;
  });

  if (!result) {
    return c.json(
      { success: false, error: 'User profile not found.', code: 'NOT_FOUND' } as const,
      404,
    );
  }

  const body: ApiSuccess<UserMeResponse> = {
    success: true,
    data: {
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
        avatar: result.avatar,
      },
      memberships: result.memberships.map((m) => ({
        orgId: m.org.id,
        orgName: m.org.name,
        role: m.role as 'owner' | 'admin' | 'member' | 'viewer',
        plan: m.org.plan,
      })),
    },
  };
  return c.json(body);
});

/**
 * PUT /api/user/me — update name and/or avatar.
 * Body validated against updateProfileSchema from @klarify/core.
 */
userRoutes.put('/me', requireAuth, zValidator('json', updateProfileSchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.avatar !== undefined ? { avatar: body.avatar } : {}),
      },
    });

    return c.json({
      success: true as const,
      data: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        avatar: updated.avatar,
      },
    });
  } catch (err) {
    console.error('[user/me PUT] error', err);
    return c.json(
      { success: false as const, error: 'Failed to update profile.', code: 'PROFILE_UPDATE_ERROR' },
      500,
    );
  }
});
