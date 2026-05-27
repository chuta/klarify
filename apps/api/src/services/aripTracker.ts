// =============================================================================
// aripTracker.ts — ARIP Application Tracker Service (Sprint 5-B1)
//
// Business logic for the 5-stage ARIP process per SEC Nigeria ARIP Framework
// (June 2024).
//
// Stage model (spec):
//   pre_screening → initial_assessment → eligibility → aip → full_registration
//
// AIP restrictions (Section 29, ARIP Framework):
//   - Max 50 customers during AIP period
//   - Max NGN 2,000,000 per single customer transaction
//   - Max NGN 5,000,000 AUM per customer
// =============================================================================

import type { Prisma, AripApplication } from '@prisma/client';
import { prisma } from '../db.js';
import { recalculateScore } from './scoreRecalculation.js';
import { sendARIPGrowthAlert } from './emailService.js';

// ── Stage ordering ─────────────────────────────────────────────────────────────

export const STAGE_ORDER: readonly string[] = [
  'pre_screening',
  'initial_assessment',
  'eligibility',
  'aip',
  'full_registration',
] as const;

export type AripStage = typeof STAGE_ORDER[number];

export function getStageIndex(stage: string): number {
  return STAGE_ORDER.indexOf(stage);
}

/** True if `stage` is one of the 5 spec stages. */
export function isSpecStage(stage: string): stage is AripStage {
  return STAGE_ORDER.includes(stage);
}

// ── Result types ───────────────────────────────────────────────────────────────

export interface AipStatus {
  currentStage: string;
  aipIssuedDate: string | null;
  aipExpiryDate: string | null;
  daysRemaining: number | null;
  isExpired: boolean;
  expiryUrgent: boolean; // within 30 days

  customerCap: number;           // = aip_max_customers (default 50)
  currentCustomers: number;      // = aip_total_customers
  customerUtilPct: number;       // (currentCustomers / customerCap) * 100
  approachingCustomerCap: boolean; // >= 90% of cap
  customerCapBreached: boolean;  // >= 100% of cap

  maxSingleTxnNgn: number;       // in NGN (not kobo)
  maxCustomerAumNgn: number;     // in NGN

  warnings: string[];
}

