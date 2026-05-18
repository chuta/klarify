import { NextResponse } from 'next/server';
import { type Prisma } from '@prisma/client';
import { prisma, resolveOrgId, withRls } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';

interface AripNotes {
  [key: string]: unknown;
  stage_status?: string;
  arip_entry_customer_count?: number | null;
  current_customer_count?: number | null;
  growth_cap_breached?: boolean;
  next_filing?: { title: string; due_date: string } | null;
}

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  try {
    const orgId = await resolveOrgId(userId);
    if (orgId === null) return NextResponse.json({ success: true, data: null });

    const record = await withRls({ userId, orgId }, (tx) =>
      tx.aripApplication.findFirst({ where: { orgId }, orderBy: { createdAt: 'desc' } }),
    );
    if (!record) return NextResponse.json({ success: true, data: null });

    const extra = (record.notes as AripNotes) ?? {};
    let aipDaysRemaining: number | null = null;
    if (record.aipExpiryDate) {
      const ms = new Date(record.aipExpiryDate).getTime() - Date.now();
      aipDaysRemaining = Math.ceil(ms / (1000 * 60 * 60 * 24));
    }

    return NextResponse.json({
      success: true,
      data: {
        id: record.id,
        orgId: record.orgId,
        licence_type: record.licenceType,
        current_stage: record.currentStage,
        stage_status: extra.stage_status ?? 'in_progress',
        aip_issued_date: record.aipIssuedDate?.toISOString() ?? null,
        aip_expiry_date: record.aipExpiryDate?.toISOString() ?? null,
        aip_days_remaining: aipDaysRemaining,
        arip_entry_customer_count: extra.arip_entry_customer_count ?? null,
        current_customer_count: extra.current_customer_count ?? null,
        growth_cap_breached: extra.growth_cap_breached ?? false,
        next_filing: extra.next_filing ?? null,
        updated_at: record.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    console.error('[arip/get] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ARIP data.', code: 'ARIP_FETCH_ERROR' },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  try {
    const body = (await request.json()) as {
      licence_type?: string;
      current_stage?: string;
      stage_status?: string;
      aip_issued_date?: string | null;
      aip_expiry_date?: string | null;
      arip_entry_customer_count?: number | null;
      current_customer_count?: number | null;
      growth_cap_breached?: boolean;
      next_filing?: { title: string; due_date: string } | null;
    };

    const orgId = await resolveOrgId(userId);
    if (orgId === null) {
      return NextResponse.json(
        { success: false, error: 'Organisation not found.', code: 'ORG_NOT_FOUND' },
        { status: 404 },
      );
    }

    const updated = await withRls({ userId, orgId }, async (tx) => {
      const existing = await tx.aripApplication.findFirst({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
      });

      const prevNotes = (existing?.notes as AripNotes) ?? {};
      const newNotes: AripNotes = {
        ...prevNotes,
        ...(body.stage_status !== undefined && { stage_status: body.stage_status }),
        ...(body.arip_entry_customer_count !== undefined && { arip_entry_customer_count: body.arip_entry_customer_count }),
        ...(body.current_customer_count !== undefined && { current_customer_count: body.current_customer_count }),
        ...(body.growth_cap_breached !== undefined && { growth_cap_breached: body.growth_cap_breached }),
        ...(body.next_filing !== undefined && { next_filing: body.next_filing }),
      };

      if (!existing) {
        return tx.aripApplication.create({
          data: {
            orgId,
            licenceType: body.licence_type ?? 'unknown',
            currentStage: body.current_stage ?? 'pre_screening',
            aipIssuedDate: body.aip_issued_date ? new Date(body.aip_issued_date) : null,
            aipExpiryDate: body.aip_expiry_date ? new Date(body.aip_expiry_date) : null,
            notes: newNotes as unknown as Prisma.InputJsonObject,
          },
        });
      }

      return tx.aripApplication.update({
        where: { id: existing.id },
        data: {
          ...(body.licence_type !== undefined && { licenceType: body.licence_type }),
          ...(body.current_stage !== undefined && { currentStage: body.current_stage }),
          ...(body.aip_issued_date !== undefined && { aipIssuedDate: body.aip_issued_date ? new Date(body.aip_issued_date) : null }),
          ...(body.aip_expiry_date !== undefined && { aipExpiryDate: body.aip_expiry_date ? new Date(body.aip_expiry_date) : null }),
          notes: newNotes as unknown as Prisma.InputJsonObject,
        },
      });
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('[arip/put] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to update ARIP.', code: 'ARIP_UPDATE_ERROR' },
      { status: 500 },
    );
  }
}
