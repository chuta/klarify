import { NextResponse } from 'next/server';
import { acceptOrgInviteSchema } from '@klarify/core';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';
import { acceptTeamInvite, TeamError } from '@/lib/teamService';

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();

  const raw: unknown = await request.json().catch(() => null);
  const parsed = acceptOrgInviteSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid invitation token.', code: 'VALIDATION_ERROR' },
      { status: 422 },
    );
  }

  try {
    const data = await acceptTeamInvite({
      token: parsed.data.token,
      userId: auth.userId,
      userEmail: auth.email,
    });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    if (err instanceof TeamError) {
      const status =
        err.code === 'EMAIL_MISMATCH' ? 403
        : err.code === 'NOT_FOUND' ? 404
        : 400;
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status },
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to accept invitation.', code: 'TEAM_ERROR' },
      { status: 500 },
    );
  }
}
