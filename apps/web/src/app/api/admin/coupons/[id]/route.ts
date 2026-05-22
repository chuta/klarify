import { NextResponse } from 'next/server';
import { updateCouponSchema } from '@klarify/core';
import { prisma } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';
import { isPlatformAdmin } from '@/lib/platformAdmin';

function forbidden(): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Admin access required.', code: 'FORBIDDEN' },
    { status: 403 },
  );
}

interface RouteParams {
  params: { id: string };
}

export async function PUT(request: Request, { params }: RouteParams): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  if (!isPlatformAdmin(auth.email)) return forbidden();

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.', code: 'VALIDATION_ERROR' },
      { status: 422 },
    );
  }

  const parsed = updateCouponSchema.safeParse(rawBody);
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? 'Invalid request body.';
    return NextResponse.json(
      { success: false, error: first, code: 'VALIDATION_ERROR' },
      { status: 422 },
    );
  }

  const body = parsed.data;
  const existing = await prisma.coupon.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: 'Coupon not found.', code: 'NOT_FOUND' },
      { status: 404 },
    );
  }

  const updated = await prisma.coupon.update({
    where: { id: params.id },
    data: {
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.maxRedemptions !== undefined ? { maxRedemptions: body.maxRedemptions } : {}),
      ...(body.validUntil !== undefined
        ? { validUntil: body.validUntil ? new Date(body.validUntil) : null }
        : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: updated.id,
      code: updated.code,
      isActive: updated.isActive,
      maxRedemptions: updated.maxRedemptions,
      validUntil: updated.validUntil?.toISOString() ?? null,
      redemptionCount: updated.redemptionCount,
    },
  });
}
