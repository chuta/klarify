/** Idle time before the re-login warning appears (30 minutes). */
export const SESSION_IDLE_MS = 30 * 60 * 1000;

/** Countdown seconds before automatic sign-out once the warning is shown. */
export const SESSION_WARNING_SECONDS = 30;

/** Throttle high-frequency pointer events when recording activity. */
export const SESSION_ACTIVITY_THROTTLE_MS = 1_000;

export const SESSION_IDLE_CHANNEL = 'klarify-session-idle';

export type SessionIdleMessage =
  | { type: 'activity'; at: number }
  | { type: 'warning'; at: number }
  | { type: 'extend'; at: number }
  | { type: 'logout'; at: number };
