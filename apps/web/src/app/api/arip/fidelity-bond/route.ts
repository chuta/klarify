import { NextResponse } from 'next/server';
import { prisma, resolveOrgId, withRls } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';

/**
 * PUT /api/arip/fidelity-bond
 *
 * Records the fidelity bond details and marks fidelity_bond_in_place = true.
 *
 * Regulatory source: ARIP Framework, SEC Nigeria, June 2024.
 * Minimum coverage: 25% of required shareholder fund, from a NAICOM-approved insurer.
 */
export async function PUT(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  let body: { amountNgn?: number; expiry?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.', code: 'INVALID_BODY' },
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
          fidelityBondInPlace: true,
          ...(body.amountNgn !== undefined && {
            // Store amount in kobo (NGN × 100)
            fidelityBondAmountNgn: BigInt(Math.round(body.amountNgn * 100)),
          }),
          ...(body.expiry && { fidelityBondExpiry: new Date(body.expiry) }),
        },
      });
    });

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'No ARIP application found.', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: { id: result.id, fidelityBondInPlace: result.fidelityBondInPlace } });
  } catch (err) {
    console.error('[arip/fidelity-bond] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to update fidelity bond details.', code: 'FIDELITY_BOND_UPDATE_ERROR' },
      { status: 500 },
    );
  }
}
