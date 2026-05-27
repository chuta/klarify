import { NextResponse } from 'next/server';
import { prisma, resolveOrgId, withRls } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';

interface ChecklistItem {
  id: string;
  label: string;
  stage: string;
  required: boolean;
  completed: boolean;
  note?: string;
  regulatoryBasis?: string;
}

const CHECKLIST_TEMPLATES: Omit<ChecklistItem, 'completed'>[] = [
  // Stage 1 — Pre-Screening
  { id: 'product_classified', label: 'Product classified under SEC Nigeria VASP category', stage: 'pre_screening', required: true, regulatoryBasis: 'ISA 2025, SEC Digital Asset Rules 2024' },
  { id: 'legal_opinion', label: 'Legal opinion obtained on product classification', stage: 'pre_screening', required: true },
  { id: 'sec_contact_logged', label: 'SEC Innovation Office contact logged in CRM', stage: 'pre_screening', required: false },
  { id: 'cac_registered', label: 'Company registered with CAC', stage: 'pre_screening', required: true, regulatoryBasis: 'CAMA 2020' },
  { id: 'nfiu_registered', label: 'NFIU goAML registration completed', stage: 'pre_screening', required: true, regulatoryBasis: 'MLPPA 2022, Section 9' },

  // Stage 2 — Initial Assessment
  { id: 'sec_form_submitted', label: 'Initial Assessment Form submitted on SEC ePortal', stage: 'initial_assessment', required: true, regulatoryBasis: 'ARIP Framework, Section 12' },
  { id: 'solicitor_engaged', label: 'Qualified Nigerian solicitor formally engaged', stage: 'initial_assessment', required: true, regulatoryBasis: 'ARIP Framework, Section 16', note: 'Application MUST be filed through a solicitor or adviser' },
  { id: 'application_fee_paid', label: 'Application fee paid via REVOP', stage: 'initial_assessment', required: true, note: 'NGN 100,000 (DAX/DAOP) or NGN 50,000 (DAC/DAI)' },
  { id: 'sec_reference_received', label: 'SEC reference number received', stage: 'initial_assessment', required: false },

  // Stage 3 — Eligibility
  { id: 'aml_policy', label: 'AML/CFT Policy Manual documented', stage: 'eligibility', required: true, regulatoryBasis: 'MLPPA 2022' },
  { id: 'kyc_framework', label: 'KYC Tiering Framework documented', stage: 'eligibility', required: true, regulatoryBasis: 'NFIU Guidelines' },
  { id: 'co_appointed', label: 'Compliance Officer formally appointed', stage: 'eligibility', required: true, regulatoryBasis: 'MLPPA 2022, Section 12' },
  { id: 'fidelity_bond', label: 'Fidelity bond in place (min 25% of shareholder fund)', stage: 'eligibility', required: true },
  { id: 'operational_plan', label: 'ARIP Operational Plan prepared (including exit plan)', stage: 'eligibility', required: true, regulatoryBasis: 'ARIP Framework, Section 15b' },
  { id: 'sworn_undertaking', label: 'Sworn Undertaking — fitness and propriety for all officers', stage: 'eligibility', required: true, regulatoryBasis: 'ARIP Framework, Section 15a' },
  { id: 'entity_rules', label: 'Entity Rules & Governance document prepared', stage: 'eligibility', required: false, regulatoryBasis: 'ARIP Framework, Section 15c' },
  { id: 'min_capital', label: 'Minimum capital requirements met and evidenced', stage: 'eligibility', required: true },
  { id: 'it_audit', label: 'IT security audit completed', stage: 'eligibility', required: false },

  // Stage 4 — AIP Active
  { id: 'baseline_locked', label: 'Customer baseline count recorded on AIP receipt date', stage: 'aip', required: true, regulatoryBasis: 'ARIP Framework, Section 29d', note: 'CRITICAL — cannot be reconstructed later' },
  { id: 'team_briefed', label: 'All team members briefed on AIP restrictions', stage: 'aip', required: true, regulatoryBasis: 'ARIP Framework, Section 29' },
  { id: 'weekly_stats_setup', label: 'Weekly trading statistics reporting to SEC set up', stage: 'aip', required: true, regulatoryBasis: 'ARIP Framework, Section 21a' },
  { id: 'monthly_stats_setup', label: 'Monthly reporting to SEC set up', stage: 'aip', required: true, regulatoryBasis: 'ARIP Framework, Section 21a' },
  { id: 'quarterly_report', label: 'Quarterly financial and compliance report filed', stage: 'aip', required: true, regulatoryBasis: 'ARIP Framework, Section 21b' },
  { id: 'aml_training', label: 'AML/CFT team training delivered', stage: 'aip', required: true, regulatoryBasis: 'NFIU AML/CFT Framework' },
];

/**
 * GET /api/arip/checklist
 *
 * Returns stage-appropriate compliance checklist with completion status
 * derived from the ARIP application record.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  try {
    const orgId = await resolveOrgId(userId);
    if (!orgId) return NextResponse.json({ success: true, data: [] });

    const app = await withRls({ userId, orgId }, (tx) =>
      tx.aripApplication.findFirst({ where: { orgId }, orderBy: { createdAt: 'desc' } }),
    );
    if (!app) return NextResponse.json({ success: true, data: [] });

    // Map known completion states from the record
    const completionMap: Record<string, boolean> = {
      solicitor_engaged: app.solicitorEngaged,
      fidelity_bond: app.fidelityBondInPlace,
      application_fee_paid: app.applicationFeePaid,
    };

    // Use notes JSON for items that don't have dedicated columns
    const savedChecks = (app.notes as Record<string, boolean> | null)?.checklist ?? {};

    const checklist: ChecklistItem[] = CHECKLIST_TEMPLATES.map((item) => ({
      ...item,
      completed:
        completionMap[item.id] ??
        (savedChecks as Record<string, boolean>)[item.id] ??
        false,
    }));

    return NextResponse.json({ success: true, data: checklist });
  } catch (err) {
    console.error('[arip/checklist] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch checklist.', code: 'CHECKLIST_ERROR' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/arip/checklist
 *
 * Saves checklist item completion status (for items without dedicated DB columns).
 */
export async function PUT(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  let body: { itemId: string; completed: boolean };
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

      const prevNotes = (app.notes as Record<string, unknown>) ?? {};
      const prevChecklist = (prevNotes.checklist as Record<string, boolean>) ?? {};

      return tx.aripApplication.update({
        where: { id: app.id },
        data: {
          notes: {
            ...prevNotes,
            checklist: { ...prevChecklist, [body.itemId]: body.completed },
          },
        },
      });
    });

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'No ARIP application found.', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: { updated: true } });
  } catch (err) {
    console.error('[arip/checklist/put] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to update checklist.', code: 'CHECKLIST_UPDATE_ERROR' },
      { status: 500 },
    );
  }
}
