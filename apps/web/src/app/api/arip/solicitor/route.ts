import { NextResponse } from 'next/server';
import { prisma, resolveOrgId, withRls } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';

/**
 * PUT /api/arip/solicitor
 *
 * Records the engaged solicitor details and marks solicitor_engaged = true.
 *
 * Regulatory source: Section 16, ARIP Framework, SEC Nigeria, June 2024.
 * A qualified Nigerian solicitor or adviser must file the ARIP application.
 */
export async function PUT(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  let body: { name: string; firm: string; engagedDate?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.', code: 'INVALID_BODY' },
      { status: 400 },
    );
  }

  const { name, firm, engagedDate } = body;
  if (!name?.trim() || !firm?.trim()) {
    return NextResponse.json(
      { success: false, error: 'Solicitor name and firm are required.', code: 'VALIDATION_ERROR' },
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
          solicitorEngaged: true,
          solicitorName: name.trim(),
          solicitorFirm: firm.trim(),
          solicitorEngagedDate: engagedDate ? new Date(engagedDate) : new Date(),
        },
      });
    });

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'No ARIP application found.', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error('[arip/solicitor] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to update solicitor details.', code: 'SOLICITOR_UPDATE_ERROR' },
      { status: 500 },
    );
  }
}
