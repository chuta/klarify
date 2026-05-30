'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';

export interface PostHogIdentifyProps {
  userId: string;
  email?: string;
  plan?: string;
  orgId?: string;
  orgName?: string;
}

/**
 * Ties the current PostHog identity to the authenticated user and their
 * organisation. Rendered inside the dashboard shell (server component passes
 * the props). Group analytics are keyed on `organisation` so retention and
 * revenue can be measured per company, not just per person.
 *
 * No PII beyond email is sent; never include compliance data here.
 */
export function PostHogIdentify({
  userId,
  email,
  plan,
  orgId,
  orgName,
}: PostHogIdentifyProps): null {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || !userId) return;

    posthog.identify(userId, {
      ...(email ? { email } : {}),
      ...(plan ? { plan } : {}),
    });

    if (orgId) {
      posthog.group('organisation', orgId, {
        ...(orgName ? { name: orgName } : {}),
        ...(plan ? { plan } : {}),
      });
    }
  }, [userId, email, plan, orgId, orgName]);

  return null;
}
