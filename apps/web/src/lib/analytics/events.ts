import posthog from 'posthog-js';

/**
 * Typed client-side event helper for Klarify's funnel + monetization schema.
 *
 * Import only from client components. Each event has a fixed property shape so
 * the PostHog funnels stay consistent and analysts aren't guessing at keys.
 * Never put compliance content (letter text, document bodies, chat) in
 * properties — only identifiers, categories, and counts.
 */
export interface KlarifyEventMap {
  // Activation
  signup_completed: { method: 'email' | 'magic_link' | 'google' };
  onboarding_completed: {
    persona?: string;
    stage?: string;
    markets?: string[];
    product_types?: string[];
  };
  classification_run: { primary_category?: string; risk?: string };
  document_analysed: { urgency?: string };
  roadmap_task_completed: { phase?: number; task_id?: string };
  readiness_score_viewed: { score?: number };
  readiness_reassessment_completed: { score?: number; infrastructure_count?: number };

  // The Post-Letter wedge (highest-converting path)
  letter_uploaded: { source: 'upload' | 'paste' };
  analysis_viewed: { urgency?: string; document_id?: string };
  draft_exported: { document_id?: string };
  specialist_requested: { reason?: string };

  // Monetization
  paywall_hit: { feature: string; required_plan: string };
  upgrade_clicked: { from_plan?: string; to_plan?: string };
  checkout_started: { plan: string; billing_cycle: 'monthly' | 'annual' };

  // Usage limits
  ai_query_made: { surface: 'chat' | 'classify' | 'scenario' | 'jurisdiction'; remaining?: number };
}

export function track<E extends keyof KlarifyEventMap>(
  event: E,
  properties: KlarifyEventMap[E],
): void {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  posthog.capture(event, properties);
}

/** Reset identity on sign-out so the next user doesn't inherit the session. */
export function resetAnalytics(): void {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  posthog.reset();
}

// ---------------------------------------------------------------------------
// Consent — product analytics opt-in/out.
//
// PostHog persists the opt-out flag itself (localStorage) and respects it on
// every subsequent init, so this is the single source of truth — no DB or
// server round-trip required. Opting out disables BOTH event capture and
// session replay. Default is opted-in (capturing on).
// ---------------------------------------------------------------------------

/** True when a PostHog project token is present (analytics is wired at all). */
export function isAnalyticsConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
}

/** Current consent state. Defaults to true (opted in) when never chosen. */
export function isAnalyticsEnabled(): boolean {
  if (typeof window === 'undefined' || !isAnalyticsConfigured()) return false;
  try {
    return !posthog.has_opted_out_capturing();
  } catch {
    return false;
  }
}

/**
 * Set consent. Opting in resumes capture (and replay on the next non-sensitive
 * navigation); opting out stops capture and session recording immediately.
 */
export function setAnalyticsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined' || !isAnalyticsConfigured()) return;
  try {
    if (enabled) {
      posthog.opt_in_capturing();
    } else {
      posthog.opt_out_capturing();
      posthog.stopSessionRecording();
    }
  } catch {
    // Non-fatal — analytics is best-effort and must never break the UI.
  }
}
