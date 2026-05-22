// Next.js Route Handler — /api/regulators/interactions/export
// GET: CSV download of all org interactions

import { NextResponse } from 'next/server';
import { prisma, resolveOrgId, withRls } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';

async function checkCrmAccess(userId: string): Promise<boolean> {
  const memberships = await prisma.orgMember.findMany({
    where: { userId },
    include: { org: { select: { plan: true } } },
  });
  const planRank: Record<string, number> = { free: 0, navigator: 1, compass: 2, flagship: 3 };
  const best = memberships.reduce((acc, m) => {
    const r = planRank[m.org.plan ?? 'free'] ?? 0;
    return r > acc ? r : acc;
  }, 0);
  return best >= 2;
}

function csvEscape(val: string): string {
  if (/[",\n\r]/.test(val)) return `"${val.replace(/"/g, '""')}"`;
  return val;
}

export async function GET(request: Request): Promise<Response> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) {
    return new Response(JSON.stringify({ success: false, error: 'Authentication required.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const { userId } = auth;

  const hasCrm = await checkCrmAccess(userId);
  if (!hasCrm) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'This feature requires the compass plan or higher.',
        code: 'PLAN_LIMIT_REACHED',
      }),
      { status: 402, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const orgId = await resolveOrgId(userId);
    if (!orgId) {
      return new Response('No interactions found.', { status: 404 });
    }

    const interactions = await withRls({ userId, orgId }, (tx) =>
      tx.regulatorInteraction.findMany({
        where: { orgId },
        orderBy: { occurredAt: 'desc' },
        take: 5000,
      }),
    );

    const rows = [
      ['Date', 'Regulator', 'Type', 'Subject', 'Outcome', 'Follow-up Required', 'Follow-up Date', 'Completed'],
      ...interactions.map((i) => [
        i.occurredAt.toISOString().slice(0, 10),
        i.regulatorCode,
        i.interactionType,
        csvEscape(i.subject),
        csvEscape(i.outcome ?? ''),
        i.followUpRequired ? 'Yes' : 'No',
        i.followUpDate ? new Date(i.followUpDate).toISOString().slice(0, 10) : '',
        i.isComplete ? 'Yes' : 'No',
      ]),
    ];

    const csv = rows.map((r) => r.join(',')).join('\n');

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="klarify-regulator-interactions.csv"',
      },
    });
  } catch (err) {
    console.error('[api/regulators/interactions/export]', err);
    return new Response('Export failed.', { status: 500 });
  }
}
