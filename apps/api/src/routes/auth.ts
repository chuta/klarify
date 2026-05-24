// POST /api/auth/sync — called immediately after every Supabase auth event.
//
// Responsibility: ensure the authenticated Supabase user exists in our custom
// `users` table (FK anchor for organisations, profiles, scores, etc.).
// This is the bridge between Supabase auth.users and our Prisma schema.
//
// Called from: /auth/callback (magic link), sign-in with password, sign-up.
import { Hono } from 'hono';
import { sendWelcomeEmail } from '@klarify/email';
import { prisma } from '../db.js';
import { requireAuth, type AuthVars } from '../middleware/auth.js';

export const authRoutes = new Hono<{ Variables: AuthVars }>();

interface SyncBody {
  name?: string;
  avatar?: string;
}

// ========================================================================== //
// POST /api/auth/sync                                                         //
// ========================================================================== //
authRoutes.post('/sync', requireAuth, async (c) => {
  const userId = c.get('userId');
  const email  = c.get('email');

  let name: string | undefined;
  let avatar: string | undefined;
  try {
    const body = await c.req.json<SyncBody>();
    name   = body.name   ?? undefined;
    avatar = body.avatar ?? undefined;
  } catch {
    // Body is optional — magic-link users may not send it.
  }

  try {
    // Detect "first time we've seen this user" so we can send the welcome
    // email exactly once. We can't rely on upsert's return alone — Prisma
    // returns the row whether it was created or updated. Look up first.
    const existing = await prisma.user.findUnique({
      where:  { id: userId },
      select: { id: true },
    });
    const isNewUser = existing === null;

    // Upsert: create the user row if it doesn't exist yet; otherwise only
    // update mutable fields (email may change, name only if explicitly passed).
    const user = await prisma.user.upsert({
      where: { id: userId },
      create: {
        id:     userId,
        email,
        name:   name   ?? null,
        avatar: avatar ?? null,
      },
      update: {
        email,
        ...(name   !== undefined && { name }),
        ...(avatar !== undefined && { avatar }),
      },
    });

    // Welcome email on first user creation — await so serverless runtimes
    // (Netlify) do not terminate before Resend accepts the message.
    if (isNewUser) {
      const emailResult = await sendWelcomeEmail({
        to: user.email,
        name: user.name ?? user.email,
        idempotencyKey: `welcome/${user.id}`,
      });
      if (!emailResult.success) {
        console.error('[auth/sync] welcome email failed', {
          userId: user.id,
          to: user.email,
          error: emailResult.error,
        });
      } else {
        console.info('[auth/sync] welcome email sent', {
          userId: user.id,
          resendId: emailResult.id,
        });
      }
    }

    // Check if user has completed onboarding (has a profile row).
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { userId: true, stage: true },
    });

    return c.json({
      success: true as const,
      data: {
        userId:     user.id,
        email:      user.email,
        name:       user.name,
        hasProfile: profile !== null,
        redirect:   profile !== null ? '/dashboard' : '/dashboard/onboarding',
      },
    });
  } catch (err) {
    console.error('[auth/sync] error', err);
    return c.json(
      {
        success: false as const,
        error:  'Failed to sync user account.',
        code:   'SYNC_ERROR',
      },
      500,
    );
  }
});