export interface GrowthEventResult {
  withinLimits: boolean;
  warnings: string[];
  newTotalCustomers: number;
  newTotalAumNgn: bigint;
  customerUtilPct: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  stage: string;
  completed: boolean;
  blocking: boolean; // Must complete before advancing
  helpText?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Convert BigInt kobo to NGN number (safe for display). */
function koboToNgn(kobo: bigint): number {
  return Number(kobo) / 100;
}

function calcDaysRemaining(expiryDate: Date | null): number | null {
  if (!expiryDate) return null;
  const ms = new Date(expiryDate).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

// ── Service functions ──────────────────────────────────────────────────────────

/**
 * Find or create the ARIP application for the given org.
 * If no licenceType is provided and no application exists, defaults to 'unknown'.
 */
export async function getOrCreateApplication(
  orgId: string,
  licenceType?: string,
): Promise<AripApplication> {
  const existing = await prisma.aripApplication.findFirst({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
  });
  if (existing) return existing;

  const created = await prisma.aripApplication.create({
    data: {
      orgId,
      licenceType: licenceType ?? 'unknown',
      currentStage: 'pre_screening',
      stageEnteredAt: new Date(),
    },
  });

  return created;
}

/**
 * Validate and advance the ARIP stage.
 *
 * Blockers:
 *   - Cannot advance to 'initial_assessment' unless solicitor_engaged = true
 *   - Cannot advance to 'eligibility' unless fidelity_bond_in_place = true
 *   - Stages must be sequential — cannot skip
 *   - Cannot advance past full_registration
 *   - Cannot re-advance to the same stage
 */
export async function advanceStage(
  orgId: string,
  toStage: string,
  notes?: string,
): Promise<{ success: true; application: AripApplication } | { success: false; error: string; code: string }> {
  const app = await prisma.aripApplication.findFirst({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
  });

  if (!app) {
    return { success: false, error: 'No ARIP application found.', code: 'NOT_FOUND' };
  }

  // Only enforce sequential ordering when advancing within spec stages.
  if (isSpecStage(toStage) && isSpecStage(app.currentStage)) {
    const fromIdx = getStageIndex(app.currentStage);
    const toIdx = getStageIndex(toStage);

    if (toIdx === fromIdx) {
      return {
        success: false,
        error: `Already in stage "${toStage}".`,
        code: 'ALREADY_IN_STAGE',
      };
    }
    if (toIdx !== fromIdx + 1) {
      return {
        success: false,
        error: `Cannot skip stages. Must advance from "${app.currentStage}" to the next stage.`,
        code: 'STAGE_SKIP_NOT_ALLOWED',
      };
    }
  }

  // ── Compliance blockers ──────────────────────────────────────────────────────

  if (toStage === 'initial_assessment' && !app.solicitorEngaged) {
    return {
      success: false,
      error:
        'A qualified Nigerian solicitor must be formally engaged before advancing to Initial Assessment. ' +
        'This is a regulatory requirement under Section 16 of the ARIP Framework.',
      code: 'SOLICITOR_REQUIRED',
    };
  }

  if (toStage === 'eligibility' && !app.fidelityBondInPlace) {
    return {
      success: false,
      error:
        'A fidelity bond must be in place before advancing to Eligibility. ' +
        'This is required under the ARIP Framework.',
      code: 'FIDELITY_BOND_REQUIRED',
    };
  }

  // ── Record history and update stage ─────────────────────────────────────────

  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    // Append to stage history.
    await tx.aripStageHistory.create({
      data: {
        aripId: app.id,
        fromStage: app.currentStage,
        toStage,
        notes: notes ?? null,
        transitionedAt: now,
      },
    });

    const patchData: Prisma.AripApplicationUpdateInput = {
      currentStage: toStage,
      stageEnteredAt: now,
    };

    // On AIP activation: set AIP dates (6-month period per ARIP Framework).
    if (toStage === 'aip') {
      const sixMonthsFromNow = new Date(now);
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      patchData.aipIssuedDate = now;
      patchData.aipExpiryDate = sixMonthsFromNow;
    }

    return tx.aripApplication.update({
      where: { id: app.id },
      data: patchData,
    });
  });

  // AIP stage changes can affect capital_licensing score dimension.
  void recalculateScore(orgId).catch((e: unknown) =>
    console.error('[aripTracker/advanceStage] recalc error', e),
  );

  // Create compliance calendar events when AIP activates.
  if (toStage === 'aip' && updated.aipIssuedDate && updated.aipExpiryDate) {
    void createAipCalendarEvents(orgId, updated.aipIssuedDate, updated.aipExpiryDate).catch(
      (e: unknown) => console.error('[aripTracker/advanceStage] calendar events error', e),
    );
  }

  return { success: true, application: updated };
}

/**
 * Record the solicitor engagement. This unblocks the transition to
 * initial_assessment.
 */
export async function updateSolicitor(
  orgId: string,
  data: { name: string; firm: string; date: string },
): Promise<AripApplication> {
  const app = await prisma.aripApplication.findFirst({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
  });

  const engagedDate = data.date ? new Date(data.date) : new Date();

  if (app) {
    return prisma.aripApplication.update({
      where: { id: app.id },
      data: {
        solicitorEngaged: true,
        solicitorName: data.name,
        solicitorFirm: data.firm,
        solicitorEngagedDate: engagedDate,
      },
    });
  }

  return prisma.aripApplication.create({
    data: {
      orgId,
      licenceType: 'unknown',
      currentStage: 'pre_screening',
      solicitorEngaged: true,
      solicitorName: data.name,
      solicitorFirm: data.firm,
      solicitorEngagedDate: engagedDate,
    },
  });
}

/**
 * Record the fidelity bond. This unblocks the transition to eligibility.
 */
