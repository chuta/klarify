import { NextResponse } from 'next/server';
import { prisma, resolveOrgId, withRls } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';

/**
 * PUT /api/arip/fee-payment
 *
 * Records the ARIP processing fee payment details.
 *
 * Regulatory source: SEC Digital Asset Rules 2024, Section VIII, Rule 20(a).
 * Flat non-refundable fee of NGN 2,000,000. Pay via REVOP after Stage 2 eligibility.
 */
export async function PUT(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  let body: { amountNgn: number; paidDate?: string; secReferenceNumber?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.', code: 'INVALID_BODY' },
      { status: 400 },
    );
  }

  if (!body.amountNgn || body.amountNgn <= 0) {
    return NextResponse.json(
      { success: false, error: 'Payment amount is required.', code: 'VALIDATION_ERROR' },
      { status: 400 },
    );
  }

  try {
    const orgId = await resolveOrgId(userId);
    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'Organisation not found.', code: 'ORG_NOT_FOUND' },
        { status: 404 },
      );
    }

    const result = await withRls({ userId, orgId }, async (tx) => {
      const app = await tx.aripApplication.findFirst({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
      });
      if (!app) return null;

      return tx.aripApplication.update({
        where: { id: app.id },
        data: {
          applicationFeePaid: true,
          applicationFeeAmountNgn: Math.round(body.amountNgn),
          applicationFeePaidDate: body.paidDate ? new Date(body.paidDate) : new Date(),
          ...(body.secReferenceNumber && { secReferenceNumber: body.secReferenceNumber }),
        },
      });
    });

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'No ARIP application found.', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: { id: result.id, applicationFeePaid: result.applicationFeePaid } });
  } catch (err) {
    console.error('[arip/fee-payment] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to record fee payment.', code: 'FEE_PAYMENT_ERROR' },
      { status: 500 },
    );
  }
}
