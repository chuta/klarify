// ARIP tracker routes — CLAUDE.md §9 (GET /api/arip, PUT /api/arip)
// Tracks 5-stage ARIP application workflow per SEC ARIP Framework (June 2024).
//
// Sprint 5-B1: Extended with endpoints for stage advancement, solicitor,
// fidelity bond, growth tracking, checklist, history, and AIP status.
//
// Stage model (spec):
//   pre_screening → initial_assessment → eligibility → aip → full_registration
//
// AIP restrictions (Section 29, ARIP Framework):
//   Max 50 customers | Max NGN 2,000,000 per txn | Max NGN 5,000,000 AUM/customer
import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { type Prisma } from '@prisma/client';
import { prisma, withRls } from '../db.js';
import { requireAuth, type AuthVars } from '../middleware/auth.js';
import { requireFeature } from '../middleware/featureGate.js';
import { recalculateScore } from '../services/scoreRecalculation.js';
import {
  getOrCreateApplication,
  advanceStage,
  updateSolicitor,
  updateFidelityBond,
  updateFeePayment,
  recordGrowthEvent,
  getAipStatus,
  getChecklist,
} from '../services/aripTracker.js';

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

// Shape of the JSON stored in the `notes` column for legacy extra state.
interface AripNotes {
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

    // Extra state lives in the notes JSON column for legacy fields.
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
        stage_entered_at: record.stageEnteredAt?.toISOString() ?? null,
        aip_issued_date: record.aipIssuedDate?.toISOString() ?? null,
        aip_expiry_date: record.aipExpiryDate?.toISOString() ?? null,
        aip_days_remaining: aipDaysRemaining,
        aip_extension_count: record.aipExtensionCount,
        // AIP operational limits
        aip_total_customers: record.aipTotalCustomers,
        aip_max_customers: record.aipMaxCustomers,
        aip_max_single_txn_ngn: Number(record.aipMaxSingleTxnNgn) / 100,
        aip_max_customer_aum_ngn: Number(record.aipMaxCustomerAumNgn) / 100,
        // Compliance blockers
        solicitor_engaged: record.solicitorEngaged,
        solicitor_name: record.solicitorName,
        solicitor_firm: record.solicitorFirm,
        fidelity_bond_in_place: record.fidelityBondInPlace,
        application_fee_paid: record.applicationFeePaid,
        sec_reference_number: record.secReferenceNumber,
        // Legacy notes fields
        arip_entry_customer_count: extra.arip_entry_customer_count ?? null,
        current_customer_count:
          record.aipTotalCustomers > 0
            ? record.aipTotalCustomers
            : (extra.current_customer_count ?? null),
        growth_cap_breached:
          record.aipTotalCustomers >= record.aipMaxCustomers ||
          (extra.growth_cap_breached ?? false),
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
// PUT /api/arip — legacy update (keeps backward compat with existing UI).   //
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
      // Stage 3 fields
      solicitor_name?: string | null;
      solicitor_firm?: string | null;
      solicitor_email?: string | null;
      solicitor_engaged?: boolean;
      processing_fee_paid?: boolean;
      payment_date?: string | null;
      revop_reference?: string | null;
      fidelity_bond_in_place?: boolean;
      fidelity_bond_coverage_pct?: number | null;
      fidelity_bond_insurer?: string | null;
      fidelity_bond_expiry?: string | null;
      outcome?: string | null;
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
        // Stage 3 fields in notes for legacy UI compat
        ...(body.solicitor_email !== undefined && { solicitor_email: body.solicitor_email }),
        ...(body.payment_date !== undefined && { payment_date: body.payment_date }),
        ...(body.revop_reference !== undefined && { revop_reference: body.revop_reference }),
        ...(body.fidelity_bond_coverage_pct !== undefined && {
          fidelity_bond_coverage_pct: body.fidelity_bond_coverage_pct,
        }),
        ...(body.fidelity_bond_insurer !== undefined && {
          fidelity_bond_insurer: body.fidelity_bond_insurer,
        }),
        ...(body.outcome !== undefined && { outcome: body.outcome }),
      };

      if (!existing) {
        return tx.aripApplication.create({
          data: {
            orgId,
            licenceType: body.licence_type ?? 'unknown',
            currentStage: body.current_stage ?? 'pre_screening',
            aipIssuedDate: body.aip_issued_date ? new Date(body.aip_issued_date) : null,
            aipExpiryDate: body.aip_expiry_date ? new Date(body.aip_expiry_date) : null,
            solicitorEngaged: body.solicitor_engaged ?? false,
            solicitorName: body.solicitor_name ?? null,
            solicitorFirm: body.solicitor_firm ?? null,
            fidelityBondInPlace: body.fidelity_bond_in_place ?? false,
            applicationFeePaid: body.processing_fee_paid ?? false,
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
          ...(body.solicitor_engaged !== undefined && {
            solicitorEngaged: body.solicitor_engaged,
          }),
          ...(body.solicitor_name !== undefined && { solicitorName: body.solicitor_name }),
          ...(body.solicitor_firm !== undefined && { solicitorFirm: body.solicitor_firm }),
          ...(body.fidelity_bond_in_place !== undefined && {
            fidelityBondInPlace: body.fidelity_bond_in_place,
          }),
          ...(body.fidelity_bond_expiry !== undefined && {
            fidelityBondExpiry: body.fidelity_bond_expiry ? new Date(body.fidelity_bond_expiry) : null,
          }),
          ...(body.processing_fee_paid !== undefined && {
            applicationFeePaid: body.processing_fee_paid,
          }),
          notes: newNotes as unknown as Prisma.InputJsonObject,
        },
      });
    });

    void recalculateScore(orgId, userId).catch((e: unknown) =>
      console.error('[arip/put] recalc error', e),
    );

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
// PUT /api/arip/customer-count — legacy inline customer count update.       //
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
        return null;
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
        data: {
          aipTotalCustomers: current_customer_count,
          notes: newNotes as unknown as Prisma.InputJsonObject,
        },
      });
    });

    if (!result) {
      return c.json(
        { success: false as const, error: 'No ARIP record found.', code: 'NOT_FOUND' },
        404,
      );
    }

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