export async function updateFidelityBond(
  orgId: string,
  data: { amountNgn: number; expiry: string },
): Promise<AripApplication> {
  const app = await getOrCreateApplication(orgId);
  return prisma.aripApplication.update({
    where: { id: app.id },
    data: {
      fidelityBondInPlace: true,
      fidelityBondAmountNgn: BigInt(Math.round(data.amountNgn)),
      fidelityBondExpiry: data.expiry ? new Date(data.expiry) : null,
    },
  });
}

/**
 * Record application fee payment.
 */
export async function updateFeePayment(
  orgId: string,
  data: { amountNgn: number; date: string },
): Promise<AripApplication> {
  const app = await getOrCreateApplication(orgId);
  return prisma.aripApplication.update({
    where: { id: app.id },
    data: {
      applicationFeePaid: true,
      applicationFeeAmountNgn: Math.round(data.amountNgn),
      applicationFeePaidDate: data.date ? new Date(data.date) : new Date(),
    },
  });
}

/**
 * Record a customer or AUM growth event. Checks caps and logs breaches.
 * All amounts should be in NGN (converted to kobo internally).
 */
export async function recordGrowthEvent(
  orgId: string,
  event: {
    deltaCustomers?: number;
    deltaAumNgn?: number;
    description?: string;
  },
): Promise<GrowthEventResult> {
  const app = await getOrCreateApplication(orgId);

  const deltaCustomers = event.deltaCustomers ?? 0;
  const deltaAumNgn = BigInt(Math.round(event.deltaAumNgn ?? 0));

  const newTotalCustomers = app.aipTotalCustomers + deltaCustomers;
  const newTotalAumNgn = app.aipTotalAumNgn + deltaAumNgn;

  const customerUtilPct =
    app.aipMaxCustomers > 0
      ? (newTotalCustomers / app.aipMaxCustomers) * 100
      : 0;

  const customerCapBreached = newTotalCustomers >= app.aipMaxCustomers;
  const warnings: string[] = [];

  if (customerCapBreached) {
    warnings.push(
      `Customer cap reached: ${newTotalCustomers}/${app.aipMaxCustomers}. ` +
        'Pause all customer acquisition immediately (Section 29d, ARIP Framework).',
    );
  } else if (customerUtilPct >= 90) {
    warnings.push(
      `Approaching customer cap: ${newTotalCustomers}/${app.aipMaxCustomers} (${Math.round(customerUtilPct)}% used). ` +
        'Review customer acquisition activities.',
    );
  }

  const eventType = customerCapBreached ? 'restriction_breach' : 'customer_onboarded';

  await prisma.$transaction(async (tx) => {
    await tx.aripGrowthLog.create({
      data: {
        aripId: app.id,
        orgId,
        eventType,
        deltaCustomers,
        deltaAumNgn,
        description: event.description ?? null,
      },
    });

    await tx.aripApplication.update({
      where: { id: app.id },
      data: {
        aipTotalCustomers: newTotalCustomers,
        aipTotalAumNgn: newTotalAumNgn,
      },
    });
  });

  // Fire growth alert emails when approaching (>= 90%) or breaching the cap.
  if (customerUtilPct >= 90) {
    void sendGrowthAlertEmails(orgId, app, newTotalCustomers, customerUtilPct, customerCapBreached).catch(
      (err: unknown) => console.error('[aripTracker/recordGrowthEvent] growth alert email error', err),
    );
  }

  return {
    withinLimits: !customerCapBreached,
    warnings,
    newTotalCustomers,
    newTotalAumNgn,
    customerUtilPct: Math.round(customerUtilPct * 10) / 10,
  };
}

