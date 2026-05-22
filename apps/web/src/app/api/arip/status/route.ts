import { NextResponse } from 'next/server';
import { prisma, resolveOrgId, withRls } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';

const AIP_MAX_CUSTOMERS = 50;

/**
 * GET /api/arip/status
 *
 * Returns AIP operational status with caps, utilisation, and warnings.
 * Only meaningful when current_stage = 'aip'.
 *
 * Regulatory source: Section 29, ARIP Framework, SEC Nigeria, June 2024.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  try {
    const orgId = await resolveOrgId(userId);
    if (!orgId) return NextResponse.json({ success: true, data: null });

    const app = await withRls({ userId, orgId }, (tx) =>
      tx.aripApplication.findFirst({ where: { orgId }, orderBy: { createdAt: 'desc' } }),
    );
    if (!app) return NextResponse.json({ success: true, data: null });

    let daysRemaining: number | null = null;
    let isExpired = false;
    let isUrgent = false;

    if (app.aipExpiryDate) {
      const ms = new Date(app.aipExpiryDate).getTime() - Date.now();
      daysRemaining = Math.ceil(ms / (1000 * 60 * 60 * 24));
      isExpired = daysRemaining < 0;
      isUrgent = !isExpired && daysRemaining <= 10;
    }

    const customerUtil =
      AIP_MAX_CUSTOMERS > 0
        ? Math.round((app.aipTotalCustomers / AIP_MAX_CUSTOMERS) * 100)
        : 0;

    const warnings: string[] = [];
    if (isExpired) warnings.push('AIP has expired. Contact SEC Nigeria immediately.');
    else if (isUrgent) warnings.push(`AIP expires in ${daysRemaining} days. Consider requesting an extension.`);
    if (app.aipTotalCustomers >= AIP_MAX_CUSTOMERS) {
      warnings.push('Customer cap reached. Pause all acquisition immediately (Section 29d).');
    } else if (customerUtil >= 90) {
      warnings.push(`Approaching customer cap: ${app.aipTotalCustomers}/${AIP_MAX_CUSTOMERS}.`);
    }

    return NextResponse.json({
      success: true,
      data: {
        currentStage: app.currentStage,
        // AIP caps
        totalCustomers: app.aipTotalCustomers,
        maxCustomers: app.aipMaxCustomers,
        customerUtilPct: customerUtil,
        customerCapBreached: app.aipTotalCustomers >= AIP_MAX_CUSTOMERS,
        // AIP expiry
        aipIssuedDate: app.aipIssuedDate?.toISOString().slice(0, 10) ?? null,
        aipExpiryDate: app.aipExpiryDate?.toISOString().slice(0, 10) ?? null,
        daysRemaining,
        isExpired,
        isUrgent,
        // Per-transaction caps (regulatory, not tracked in DB — display only)
        maxSingleTxnNgn: 2_000_000,
        maxCustomerAumNgn: 5_000_000,
        warnings,
      },
    });
  } catch (err) {
    console.error('[arip/status] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch AIP status.', code: 'AIP_STATUS_ERROR' },
      { status: 500 },
    );
  }
}
