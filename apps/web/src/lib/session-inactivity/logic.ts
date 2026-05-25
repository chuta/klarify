import { SESSION_IDLE_MS, SESSION_WARNING_SECONDS } from './constants';

export function isIdleExpired(lastActivityAt: number, now: number, idleMs = SESSION_IDLE_MS): boolean {
  return now - lastActivityAt >= idleMs;
}

export function initialWarningCountdown(seconds = SESSION_WARNING_SECONDS): number {
  return seconds;
}

export function nextWarningTick(currentSeconds: number): number | null {
  if (currentSeconds <= 1) return null;
  return currentSeconds - 1;
}
