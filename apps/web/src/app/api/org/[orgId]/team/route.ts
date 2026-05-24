import { NextResponse } from 'next/server';
import { createOrgInviteSchema } from '@klarify/core';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';
import { createTeamInvite, getTeamOverview, TeamError } from '@/lib/teamService';

function handleTeamError(err: unknown): NextResponse {
  if (err instanceof TeamError) {
    const status =
      err.code === 'FORBIDDEN' ? 403
      : err.code === 'NOT_FOUND' ? 404
      : err.code === 'ALREADY_MEMBER' || err.code === 'ALREADY_INVITED' ? 409
      : err.code === 'EMAIL_DELIVERY_FAILED' ? 503
      : 402;
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        code: err.code,
        upgradeUrl: err.upgradeUrl,
      },
      { status },
    );
  }
  console.error('[team API]', err);
  return NextResponse.json(
    { success: false, error: 'Something went wrong.', code: 'TEAM_ERROR' },
    { status: 500 },
  );
}

export async function GET(
  _request: Request,
  { params }: { params: { orgId: string } },
): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(_request);
  if (!auth) return unauthenticated();

  try {
    const data = await getTeamOverview(params.orgId, auth.userId);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleTeamError(err);
  }
}

export async function POST(
  request: Request,
  { params }: { params: { orgId: string } },
): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();

  const raw: unknown = await request.json().catch(() => null);
  const parsed = createOrgInviteSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input.', code: 'VALIDATION_ERROR' },
      { status: 422 },
    );
  }

  try {
    const data = await createTeamInvite({
      orgId: params.orgId,
      inviterUserId: auth.userId,
      email: parsed.data.email,
      role: parsed.data.role,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    return handleTeamError(err);
  }
}