/** Send ARIP growth alert to all active org members. Fire-and-forget helper. */
async function sendGrowthAlertEmails(
  orgId: string,
  app: AripApplication,
  currentCustomers: number,
  utilPct: number,
  capBreached: boolean,
): Promise<void> {
  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    include: {
      members: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
    },
  });
  if (!org) return;

  const daysUntilAipExpiry = app.aipExpiryDate
    ? Math.ceil((app.aipExpiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  await Promise.allSettled(
    org.members.map((m) =>
      sendARIPGrowthAlert({
        userId:           m.user.id,
        to:               m.user.email,
        name:             m.user.name ?? m.user.email,
        organisationName: org.name,
        currentCustomers,
        maxCustomers:     app.aipMaxCustomers,
        utilPct,
        daysUntilAipExpiry,
        capBreached,
        idempotencyKey: `arip_growth:${app.id}:${currentCustomers}`,
      }),
    ),
  );
}

/**
 * Get the full AIP status including cap utilisation and urgency flags.
 */
export async function getAipStatus(orgId: string): Promise<AipStatus | null> {
  const app = await prisma.aripApplication.findFirst({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
  });

  if (!app) return null;

  const daysRemaining = calcDaysRemaining(app.aipExpiryDate);
  const isExpired = daysRemaining !== null && daysRemaining <= 0;
  const expiryUrgent = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 30;

  const customerUtilPct =
    app.aipMaxCustomers > 0
      ? Math.round((app.aipTotalCustomers / app.aipMaxCustomers) * 1000) / 10
      : 0;

  const approachingCustomerCap = customerUtilPct >= 90 && customerUtilPct < 100;
  const customerCapBreached = app.aipTotalCustomers >= app.aipMaxCustomers;

  const warnings: string[] = [];
  if (isExpired) {
    warnings.push(
      `AIP period has expired. Contact SEC Nigeria immediately to request an extension ` +
        `or begin transition to registration.`,
    );
  } else if (expiryUrgent && daysRemaining !== null) {
    warnings.push(
      `AIP expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. ` +
        `Begin transition-to-registration process or apply for extension.`,
    );
  }
  if (customerCapBreached) {
    warnings.push(
      `Customer cap of ${app.aipMaxCustomers} has been reached. ` +
        `Pause all customer acquisition immediately (Section 29d, ARIP Framework).`,
    );
  } else if (approachingCustomerCap) {
    warnings.push(
      `Approaching customer cap: ${app.aipTotalCustomers}/${app.aipMaxCustomers}. ` +
        `Review customer acquisition pipeline.`,
    );
  }

  return {
    currentStage: app.currentStage,
    aipIssuedDate: app.aipIssuedDate?.toISOString() ?? null,
    aipExpiryDate: app.aipExpiryDate?.toISOString() ?? null,
    daysRemaining,
    isExpired,
    expiryUrgent,
    customerCap: app.aipMaxCustomers,
    currentCustomers: app.aipTotalCustomers,
    customerUtilPct,
    approachingCustomerCap,
    customerCapBreached,
    maxSingleTxnNgn: koboToNgn(app.aipMaxSingleTxnNgn),
    maxCustomerAumNgn: koboToNgn(app.aipMaxCustomerAumNgn),
    warnings,
  };
}

/**
 * Build a stage-appropriate checklist. Items marked `blocking: true` must
 * be completed before the application can advance to the next stage.
 */
export async function getChecklist(orgId: string): Promise<ChecklistItem[]> {
  const app = await prisma.aripApplication.findFirst({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
  });

  if (!app) {
    return buildChecklist('pre_screening', null);
  }

  return buildChecklist(app.currentStage, app);
}

function buildChecklist(
  stage: string,
  app: AripApplication | null,
): ChecklistItem[] {
  const all: ChecklistItem[] = [
    // ── Stage 1: Pre-Screening ────────────────────────────────────────────────
    {
      id: 'product_classified',
      label: 'Product classified under SEC Nigeria VASP category',
      stage: 'pre_screening',
      completed: false,
      blocking: true,
      helpText: 'Use the Klarify Product Classifier to identify your correct regulatory category.',
    },
    {
      id: 'cac_registered',
      label: 'Company registered with CAC (Certificate of Incorporation)',
      stage: 'pre_screening',
      completed: false,
      blocking: true,
    },
    {
      id: 'legal_opinion',
      label: 'Legal opinion from Nigerian solicitor obtained',
      stage: 'pre_screening',
      completed: false,
      blocking: false,
    },
    {
      id: 'sec_contact_logged',
      label: 'SEC Nigeria Innovation Office contact logged',
      stage: 'pre_screening',
      completed: false,
      blocking: false,
      helpText: 'Email: innovation@sec.gov.ng — Tue & Thu, 10am–2pm.',
    },

    // ── Stage 2: Initial Assessment ───────────────────────────────────────────
    {
      id: 'solicitor_engaged',
      label: 'Qualified Nigerian solicitor formally engaged (Section 16, ARIP Framework)',
      stage: 'initial_assessment',
      completed: app?.solicitorEngaged ?? false,
      blocking: true,
    },
    {
      id: 'initial_assessment_submitted',
      label: 'Initial Assessment Form submitted via SEC ePortal (home.sec.gov.ng)',
      stage: 'initial_assessment',
      completed: false,
      blocking: true,
    },
    {
      id: 'tin_obtained',
      label: 'Tax Identification Number (TIN) obtained from FIRS',
      stage: 'initial_assessment',
      completed: false,
      blocking: false,
    },

    // ── Stage 3: Eligibility ──────────────────────────────────────────────────
    {
      id: 'fidelity_bond',
      label: 'Fidelity bond in place — minimum 25% of shareholder fund (NAICOM-approved insurer)',
      stage: 'eligibility',
      completed: app?.fidelityBondInPlace ?? false,
      blocking: true,
    },
    {
      id: 'application_fee_paid',
      label: 'Application processing fee paid via REVOP (non-refundable)',
      stage: 'eligibility',
      completed: app?.applicationFeePaid ?? false,
      blocking: true,
      helpText:
        'DAX/DAOP: NGN 2,000,000 | DAC/DAI: NGN 1,000,000. Pay via REVOP only — no cash accepted.',
    },
    {
      id: 'aml_policy',
      label: 'AML/CFT Policy Manual finalised',
      stage: 'eligibility',
      completed: false,
      blocking: false,
    },
    {
      id: 'kyc_tiers',
      label: 'KYC Tiering Framework documented (NIN/BVN verification)',
      stage: 'eligibility',
      completed: false,
      blocking: false,
    },
    {
      id: 'nfiu_registered',
      label: 'NFIU goAML registration completed',
      stage: 'eligibility',
      completed: false,
      blocking: true,
    },
    {
      id: 'bwra_documented',
      label: 'Business-Wide Risk Assessment (BWRA) documented',
      stage: 'eligibility',
      completed: false,
      blocking: false,
    },
    {
      id: 'operational_plan',
      label: 'ARIP Operational Plan prepared (including exit plan — Section 15b)',
      stage: 'eligibility',
      completed: false,
      blocking: true,
    },

    // ── Stage 4: AIP ──────────────────────────────────────────────────────────
    {
      id: 'baseline_recorded',
      label: 'Customer baseline count recorded on AIP receipt date (Section 29d)',
      stage: 'aip',
      completed: app ? app.aipTotalCustomers > 0 : false,
      blocking: true,
      helpText:
        'Record your EXACT customer count on the day AIP is received. This is your baseline ' +
        'for the 10% growth cap. Cannot be reconstructed later.',
    },
    {
      id: 'restrictions_briefed',
      label: 'All team members briefed on AIP restrictions (no promotions, 10% growth cap)',
      stage: 'aip',
      completed: false,
      blocking: true,
    },
    {
      id: 'weekly_report_configured',
      label: 'Weekly trading statistics report to SEC configured (Section 21a)',
      stage: 'aip',
      completed: false,
      blocking: false,
    },
    {
      id: 'monthly_report_configured',
      label: 'Monthly compliance report to SEC configured (Section 21b)',
      stage: 'aip',
      completed: false,
      blocking: false,
    },

    // ── Stage 5: Full Registration ────────────────────────────────────────────
    {
      id: 'transition_application',
      label: 'Transition to registration application submitted',
      stage: 'full_registration',
      completed: false,
      blocking: true,
    },
  ];

  // Only return items for current stage and previous stages.
  const currentIdx = Math.max(getStageIndex(stage), 0);
  const relevantStages = STAGE_ORDER.slice(0, currentIdx + 1);
  return all.filter((item) => relevantStages.includes(item.stage));
}

/**
 * Create compliance calendar events when AIP period activates.
 * Weekly, monthly, and quarterly SEC filings plus AIP expiry reminders
 * (Section 21, ARIP Framework, June 2024).
 */
async function createAipCalendarEvents(
  orgId: string,
  aipIssuedDate: Date,
  aipExpiryDate: Date,
): Promise<void> {
  const existing = await prisma.complianceEvent.count({
    where: { orgId, eventType: 'ARIP_DEADLINE' },
  });
  if (existing > 0) return;

  const events: Prisma.ComplianceEventCreateInput[] = [];

  const thirtyDaysBefore = new Date(aipExpiryDate);
  thirtyDaysBefore.setDate(thirtyDaysBefore.getDate() - 30);

  const sevenDaysBefore = new Date(aipExpiryDate);
  sevenDaysBefore.setDate(sevenDaysBefore.getDate() - 7);

  events.push({
    org: { connect: { id: orgId } },
    eventType: 'ARIP_DEADLINE',
    title: 'AIP Expiry — 30 days remaining',
    description:
      'Your ARIP AIP period expires in 30 days. Begin transition-to-registration ' +
      'process or apply for extension via the SEC ePortal.',
    dueDate: thirtyDaysBefore,
    isComplete: false,
  });

  events.push({
    org: { connect: { id: orgId } },
    eventType: 'ARIP_DEADLINE',
    title: 'AIP Expiry — 7 days remaining (URGENT)',
    description:
      'AIP period expires in 7 days. If transition to registration is not in progress, ' +
      'contact SEC Nigeria immediately.',
    dueDate: sevenDaysBefore,
    isComplete: false,
  });

  // Weekly trading statistics — up to 52 weeks within AIP period.
  for (let week = 1; week <= 52; week++) {
    const dueDate = new Date(aipIssuedDate);
    dueDate.setDate(dueDate.getDate() + week * 7);
    if (dueDate > aipExpiryDate) break;

    events.push({
      org: { connect: { id: orgId } },
      eventType: 'ARIP_DEADLINE',
      title: `Weekly Trading Statistics — SEC Filing (Week ${week})`,
      description:
        'Submit weekly trading statistics to SEC Nigeria (Section 21a, ARIP Framework).',
      dueDate,
      recurrence: 'weekly',
      isComplete: false,
    });
  }

  // Monthly reports — 12 months from AIP issued date.
  for (let month = 1; month <= 12; month++) {
    const dueDate = new Date(aipIssuedDate);
    dueDate.setMonth(dueDate.getMonth() + month);
    if (dueDate > aipExpiryDate) break;

    events.push({
      org: { connect: { id: orgId } },
      eventType: 'ARIP_DEADLINE',
      title: `Monthly Trading Statistics & Reports — SEC (Month ${month})`,
      description:
        'Submit full trading statistics and all monthly reporting requirements to SEC Nigeria ' +
        '(Section 21a, ARIP Framework).',
      dueDate,
      recurrence: 'monthly',
      isComplete: false,
    });
  }

  // Quarterly financial & compliance reports — 4 quarters.
  for (let quarter = 1; quarter <= 4; quarter++) {
    const dueDate = new Date(aipIssuedDate);
    dueDate.setMonth(dueDate.getMonth() + quarter * 3);
    if (dueDate > aipExpiryDate) break;

    events.push({
      org: { connect: { id: orgId } },
      eventType: 'ARIP_DEADLINE',
      title: `Quarterly Financial & Compliance Report — SEC (Q${quarter})`,
      description:
        'File quarterly financial statements and compliance reports demonstrating adherence to ' +
        'all SEC ARIP conditions (Section 21b, ARIP Framework).',
      dueDate,
      recurrence: 'quarterly',
      isComplete: false,
    });
  }

  await Promise.all(
    events.map((e) =>
      prisma.complianceEvent.create({ data: e }).catch((err: unknown) =>
        console.error('[aripTracker] calendar event create error', err),
      ),
    ),
  );
}
