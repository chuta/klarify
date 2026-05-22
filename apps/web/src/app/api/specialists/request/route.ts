import { NextResponse } from 'next/server';
import {
  getSpecialistById,
  specialistRequestSchema,
  SPECIALIST_TOPIC_LABELS,
  type SpecialistRequestInput,
  type SpecialistTopic,
} from '@klarify/core';
import { PLAN_LIMITS, type Plan } from '@klarify/core';
import { sendSpecialistRequestEmail, COMPANY } from '@klarify/email';
import { prisma } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';

function buildContextSummary(context: SpecialistRequestInput['context']): string | undefined {
  if (!context) return undefined;
  const lines: string[] = [];
  if (context.orgName) lines.push(`Organisation: ${context.orgName}`);
  if (context.productTypes?.length) {
    lines.push(`Product types: ${context.productTypes.join(', ')}`);
  }
  if (context.regulatorCode) lines.push(`Regulator: ${context.regulatorCode}`);
  if (context.urgencyLevel) lines.push(`Document urgency: ${context.urgencyLevel}`);
  if (context.documentFilename) lines.push(`Document: ${context.documentFilename}`);
  if (context.documentId) lines.push(`Document ID: ${context.documentId}`);
  if (context.conversationId) lines.push(`Conversation ID: ${context.conversationId}`);
  if (context.lastUserMessage) lines.push(`Last user question: ${context.lastUserMessage}`);
  return lines.length > 0 ? lines.join('\n') : undefined;
}

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.', code: 'VALIDATION_ERROR' },
      { status: 422 },
    );
  }

  const parsed = specialistRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? 'Invalid request body.';
    return NextResponse.json(
      { success: false, error: first, code: 'VALIDATION_ERROR' },
      { status: 422 },
    );
  }

  const membership = await prisma.orgMember.findFirst({
    where: { userId: auth.userId },
    orderBy: { createdAt: 'asc' },
    select: { org: { select: { plan: true, name: true } } },
  });

  const plan = (membership?.org.plan ?? 'free') as Plan;
  const humanEscalation = PLAN_LIMITS[plan].human_escalation;
  if (!humanEscalation) {
    return NextResponse.json(
      {
        success: false,
        error: 'Human escalation requires the Compass plan or higher.',
        code: 'PLAN_LIMIT_REACHED',
        details: {
          feature: 'human_escalation',
          currentPlan: plan,
          requiredPlan: 'compass',
          upgradeUrl: '/dashboard/billing?plan=compass',
        },
      },
      { status: 402 },
    );
  }

  const body = parsed.data;
  const preferred = body.preferredSpecialistId
    ? getSpecialistById(body.preferredSpecialistId)
    : undefined;

  const topicLabel = SPECIALIST_TOPIC_LABELS[body.topic as SpecialistTopic];

  try {
    const result = await sendSpecialistRequestEmail({
      to: COMPANY.supportEmail,
      replyTo: body.email,
      name: body.name,
      email: body.email,
      company: body.company,
      phone: body.phone,
      topic: body.topic,
      urgency: body.urgency,
      message: body.message,
      currentPlan: plan,
      source: body.source,
      preferredSpecialistId: preferred?.id,
      preferredSpecialistName: preferred?.name,
      contextSummary: buildContextSummary(body.context),
    });

    if (!result.success) {
      console.error('[specialists/request] send failed:', result.error);
      return NextResponse.json(
        {
          success: false,
          error:
            'We could not send your request right now. Please try again or email hello@klarify.africa directly.',
          code: 'EMAIL_FAILED',
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        sent: true,
        topicLabel,
        sla: body.urgency === 'critical' ? '24 hours' : '2 business days',
      },
    });
  } catch (err) {
    console.error('[specialists/request]', err);
    return NextResponse.json(
      {
        success: false,
        error: 'We could not send your request right now. Please try again.',
        code: 'EMAIL_FAILED',
      },
      { status: 503 },
    );
  }
}
