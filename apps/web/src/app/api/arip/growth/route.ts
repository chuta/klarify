import { NextResponse } from 'next/server';
import { prisma, resolveOrgId, withRls } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';

const AIP_MAX_CUSTOMERS = 50;

/**
 * POST /api/arip/growth
 *
 * Records an AIP growth event (customer onboarding or AUM update).
 * Checks against AIP restrictions (Section 29, ARIP Framework):
 *   - Max 50 customers total during AIP period
 *
 * Returns warnings when approaching or breaching the cap.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  let body: { deltaCustomers?: number; deltaAumNgn?: number; description?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.', code: 'INVALID_BODY' },
      { status: 400 },
    );
  }

  const deltaCustomers = body.deltaCustomers ?? 0;
  const deltaAumNgn = body.deltaAumNgn ?? 0;

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
      if (!app) return { error: 'No ARIP application found.', code: 'NOT_FOUND' };

      const newCustomers = app.aipTotalCustomers + deltaCustomers;
      const newAumNgn = app.aipTotalAumNgn + BigInt(Math.round(deltaAumNgn * 100)); // store in kobo

      const customerCapBreached = newCustomers >= AIP_MAX_CUSTOMERS;
      const approachingCap = !customerCapBreached && newCustomers >= AIP_MAX_CUSTOMERS * 0.9;

      const warnings: string[] = [];
      if (customerCapBreached) {
        warnings.push(`Customer cap reached: ${newCustomers}/${AIP_MAX_CUSTOMERS}. Pause all customer acquisition immediately (Section 29d, ARIP Framework).`);
      } else if (approachingCap) {
        warnings.push(`Approaching customer cap: ${newCustomers}/${AIP_MAX_CUSTOMERS}. Review acquisition activities.`);
      }

      // Log the growth event
      await tx.$executeRaw`
        INSERT INTO arip_growth_log (arip_id, org_id, event_type, delta_customers, delta_aum_ngn, description)
        VALUES (
          ${app.id}::uuid,
          ${orgId}::uuid,
          ${customerCapBreached ? 'restriction_breach' : 'customer_onboarded'},
          ${deltaCustomers},
          ${deltaAumNgn},
          ${body.description ?? null}
        )
      `;

      const updated = await tx.aripApplication.update({
        where: { id: app.id },
        data: {
          aipTotalCustomers: newCustomers,
          aipTotalAumNgn: newAumNgn,
        },
      });

      return {
        data: {
          newTotal: newCustomers,
          cap: AIP_MAX_CUSTOMERS,
          utilPct: AIP_MAX_CUSTOMERS > 0 ? Math.round((newCustomers / AIP_MAX_CUSTOMERS) * 100) : 0,
          customerCapBreached,
          withinLimits: !customerCapBreached,
          warnings,
          id: updated.id,
        },
      };
    });

    if ('error' in result) {
      return NextResponse.json({ success: false, error: result.error, code: result.code }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (err) {
    console.error('[arip/growth] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to record growth event.', code: 'GROWTH_EVENT_ERROR' },
      { status: 500 },
    );
  }
}
