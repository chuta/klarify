import { isIdleExpired, initialWarningCountdown, nextWarningTick } from '../../lib/session-inactivity/logic';
import { SESSION_IDLE_MS, SESSION_WARNING_SECONDS } from '../../lib/session-inactivity/constants';

describe('session inactivity logic', () => {
  it('isIdleExpired after 30 minutes', () => {
    const start = 1_000_000;
    expect(isIdleExpired(start, start + SESSION_IDLE_MS - 1)).toBe(false);
    expect(isIdleExpired(start, start + SESSION_IDLE_MS)).toBe(true);
  });

  it('countdown starts at 30 and ends at logout signal', () => {
    expect(initialWarningCountdown()).toBe(SESSION_WARNING_SECONDS);
    expect(nextWarningTick(2)).toBe(1);
    expect(nextWarningTick(1)).toBeNull();
  });
});
