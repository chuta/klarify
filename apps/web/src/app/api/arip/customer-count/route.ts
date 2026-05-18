import { NextResponse } from 'next/server';
import { type Prisma } from '@prisma/client';
import { prisma, resolveOrgId, withRls } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';

interface AripNotes {
  [key: string]: unknown;
  arip_entry_customer_count?: number;
  current_customer_count?: number;
  growth_cap_breached?: boolean;
}

export async function PUT(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  try {
    const { current_customer_count } = (await request.json()) as { current_customer_count: number };

    const orgId = await resolveOrgId(userId);
    if (orgId === null) {
      return NextResponse.json(
        { success: false, error: 'Organisation not found.', code: 'ORG_NOT_FOUND' },
        { status: 404 },
      );
    }

    const result = await withRls({ userId, orgId }, async (tx) => {
      const existing = await tx.aripApplication.findFirst({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
      });
      if (!existing) return null;

      const prevNotes = (existing.notes as AripNotes) ?? {};
      const entry = prevNotes.arip_entry_customer_count ?? current_customer_count;
      const growthPct = entry > 0 ? ((current_customer_count - entry) / entry) * 100 : 0;

      const newNotes: AripNotes = {
        ...prevNotes,
        current_customer_count,
        growth_cap_breached: growthPct >= 10,
      };

      return tx.aripApplication.update({
        where: { id: existing.id },
        data: { notes: newNotes as unknown as Prisma.InputJsonObject },
      });
    });

    if (result === null) {
      return NextResponse.json(
        { success: false, error: 'No ARIP record found.', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error('[arip/customer-count] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to update customer count.', code: 'CUSTOMER_COUNT_ERROR' },
      { status: 500 },
    );
  }
}