// ==========================================================================//
// Sprint 5-B1 — New endpoints using the aripTracker service                 //
// All endpoints below require Compass+ via requireFeature('arip_tracker').  //
// ==========================================================================//

// ── PUT /api/arip/stage — advance to next stage ───────────────────────────────

const advanceStageSchema = z.object({
  toStage: z.enum(['pre_screening', 'initial_assessment', 'eligibility', 'aip', 'full_registration']),
  notes: z.string().max(1000).optional(),
});

aripRoutes.put(
  '/stage',
  requireAuth,
  requireFeature('arip_tracker'),
  zValidator('json', advanceStageSchema),
  async (c) => {
    const userId = c.get('userId');
    const { toStage, notes } = c.req.valid('json');

    try {
      const orgId = await resolveOrgId(userId);
      if (orgId === null) {
        return c.json(
          { success: false as const, error: 'Organisation not found.', code: 'ORG_NOT_FOUND' },
          404,
        );
      }

      const result = await advanceStage(orgId, toStage, notes);

      if (!result.success) {
        return c.json({ success: false as const, error: result.error, code: result.code }, 409);
      }

      return c.json({ success: true as const, data: result.application });
    } catch (err) {
      console.error('[arip/stage] error', err);
      return c.json(
        { success: false as const, error: 'Failed to advance stage.', code: 'STAGE_ERROR' },
        500,
      );
    }
  },
);

// ── PUT /api/arip/solicitor — record solicitor engagement ─────────────────────

