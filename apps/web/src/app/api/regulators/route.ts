import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();

  try {
    const regulators = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.current_user_id', $1, true)`,
        auth.userId,
      );
      return tx.regulator.findMany({ orderBy: { code: 'asc' } });
    });
    return NextResponse.json({ success: true, data: regulators });
  } catch (err) {
    console.error('[regulators/get-all] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch regulators.', code: 'REGULATORS_FETCH_ERROR' },
      { status: 500 },
    );
  }
}
