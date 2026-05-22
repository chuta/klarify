import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';

export async function GET(
  request: Request,
  { params }: { params: { code: string } },
): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();

  const code = params.code.toUpperCase();
  try {
    const regulator = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.current_user_id', $1, true)`,
        auth.userId,
      );
      return tx.regulator.findUnique({ where: { code } });
    });
    if (!regulator) {
      return NextResponse.json(
        { success: false, error: 'Regulator not found.', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: regulator });
  } catch (err) {
    console.error('[regulators/get-one] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch regulator.', code: 'REGULATOR_FETCH_ERROR' },
      { status: 500 },
    );
  }
}