const solicitorSchema = z.object({
  name: z.string().min(2).max(200),
  firm: z.string().min(2).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

aripRoutes.put(
  '/solicitor',
  requireAuth,
  requireFeature('arip_tracker'),
  zValidator('json', solicitorSchema),
  async (c) => {
    const userId = c.get('userId');
    const body = c.req.valid('json');

    try {
      const orgId = await resolveOrgId(userId);
      if (orgId === null) {
        return c.json(
          { success: false as const, error: 'Organisation not found.', code: 'ORG_NOT_FOUND' },
          404,
        );
      }

      const updated = await updateSolicitor(orgId, body);
      return c.json({ success: true as const, data: updated });
    } catch (err) {
      console.error('[arip/solicitor] error', err);
      return c.json(
        { success: false as const, error: 'Failed to update solicitor.', code: 'SOLICITOR_ERROR' },
        500,
      );
    }
  },
);

// ── PUT /api/arip/fidelity-bond — record fidelity bond ────────────────────────

const fidelityBondSchema = z.object({
  amountNgn: z.number().positive(),
  expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

aripRoutes.put(
  '/fidelity-bond',
  requireAuth,
  requireFeature('arip_tracker'),
  zValidator('json', fidelityBondSchema),
  async (c) => {
    const userId = c.get('userId');
    const body = c.req.valid('json');

    try {
      const orgId = await resolveOrgId(userId);
      if (orgId === null) {
        return c.json(
          { success: false as const, error: 'Organisation not found.', code: 'ORG_NOT_FOUND' },
          404,
        );
      }

      const updated = await updateFidelityBond(orgId, body);
      return c.json({ success: true as const, data: updated });
    } catch (err) {
      console.error('[arip/fidelity-bond] error', err);
      return c.json(
        { success: false as const, error: 'Failed to update fidelity bond.', code: 'BOND_ERROR' },
        500,
      );
    }
  },
);

// ── PUT /api/arip/fee-payment — record application fee payment ────────────────

const feePaymentSchema = z.object({
  amountNgn: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

aripRoutes.put(
  '/fee-payment',
  requireAuth,
  requireFeature('arip_tracker'),
  zValidator('json', feePaymentSchema),
  async (c) => {
    const userId = c.get('userId');
    const body = c.req.valid('json');

    try {
      const orgId = await resolveOrgId(userId);
      if (orgId === null) {
        return c.json(
          { success: false as const, error: 'Organisation not found.', code: 'ORG_NOT_FOUND' },
          404,
        );
      }

      const updated = await updateFeePayment(orgId, body);
      return c.json({ success: true as const, data: updated });
    } catch (err) {
      console.error('[arip/fee-payment] error', err);
      return c.json(
        { success: false as const, error: 'Failed to record fee payment.', code: 'FEE_ERROR' },
        500,
      );
    }
  },
);

// ── POST /api/arip/growth — record growth event ───────────────────────────────

const growthEventSchema = z.object({
  deltaCustomers: z.number().int().default(0),
  deltaAumNgn: z.number().default(0),
  description: z.string().max(500).optional(),
});

aripRoutes.post(
  '/growth',
  requireAuth,
  requireFeature('arip_tracker'),
  zValidator('json', growthEventSchema),
  async (c) => {
    const userId = c.get('userId');
    const body = c.req.valid('json');

    try {
      const orgId = await resolveOrgId(userId);
      if (orgId === null) {
        return c.json(
          { success: false as const, error: 'Organisation not found.', code: 'ORG_NOT_FOUND' },
          404,
        );
      }

      const result = await recordGrowthEvent(orgId, body);
      return c.json({ success: true as const, data: result });
    } catch (err) {
      console.error('[arip/growth] error', err);
      return c.json(
        { success: false as const, error: 'Failed to record growth event.', code: 'GROWTH_ERROR' },
        500,
      );
    }
  },
);

// ── GET /api/arip/status — AIP caps and utilisation ──────────────────────────

aripRoutes.get('/status', requireAuth, requireFeature('arip_tracker'), async (c) => {
  const userId = c.get('userId');

  try {
    const orgId = await resolveOrgId(userId);
    if (orgId === null) {
      return c.json({ success: true as const, data: null });
    }

    const status = await getAipStatus(orgId);
    return c.json({ success: true as const, data: status });
  } catch (err) {
    console.error('[arip/status] error', err);
    return c.json(
      { success: false as const, error: 'Failed to fetch AIP status.', code: 'STATUS_ERROR' },
      500,
    );
  }
});

// ── GET /api/arip/checklist — stage-appropriate document checklist ────────────

aripRoutes.get('/checklist', requireAuth, requireFeature('arip_tracker'), async (c) => {
  const userId = c.get('userId');

  try {
    const orgId = await resolveOrgId(userId);
    if (orgId === null) {
      return c.json({ success: true as const, data: [] });
    }

    const items = await getChecklist(orgId);
    return c.json({ success: true as const, data: items });
  } catch (err) {
    console.error('[arip/checklist] error', err);
    return c.json(
      { success: false as const, error: 'Failed to fetch checklist.', code: 'CHECKLIST_ERROR' },
      500,
    );
  }
});

// ── GET /api/arip/history — stage transition audit trail ─────────────────────

aripRoutes.get('/history', requireAuth, requireFeature('arip_tracker'), async (c) => {
  const userId = c.get('userId');

  try {
    const orgId = await resolveOrgId(userId);
    if (orgId === null) {
      return c.json({ success: true as const, data: [] });
    }

    const app = await prisma.aripApplication.findFirst({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    if (!app) {
      return c.json({ success: true as const, data: [] });
    }

    const history = await prisma.aripStageHistory.findMany({
      where: { aripId: app.id },
      orderBy: { transitionedAt: 'asc' },
    });

    const formattedHistory = history.map((h) => ({
      id: h.id,
      from_stage: h.fromStage,
      to_stage: h.toStage,
      notes: h.notes,
      transitioned_at: h.transitionedAt.toISOString(),
    }));

    return c.json({ success: true as const, data: formattedHistory });
  } catch (err) {
    console.error('[arip/history] error', err);
    return c.json(
      { success: false as const, error: 'Failed to fetch stage history.', code: 'HISTORY_ERROR' },
      500,
    );
  }
});
