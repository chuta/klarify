import { NextResponse } from 'next/server';
import { flagshipEnquirySchema } from '@klarify/core';
import { sendFlagshipEnquiryEmail, COMPANY } from '@klarify/email';
import { prisma } from '@/lib/db';
import { authenticateRouteHandler } from '@/lib/route-auth';

export async function POST(request: Request): Promise<NextResponse> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.', code: 'VALIDATION_ERROR' },
      { status: 422 },
    );
  }

  const parsed = flagshipEnquirySchema.safeParse(rawBody);
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? 'Invalid request body.';
    return NextResponse.json(
      { success: false, error: first, code: 'VALIDATION_ERROR' },
      { status: 422 },
    );
  }

  let currentPlan: string | undefined;
  const auth = await authenticateRouteHandler(request);
  if (auth) {
    const membership = await prisma.orgMember.findFirst({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'asc' },
      select: { org: { select: { plan: true } } },
    });
    currentPlan = membership?.org.plan;
  }

  const { name, email, company, phone, message, source } = parsed.data;

  try {
    const result = await sendFlagshipEnquiryEmail({
      to: COMPANY.supportEmail,
      replyTo: email,
      name,
      email,
      company,
      phone,
      message,
      source,
      currentPlan,
    });

    if (!result.success) {
      console.error('[flagship-enquiry] send failed:', result.error);
      return NextResponse.json(
        {
          success: false,
          error:
            'We could not send your enquiry right now. Please try again or email hello@klarify.africa directly.',
          code: 'EMAIL_FAILED',
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ success: true, data: { sent: true } });
  } catch (err) {
    console.error('[flagship-enquiry]', err);
    return NextResponse.json(
      {
        success: false,
        error: 'We could not send your enquiry right now. Please try again.',
        code: 'EMAIL_FAILED',
      },
      { status: 503 },
    );
  }
}
