import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma, resolveOrgId, withRls } from '@/lib/db';
import { serializeCalendarEvent, type CalendarEventDTO } from '@/lib/calendar';
import { ComplianceCalendarClient } from '@/components/calendar/ComplianceCalendarClient';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';

/**
 * /dashboard/calendar — Compliance Calendar
 *
 * Live view of org compliance_events: AIP auto-populated deadlines (from ARIP
 * Tracker), custom reminders, and mark-complete tracking. Email alerts at
 * 14 / 7 / 1 days are handled by the Fly.io deadlineAlerts cron (S5-D2).
 */
export default async function CalendarPage(): Promise<JSX.Element> {
  const supabase = createClient();
  const [userRes, sessionRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ]);

  const user = userRes.data.user;
  const session = sessionRes.data.session;
  if (userRes.error || !user || !session) redirect('/sign-in');

  const orgId = await resolveOrgId(user.id);
  let initialEvents: CalendarEventDTO[] = [];

  if (orgId) {
    const rows = await withRls({ userId: user.id, orgId }, (tx) =>
      tx.complianceEvent.findMany({
        where: { orgId },
        orderBy: [{ isComplete: 'asc' }, { dueDate: 'asc' }],
        take: 500,
      }),
    );
    initialEvents = rows.map(serializeCalendarEvent);
  }

  return (
    <DashboardPageShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">Compliance Calendar</h1>
        <p className="mt-1 text-sm text-[#555555]">
          Never miss a regulatory deadline. Automated email alerts at 14 days, 7 days, and 24 hours
          before every filing obligation.
        </p>
      </div>

      <ComplianceCalendarClient
        initialEvents={initialEvents}
        accessToken={session.access_token}
      />
    </DashboardPageShell>
  );
}
