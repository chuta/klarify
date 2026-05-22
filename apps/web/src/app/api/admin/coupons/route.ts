import { NextResponse } from 'next/server';
import { createCouponSchema } from '@klarify/core';
import { prisma } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';
import { isPlatformAdmin } from '@/lib/platformAdmin';
import { normalizeCouponCode } from '@/lib/coupons';

function forbidden(): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Admin access required.', code: 'FORBIDDEN' },
    { status: 403 },
  );
}

function serializeCoupon(coupon: {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: { toString(): string };
  applicablePlans: string[];
  billingCycles: string[];
  maxRedemptions: number | null;
  redemptionCount: number;
  maxPerOrg: number;
  validFrom: Date;
  validUntil: Date | null;
  isActive: boolean;
  createdAt: Date;
}): Record<string, unknown> {
  return {
    id: coupon.id,
    code: coupon.code,
    description: coupon.description,
    discountType: coupon.discountType,
    discountValue: Number(coupon.discountValue),
    applicablePlans: coupon.applicablePlans,
    billingCycles: coupon.billingCycles,
    maxRedemptions: coupon.maxRedemptions,
    redemptionCount: coupon.redemptionCount,
    maxPerOrg: coupon.maxPerOrg,
    validFrom: coupon.validFrom.toISOString(),
    validUntil: coupon.validUntil?.toISOString() ?? null,
    isActive: coupon.isActive,
    createdAt: coupon.createdAt.toISOString(),
  };
}

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  if (!isPlatformAdmin(auth.email)) return forbidden();

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return NextResponse.json({
    success: true,
    data: coupons.map(serializeCoupon),
  });
}

export async function POST(request: Request): Promise<NextResponse> {
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

  const parsed = createCouponSchema.safeParse(rawBody);
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? 'Invalid request body.';
    return NextResponse.json(
      { success: false, error: first, code: 'VALIDATION_ERROR' },
      { status: 422 },
    );
  }

  const body = parsed.data;
  const code = normalizeCouponCode(body.code);

  const existing = await prisma.coupon.findFirst({
    where: { code: { equals: code, mode: 'insensitive' } },
  });
  if (existing) {
    return NextResponse.json(
      { success: false, error: 'A coupon with this code already exists.', code: 'DUPLICATE_CODE' },
      { status: 409 },
    );
  }

  const created = await prisma.coupon.create({
    data: {
      code,
      description: body.description ?? null,
      discountType: body.discountType,
      discountValue: body.discountValue,
      applicablePlans: body.applicablePlans,
      billingCycles: body.billingCycles,
      maxRedemptions: body.maxRedemptions ?? null,
      maxPerOrg: body.maxPerOrg,
      validFrom: body.validFrom ? new Date(body.validFrom) : new Date(),
      validUntil: body.validUntil ? new Date(body.validUntil) : null,
      isActive: body.isActive,
      createdBy: auth.userId,
    },
  });

  return NextResponse.json({ success: true, data: serializeCoupon(created) }, { status: 201 });
}
