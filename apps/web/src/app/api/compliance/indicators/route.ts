import { NextResponse } from 'next/server';
import {
  DIMENSION_INDICATORS,
  DIMENSION_WEIGHTS,
  type DimensionKey,
} from '@klarify/core';
import { resolveOrgId, withRls } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';
import {
  flipIndicatorAndRecalc,
  reconcileLockState,
} from '@/lib/roadmapService';

export async function PUT(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  const body = (await request.json()) as { dimension: string; indicator: string; value: boolean };
  const { dimension, indicator, value } = body;

  const validDimensions = Object.keys(DIMENSION_WEIGHTS) as DimensionKey[];
  if (!validDimensions.includes(dimension as DimensionKey)) {
    return NextResponse.json(
      { success: false, error: 'Invalid dimension.', code: 'INVALID_DIMENSION' },
      { status: 400 },
    );
  }
  const validIndicators = DIMENSION_INDICATORS[dimension as DimensionKey] as readonly string[];
  if (!validIndicators.includes(indicator)) {
    return NextResponse.json(
      {
        success: false,
        error: `Indicator "${indicator}" is not valid for dimension "${dimension}".`,
        code: 'INVALID_INDICATOR',
      },
      { status: 400 },
    );
  }

  try {
    const orgId = await resolveOrgId(userId);
    if (orgId === null) {
      return NextResponse.json(
        { success: false, error: 'Organisation not found.', code: 'ORG_NOT_FOUND' },
        { status: 404 },
      );
    }

    const result = await withRls({ userId, orgId }, async (tx) => {
      const { scoreUpdate, nextState } = await flipIndicatorAndRecalc(
        tx, orgId, dimension as DimensionKey, indicator, value,
      );
      // Indicator flips like registered_solicitor_engaged unlock tasks.
      const lockChanges = await reconcileLockState(tx, orgId, nextState);
      return { scoreUpdate, lockChanges };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error('[compliance/indicators] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to update indicator.', code: 'INDICATOR_UPDATE_ERROR' },
      { status: 500 },
    );
  }
}
