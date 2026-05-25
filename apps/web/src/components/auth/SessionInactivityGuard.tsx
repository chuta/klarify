'use client';

import { SessionInactivityModal } from './SessionInactivityModal';
import { useSessionInactivity } from '@/hooks/useSessionInactivity';

/**
 * Dashboard-only idle session guard. Mount once in the dashboard layout.
 */
export function SessionInactivityGuard(): JSX.Element {
  const { warningOpen, secondsRemaining, isExtending, staySignedIn } = useSessionInactivity();

  return (
    <SessionInactivityModal
      open={warningOpen}
      secondsRemaining={secondsRemaining}
      isExtending={isExtending}
      onStaySignedIn={staySignedIn}
    />
  );
}
