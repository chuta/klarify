import { NextResponse } from 'next/server';
import { resolveOrgId } from '@/lib/db';
import {
  defaultSubscriptionStatus,
  getSubscriptionStatusForOrg,
} from '@/lib/billingStatus';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';

/**
 * GET /api/billing/status
 *
 * Same-origin billing status for SSR and client refresh. Subscribe/cancel
 * still go to the Fly Hono API; only status reads live here on Netlify.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();

  try {
    const orgId = await resolveOrgId(auth.userId);
    if (!orgId) {
      return NextResponse.json({
        success: true,
        data: defaultSubscriptionStatus(),
      });
    }

    const data = await getSubscriptionStatusForOrg(orgId);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[billing/status] error', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load billing status.',
        code: 'STATUS_ERROR',
      },
      { status: 500 },
    );
  }
}
