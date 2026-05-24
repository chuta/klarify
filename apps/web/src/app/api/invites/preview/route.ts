import { NextResponse } from 'next/server';
import { previewInvite } from '@/lib/teamService';

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Invitation token is required.', code: 'VALIDATION_ERROR' },
      { status: 422 },
    );
  }

  const data = await previewInvite(token);
  if (!data) {
    return NextResponse.json(
      { success: false, error: 'This invitation link is invalid.', code: 'NOT_FOUND' },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, data });
}
