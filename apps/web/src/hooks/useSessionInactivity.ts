'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  SESSION_ACTIVITY_THROTTLE_MS,
  SESSION_IDLE_CHANNEL,
  SESSION_IDLE_MS,
  SESSION_WARNING_SECONDS,
  type SessionIdleMessage,
} from '@/lib/session-inactivity/constants';
import { isIdleExpired, nextWarningTick } from '@/lib/session-inactivity/logic';

export interface UseSessionInactivityResult {
  warningOpen: boolean;
  secondsRemaining: number;
  isExtending: boolean;
  staySignedIn: () => Promise<void>;
}

function submitSignOut(): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = '/auth/sign-out';
  document.body.appendChild(form);
  form.submit();
}

/**
 * Tracks dashboard inactivity. After 30 minutes idle, opens a warning with a
 * 30-second countdown. User must click "Stay signed in" to refresh the session
 * or they are signed out automatically.
 */
export function useSessionInactivity(): UseSessionInactivityResult {
  const [warningOpen, setWarningOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(SESSION_WARNING_SECONDS);
  const [isExtending, setIsExtending] = useState(false);

  const lastActivityRef = useRef(Date.now());
  const warningOpenRef = useRef(false);
  const lastThrottleRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const loggingOutRef = useRef(false);

  const broadcast = useCallback((message: SessionIdleMessage) => {
    channelRef.current?.postMessage(message);
  }, []);

  const recordActivity = useCallback((at = Date.now(), notifyPeers = true) => {
    if (warningOpenRef.current) return;
    lastActivityRef.current = at;
    if (notifyPeers) broadcast({ type: 'activity', at });
  }, [broadcast]);

  const openWarning = useCallback((at = Date.now()) => {
    if (warningOpenRef.current) return;
    warningOpenRef.current = true;
    setWarningOpen(true);
    setSecondsRemaining(SESSION_WARNING_SECONDS);
    broadcast({ type: 'warning', at });
  }, [broadcast]);

  const resetSession = useCallback(async () => {
    setIsExtending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.getSession();
      if (error) {
        submitSignOut();
        return;
      }
      const now = Date.now();
      lastActivityRef.current = now;
      warningOpenRef.current = false;
      setWarningOpen(false);
      setSecondsRemaining(SESSION_WARNING_SECONDS);
      broadcast({ type: 'extend', at: now });
    } finally {
      setIsExtending(false);
    }
  }, [broadcast]);

  const logout = useCallback(() => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    broadcast({ type: 'logout', at: Date.now() });
    submitSignOut();
  }, [broadcast]);

  // Throttled activity listeners — ignored while the warning modal is open.
  useEffect(() => {
    const onActivity = () => {
      const now = Date.now();
      if (now - lastThrottleRef.current < SESSION_ACTIVITY_THROTTLE_MS) return;
      lastThrottleRef.current = now;
      recordActivity(now);
    };

    const events: (keyof WindowEventMap)[] = [
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'click',
    ];

    for (const event of events) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    return () => {
      for (const event of events) {
        window.removeEventListener(event, onActivity);
      }
    };
  }, [recordActivity]);

  // Idle detection + 1-second warning countdown.
  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();

      if (warningOpenRef.current) {
        setSecondsRemaining((prev) => {
          const next = nextWarningTick(prev);
          if (next === null) {
            logout();
            return 0;
          }
          return next;
        });
        return;
      }

      if (isIdleExpired(lastActivityRef.current, now, SESSION_IDLE_MS)) {
        openWarning(now);
      }
    }, 1_000);

    return () => window.clearInterval(interval);
  }, [logout, openWarning]);

  // Re-check immediately when the tab becomes visible again.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (!warningOpenRef.current && isIdleExpired(lastActivityRef.current, now, SESSION_IDLE_MS)) {
        openWarning(now);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [openWarning]);

  // Cross-tab sync so every open dashboard tab shows the same warning.
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;

    const channel = new BroadcastChannel(SESSION_IDLE_CHANNEL);
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent<SessionIdleMessage>) => {
      const msg = event.data;
      if (!msg?.type) return;

      switch (msg.type) {
        case 'activity':
          if (!warningOpenRef.current) lastActivityRef.current = msg.at;
          break;
        case 'warning':
          warningOpenRef.current = true;
          setWarningOpen(true);
          setSecondsRemaining(SESSION_WARNING_SECONDS);
          break;
        case 'extend':
          lastActivityRef.current = msg.at;
          warningOpenRef.current = false;
          setWarningOpen(false);
          setSecondsRemaining(SESSION_WARNING_SECONDS);
          break;
        case 'logout':
          submitSignOut();
          break;
        default:
          break;
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, []);

  useEffect(() => {
    warningOpenRef.current = warningOpen;
  }, [warningOpen]);

  return {
    warningOpen,
    secondsRemaining,
    isExtending,
    staySignedIn: resetSession,
  };
}
