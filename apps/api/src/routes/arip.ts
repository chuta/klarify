// ARIP tracker routes — CLAUDE.md §9 (GET /api/arip, PUT /api/arip)
// Tracks 5-stage ARIP application workflow per SEC ARIP Framework (June 2024).
//
// NOTE: The arip_applications table currently stores: id, orgId, licenceType,
// currentStage, aipIssuedDate, aipExpiryDate, notes, createdAt, updatedAt.
// Fields like stageStatus, customerCounts, and growthCapBreached are stored
// inside the `notes` JSON column until a schema migration adds them as columns.
import { Hono } from 'hono';
import { type Prisma } from '@prisma/client';
import { prisma, withRls } from '../db.js';
import { requireAuth, type AuthVars } from '../middleware/auth.js';

export const aripRoutes = new Hono<{ Variables: AuthVars }>();

// Helper — resolve the user's orgId (first membership).
async function resolveOrgId(userId: string): Promise<string | null> {
  const membership = await prisma.orgMember.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { orgId: true },
  });
  return membership?.orgId ?? null;
}

// Shape of the JSON stored in the `notes` column for ARIP extra state.
interface AripNotes {
  // Index signature required for Prisma JSON column compatibility.
  [key: string]: unknown;
  stage_status?: string;
  arip_entry_customer_count?: number | null;
  current_customer_count?: number | null;
  growth_cap_breached?: boolean;
  next_filing?: { title: string; due_date: string } | null;
}

// ========================================================================== //
// GET /api/arip — current ARIP application state for the org.               //
// ========================================================================== //
aripRoutes.get('/', requireAuth, async (c) => {
  const userId = c.get('userId');

  try {
    const orgId = await resolveOrgId(userId);
    if (orgId === null) {
      return c.json({ success: true as const, data: null });
    }

    const record = await withRls({ userId, orgId }, (tx) =>
      tx.aripApplication.findFirst({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
      }),
    );

    if (!record) {
      return c.json({ success: true as const, data: null });
    }

    // Extra state lives in the notes JSON column until schema migration.
    const extra = (record.notes as AripNotes) ?? {};

    // Calculate AIP expiry days remaining.
    let aipDaysRemaining: number | null = null;
    if (record.aipExpiryDate) {
      const msRemaining = new Date(record.aipExpiryDate).getTime() - Date.now();
      aipDaysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
    }

    return c.json({
      success: true as const,
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
    return c.json(
      { success: false as const, error: 'Failed to fetch ARIP data.', code: 'ARIP_FETCH_ERROR' },
      500,
    );
  }
});

// ========================================================================== //
// PUT /api/arip — update ARIP stage, dates, or extra state.                 //
// ========================================================================== //
aripRoutes.put('/', requireAuth, async (c) => {
  const userId = c.get('userId');

  try {
    const body = await c.req.json<{
      licence_type?: string;
      current_stage?: string;
      stage_status?: string;
      aip_issued_date?: string | null;
      aip_expiry_date?: string | null;
      arip_entry_customer_count?: number | null;
      current_customer_count?: number | null;
      growth_cap_breached?: boolean;
      next_filing?: { title: string; due_date: string } | null;
    }>();

    const orgId = await resolveOrgId(userId);
    if (orgId === null) {
      return c.json(
        { success: false as const, error: 'Organisation not found.', code: 'ORG_NOT_FOUND' },
        404,
      );
    }

    const updated = await withRls({ userId, orgId }, async (tx) => {
      const existing = await tx.aripApplication.findFirst({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
      });

      // Merge extra state into the notes JSON column.
      const prevNotes = (existing?.notes as AripNotes) ?? {};
      const newNotes: AripNotes = {
        ...prevNotes,
        ...(body.stage_status !== undefined && { stage_status: body.stage_status }),
        ...(body.arip_entry_customer_count !== undefined && {
          arip_entry_customer_count: body.arip_entry_customer_count,
        }),
        ...(body.current_customer_count !== undefined && {
          current_customer_count: body.current_customer_count,
        }),
        ...(body.growth_cap_breached !== undefined && {
          growth_cap_breached: body.growth_cap_breached,
        }),
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
          ...(body.aip_issued_date !== undefined && {
            aipIssuedDate: body.aip_issued_date ? new Date(body.aip_issued_date) : null,
          }),
          ...(body.aip_expiry_date !== undefined && {
            aipExpiryDate: body.aip_expiry_date ? new Date(body.aip_expiry_date) : null,
          }),
          notes: newNotes as unknown as Prisma.InputJsonObject,
        },
      });
    });

    return c.json({ success: true as const, data: updated });
  } catch (err) {
    console.error('[arip/put] error', err);
    return c.json(
      { success: false as const, error: 'Failed to update ARIP.', code: 'ARIP_UPDATE_ERROR' },
      500,
    );
  }
});

// ========================================================================== //
// PUT /api/arip/customer-count — update current customer count inline.      //
// Used by ARIPRestrictionsWidget without a full PUT payload.                 //
// ========================================================================== //
aripRoutes.put('/customer-count', requireAuth, async (c) => {
  const userId = c.get('userId');

  try {
    const { current_customer_count } = await c.req.json<{ current_customer_count: number }>();

    const orgId = await resolveOrgId(userId);
    if (orgId === null) {
      return c.json(
        { success: false as const, error: 'Organisation not found.', code: 'ORG_NOT_FOUND' },
        404,
      );
    }

    const result = await withRls({ userId, orgId }, async (tx) => {
      const existing = await tx.aripApplication.findFirst({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
      });

      if (!existing) {
        return c.json(
          { success: false as const, error: 'No ARIP record found.', code: 'NOT_FOUND' },
          404,
        );
      }

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

    return c.json({ success: true as const, data: result });
  } catch (err) {
    console.error('[arip/customer-count] error', err);
    return c.json(
      {
        success: false as const,
        error: 'Failed to update customer count.',
        code: 'CUSTOMER_COUNT_ERROR',
      },
      500,
    );
  }
});
