// Next.js Route Handler — /api/regulators/interactions/[id]
// PUT: update an interaction (mark complete, add outcome, etc.)

import { NextResponse } from 'next/server';
import { prisma, resolveOrgId, withRls } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';
import type { UpdateInteractionBody } from '@klarify/core';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  try {
    const body = (await request.json()) as UpdateInteractionBody;
    const orgId = await resolveOrgId(userId);
    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'Organisation not found.', code: 'ORG_NOT_FOUND' },
        { status: 404 },
      );
    }

    // Ensure the interaction belongs to this org.
    const existing = await prisma.regulatorInteraction.findFirst({
      where: { id: params.id, orgId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Interaction not found.', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    const updated = await withRls({ userId, orgId }, (tx) =>
      tx.regulatorInteraction.update({
        where: { id: params.id },
        data: {
          ...(body.outcome !== undefined && { outcome: body.outcome }),
          ...(body.followUpRequired !== undefined && { followUpRequired: body.followUpRequired }),
          ...(body.followUpDate !== undefined && {
            followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
          }),
          ...(body.isComplete !== undefined && { isComplete: body.isComplete }),
          ...(body.occurredAt !== undefined && { occurredAt: new Date(body.occurredAt) }),
        },
      }),
    );

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        orgId: updated.orgId,
        regulatorCode: updated.regulatorCode,
        interactionType: updated.interactionType,
        subject: updated.subject,
        outcome: updated.outcome,
        followUpRequired: updated.followUpRequired,
        followUpDate: updated.followUpDate?.toISOString().slice(0, 10) ?? null,
        isComplete: updated.isComplete,
        createdBy: updated.createdBy,
        occurredAt: updated.occurredAt.toISOString(),
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error('[api/regulators/interactions/put]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to update interaction.', code: 'UPDATE_ERROR' },
      { status: 500 },
    );
  }
}
