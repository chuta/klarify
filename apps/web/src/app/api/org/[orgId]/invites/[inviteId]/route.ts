import { NextResponse } from 'next/server';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';
import { revokeTeamInvite, TeamError } from '@/lib/teamService';

export async function DELETE(
  _request: Request,
  { params }: { params: { orgId: string; inviteId: string } },
): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(_request);
  if (!auth) return unauthenticated();

  try {
    await revokeTeamInvite({
      orgId: params.orgId,
      inviteId: params.inviteId,
      actorUserId: auth.userId,
    });
    return NextResponse.json({ success: true, data: { revoked: true } });
  } catch (err) {
    if (err instanceof TeamError) {
      const status = err.code === 'FORBIDDEN' ? 403 : err.code === 'NOT_FOUND' ? 404 : 400;
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status },
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to revoke invitation.', code: 'TEAM_ERROR' },
      { status: 500 },
    );
  }
}
