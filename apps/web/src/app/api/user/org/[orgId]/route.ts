import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { updateOrgSchema } from '@klarify/core';
import { prisma } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';

export async function PUT(
  request: Request,
  { params }: { params: { orgId: string } },
): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = updateOrgSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.', code: 'VALIDATION_ERROR' },
      { status: 422 },
    );
  }

  const orgId = params.orgId;

  try {
    const membership = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.current_user_id', $1, true)`,
        auth.userId,
      );
      return tx.orgMember.findUnique({
        where: { orgId_userId: { orgId, userId: auth.userId } },
        select: { role: true },
      });
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Organisation not found.', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }
    if (membership.role !== 'owner') {
      return NextResponse.json(
        {
          success: false,
          error: 'Only the organisation owner can rename it.',
          code: 'FORBIDDEN',
        },
        { status: 403 },
      );
    }

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.current_user_id', $1, true)`,
        auth.userId,
      );
      return tx.organisation.update({
        where: { id: orgId },
        data: { name: parsed.data.name },
        select: { id: true, name: true },
      });
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('[user/org PUT] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to update organisation.', code: 'ORG_UPDATE_ERROR' },
      { status: 500 },
    );
  }
}
