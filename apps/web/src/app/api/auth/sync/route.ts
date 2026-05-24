import { NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@klarify/email';
import { prisma } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';
import { resolveUserSetupState } from '@/lib/teamService';

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId, email } = auth;

  let name: string | undefined;
  let avatar: string | undefined;
  try {
    const body = (await request.json()) as { name?: string; avatar?: string };
    name = body.name;
    avatar = body.avatar;
  } catch {
    // Body is optional — magic-link users may not send it.
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    const isNewUser = existing === null;

    const user = await prisma.user.upsert({
      where: { id: userId },
      create: { id: userId, email, name: name ?? null, avatar: avatar ?? null },
      update: {
        email,
        ...(name !== undefined && { name }),
        ...(avatar !== undefined && { avatar }),
      },
    });

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

    const setup = await resolveUserSetupState(userId, email);

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        name: user.name,
        hasProfile: setup.hasProfile,
        setupKind: setup.kind,
        redirect: setup.redirect,
        membership: setup.membership,
        pendingInvite: setup.pendingInvite,
      },
    });
  } catch (err) {
    console.error('[auth/sync] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to sync user account.', code: 'SYNC_ERROR' },
      { status: 500 },
    );
  }
}
