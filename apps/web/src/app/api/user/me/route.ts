import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { updateProfileSchema } from '@klarify/core';
import { prisma } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  try {
    const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_id', $1, true)`, userId);
      return tx.user.findUnique({
        where: { id: userId },
        include: {
          memberships: {
            include: { org: { select: { id: true, name: true, plan: true } } },
          },
        },
      });
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User profile not found.', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar },
        memberships: user.memberships.map((m) => ({
          orgId: m.org.id,
          orgName: m.org.name,
          role: m.role,
          plan: m.org.plan,
        })),
      },
    });
  } catch (err) {
    console.error('[user/me GET] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user.', code: 'USER_FETCH_ERROR' },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  const rawBody: unknown = await request.json();
  const parsed = updateProfileSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.', code: 'VALIDATION_ERROR' },
      { status: 422 },
    );
  }
  const body = parsed.data;

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.avatar !== undefined ? { avatar: body.avatar } : {}),
      },
    });
    return NextResponse.json({
      success: true,
      data: { id: updated.id, email: updated.email, name: updated.name, avatar: updated.avatar },
    });
  } catch (err) {
    console.error('[user/me PUT] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile.', code: 'PROFILE_UPDATE_ERROR' },
      { status: 500 },
    );
  }
}
