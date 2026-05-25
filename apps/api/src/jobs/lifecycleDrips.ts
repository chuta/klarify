// =============================================================================
// lifecycleDrips.ts — Daily onboarding nurture cron (09:00 Lagos time)
// =============================================================================

import { runLifecycleDrips } from '../services/lifecycleDripService.js';

/** Lagos wall-clock helper — shared pattern with deadlineAlerts.ts */
function lagosNow(): { hour: number; minute: number } {
  const lagosOffset = 60;
  const now = new Date(Date.now() + lagosOffset * 60 * 1000);
  return {
    hour:   now.getUTCHours(),
    minute: now.getUTCMinutes(),
  };
}

let _lifecycleDripsFiredToday = false;
let _lastFiredDate = '';

export async function runLifecycleDripsJob(): Promise<void> {
  console.warn('[cron/lifecycleDrips] running at', new Date().toISOString());
  const result = await runLifecycleDrips();
  console.warn('[cron/lifecycleDrips] done', result);
}

/**
 * Poll every minute; fire lifecycle drips once per day at 09:00 Lagos time.
 * Mount alongside scheduleJobs() from deadlineAlerts.ts in index.ts.
 */
export function scheduleLifecycleDrips(): void {
  setInterval(() => {
    const { hour, minute } = lagosNow();
    const todayStr = new Date().toISOString().slice(0, 10);

    if (todayStr !== _lastFiredDate) {
      _lifecycleDripsFiredToday = false;
      _lastFiredDate = todayStr;
    }

    if (hour === 9 && minute < 5 && !_lifecycleDripsFiredToday) {
      _lifecycleDripsFiredToday = true;
      void runLifecycleDripsJob().catch((err: unknown) =>
        console.error('[cron] lifecycle drips error', err),
      );
    }
  }, 60_000);

  console.warn('[cron] lifecycle drips scheduled — 09:00 Lagos daily');
}
