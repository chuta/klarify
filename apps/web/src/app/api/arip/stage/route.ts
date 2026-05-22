import { NextResponse } from 'next/server';
import { prisma, resolveOrgId, withRls } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';
import { type Prisma } from '@prisma/client';

const SPEC_STAGES = [
  'pre_screening',
  'initial_assessment',
  'eligibility',
  'aip',
  'full_registration',
] as const;

type SpecStage = typeof SPEC_STAGES[number];

function getStageIndex(stage: string): number {
  return SPEC_STAGES.indexOf(stage as SpecStage);
}

/**
 * PUT /api/arip/stage
 *
 * Advances the ARIP application to the next sequential stage.
 * Enforces regulatory blockers:
 *   - pre_screening → initial_assessment: requires solicitor_engaged = true
 *   - initial_assessment → eligibility: requires fidelity_bond_in_place = true
 *
 * Regulatory source: ARIP Framework, SEC Nigeria, June 2024 (Sections 15a, 16)
 */
export async function PUT(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  let body: { toStage: string; notes?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.', code: 'INVALID_BODY' },
      { status: 400 },
    );
  }

  const { toStage, notes } = body;

  if (!toStage || !SPEC_STAGES.includes(toStage as SpecStage)) {
    return NextResponse.json(
      { success: false, error: 'Invalid stage. Must be one of: ' + SPEC_STAGES.join(', '), code: 'INVALID_STAGE' },
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
      if (!app) return { error: 'No ARIP application found.', code: 'NOT_FOUND' };

      const fromIdx = getStageIndex(app.currentStage);
      const toIdx = getStageIndex(toStage);

      if (toIdx === fromIdx) {
        return { error: 'Already in this stage.', code: 'ALREADY_IN_STAGE' };
      }
      if (toIdx !== fromIdx + 1) {
        return { error: 'Stage must advance sequentially. Skipping stages is not allowed.', code: 'STAGE_SKIP_NOT_ALLOWED' };
      }

      // Regulatory blocker: solicitor required before initial_assessment
      if (toStage === 'initial_assessment' && !app.solicitorEngaged) {
        return {
          error: 'A qualified Nigerian solicitor must be engaged before advancing to Initial Assessment (Section 16, ARIP Framework).',
          code: 'SOLICITOR_REQUIRED',
        };
      }
      // Regulatory blocker: fidelity bond required before eligibility
      if (toStage === 'eligibility' && !app.fidelityBondInPlace) {
        return {
          error: 'A fidelity bond must be in place before advancing to Eligibility (ARIP Framework).',
          code: 'FIDELITY_BOND_REQUIRED',
        };
      }

      const patchData: Prisma.AripApplicationUpdateInput = {
        currentStage: toStage,
        stageEnteredAt: new Date(),
      };

      if (toStage === 'aip') {
        const issued = new Date();
        const expiry = new Date(issued);
        expiry.setMonth(expiry.getMonth() + 6);
        patchData.aipIssuedDate = issued;
        patchData.aipExpiryDate = expiry;
      }

      const updated = await tx.aripApplication.update({
        where: { id: app.id },
        data: patchData,
      });

      // Append to stage history (arip_stage_history table via raw insert for simplicity)
      await tx.$executeRaw`
        INSERT INTO arip_stage_history (arip_id, from_stage, to_stage, notes)
        VALUES (${app.id}::uuid, ${app.currentStage}, ${toStage}, ${notes ?? null})
      `;

      return { data: updated };
    });

    if ('error' in result) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        ALREADY_IN_STAGE: 409,
        STAGE_SKIP_NOT_ALLOWED: 422,
        SOLICITOR_REQUIRED: 422,
        FIDELITY_BOND_REQUIRED: 422,
      };
      const status = (result.code ? (statusMap[result.code as keyof typeof statusMap] ?? 422) : 422);
      return NextResponse.json({ success: false, error: result.error, code: result.code }, { status });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (err) {
    console.error('[arip/stage] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to advance ARIP stage.', code: 'STAGE_ADVANCE_ERROR' },
      { status: 500 },
    );
  }
}
