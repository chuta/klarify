// =============================================================================
// deadlineAlerts.ts — Daily compliance deadline cron + Monday weekly digest
// (Sprint 5-D2)
//
// Two jobs run on the server:
//
//   runDeadlineAlerts()  — every day at 08:00 Lagos time (UTC+1 = UTC+01:00)
//     Queries compliance_events where due_date is 1, 7, or 14 days away and
//     is_complete = false. Sends a DeadlineReminder email to each org member
//     who has opted in.
//
//   runWeeklyDigest()    — every Monday at 08:00 Lagos time
//     Builds a per-org compliance digest (score, tasks due, upcoming events)
//     and sends it to opted-in org members.
//
// Scheduler: simple setInterval loops that check wall-clock time every minute.
// No BullMQ or external scheduler needed for V1 — upgrade path is documented
// in CLAUDE.md §17 Sprint 3 note.
// =============================================================================

import { prisma } from '../db.js';
import { sendDeadlineAlert, sendWeeklyDigest } from '../services/emailService.js';

// ---------------------------------------------------------------------------
// Time helpers — all times are UTC internally; we convert to Lagos (UTC+1)
// for schedule checks.
// ---------------------------------------------------------------------------

/** Returns the current hour and day-of-week in Lagos (UTC+1) time. */
function lagosNow(): { hour: number; minute: number; day: number } {
  const lagosOffset = 60; // UTC+1 in minutes
  const now = new Date(Date.now() + lagosOffset * 60 * 1000);
  return {
    hour:   now.getUTCHours(),
    minute: now.getUTCMinutes(),
    day:    now.getUTCDay(), // 0=Sun, 1=Mon, …, 6=Sat
  };
}

/** ISO date string (YYYY-MM-DD) for a UTC date N days from today. */
function daysFromNow(n: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function nextDayEnd(d: Date): Date {
  const end = new Date(d);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-NG', {
    day:   'numeric',
    month: 'long',
    year:  'numeric',
  });
}

// ---------------------------------------------------------------------------
// runDeadlineAlerts
// ---------------------------------------------------------------------------

export async function runDeadlineAlerts(): Promise<void> {
  console.warn('[cron/deadlineAlerts] running at', new Date().toISOString());

  const targetOffsets = [1, 7, 14];

  for (const offset of targetOffsets) {
    const dayStart = daysFromNow(offset);
    const dayEnd   = nextDayEnd(dayStart);

    const events = await prisma.complianceEvent.findMany({
      where: {
        dueDate:    { gte: dayStart, lte: dayEnd },
        isComplete: false,
      },
      include: {
        org: {
          include: {
            members: {
              include: { user: { select: { id: true, email: true, name: true } } },
            },
          },
        },
      },
    });

    for (const event of events) {
      for (const member of event.org.members) {
        await sendDeadlineAlert({
          userId:           member.user.id,
          to:               member.user.email,
          name:             member.user.name ?? member.user.email,
          eventTitle:       event.title,
          eventDescription: event.description ?? event.title,
          dueDate:          formatDate(event.dueDate),
          daysRemaining:    offset,
          regulatorCode:    undefined,
          idempotencyKey:   `deadline:${event.id}:${offset}d`,
        });
      }
    }
  }

  console.warn('[cron/deadlineAlerts] done');
}

// ---------------------------------------------------------------------------
// runWeeklyDigest
// ---------------------------------------------------------------------------

export async function runWeeklyDigest(): Promise<void> {
  console.warn('[cron/weeklyDigest] running at', new Date().toISOString());

  // Fetch all orgs that have at least one member.
  const orgs = await prisma.organisation.findMany({
    include: {
      members: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
      readinessScores: {
        orderBy: { calculatedAt: 'desc' },
        take:    2,
      },
    },
  });

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekEnd = new Date();

  const weekStartStr = formatDate(weekStart);
  const weekEndStr   = formatDate(weekEnd);

  for (const org of orgs) {
    if (org.members.length === 0) continue;

    const latestScore  = org.readinessScores[0]?.totalScore ?? 0;
    const previousScore = org.readinessScores[1]?.totalScore ?? latestScore;
    const scoreDelta   = latestScore - previousScore;

    // Tasks completed this week.
    const tasksCompleted = await prisma.roadmapTask.count({
      where: {
        orgId:       org.id,
        status:      'complete',
        completedAt: { gte: weekStart },
      },
    });

    // Skip if nothing happened this week and score hasn't changed.
    if (tasksCompleted === 0 && scoreDelta === 0) continue;

    // Upcoming deadlines in the next 14 days.
    const upcoming = await prisma.complianceEvent.findMany({
      where: {
        orgId:      org.id,
        isComplete: false,
        dueDate:    { gte: new Date(), lte: daysFromNow(14) },
      },
      orderBy: { dueDate: 'asc' },
      take:    5,
    });

    const upcomingDeadlines = upcoming.map((e) => ({
      title:         e.title,
      dueDate:       formatDate(e.dueDate),
      daysRemaining: Math.ceil(
        (e.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      ),
    }));

    for (const member of org.members) {
      await sendWeeklyDigest({
        userId:           member.user.id,
        to:               member.user.email,
        name:             member.user.name ?? member.user.email,
        organisationName: org.name,
        score:            latestScore,
        scoreDelta,
        tasksCompleted,
        upcomingDeadlines,
        newRegulatoryUpdates: [],
        weekStart:        weekStartStr,
        weekEnd:          weekEndStr,
        idempotencyKey:   `weekly_digest:${org.id}:${weekEndStr}`,
      });
    }
  }

  console.warn('[cron/weeklyDigest] done');
}

// ---------------------------------------------------------------------------
// Scheduler — checks wall clock every minute, fires jobs at the right time
// ---------------------------------------------------------------------------

let _deadlineAlertsFiredToday = false;
let _weeklyDigestFiredThisWeek = false;
let _lastFiredDate = '';
let _lastFiredWeek = '';

/**
 * Start the background cron scheduler.
 * - Deadline alerts: every day at 08:00 Lagos time.
 * - Weekly digest:   every Monday at 08:00 Lagos time.
 *
 * Uses setInterval polling every 60s (low overhead, accurate to ±60s).
 * In production on Fly.io, only one instance should run the scheduler —
 * idempotency keys on the emails prevent double-sends if this ever changes.
 */
export function scheduleJobs(): void {
  setInterval(() => {
    const { hour, minute, day } = lagosNow();

    // We use a date string to reset the "fired today" guard daily.
    const todayStr = new Date().toISOString().slice(0, 10);
    if (todayStr !== _lastFiredDate) {
      _deadlineAlertsFiredToday = false;
      _lastFiredDate = todayStr;
    }

    const weekStr = `${todayStr}-${day}`;
    if (weekStr !== _lastFiredWeek) {
      _weeklyDigestFiredThisWeek = false;
      _lastFiredWeek = weekStr;
    }

    if (hour === 8 && minute < 5) {
      if (!_deadlineAlertsFiredToday) {
        _deadlineAlertsFiredToday = true;
        void runDeadlineAlerts().catch((err: unknown) =>
          console.error('[cron] deadline alerts error', err),
        );
      }

      // Monday = 1
      if (day === 1 && !_weeklyDigestFiredThisWeek) {
        _weeklyDigestFiredThisWeek = true;
        void runWeeklyDigest().catch((err: unknown) =>
          console.error('[cron] weekly digest error', err),
        );
      }
    }
  }, 60_000);

  console.warn('[cron] scheduler started — deadline alerts 08:00 Lagos daily, weekly digest 08:00 Lagos Mondays');
}
