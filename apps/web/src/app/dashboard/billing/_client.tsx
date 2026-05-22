'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Plan } from '@klarify/core';
import { PLAN_LIMITS } from '@klarify/core';

// ---------------------------------------------------------------------------
// Korapay types
// ---------------------------------------------------------------------------

interface KorapayOptions {
  key: string;
  reference: string;
  amount: number;
  currency: string;
  customer: { name: string; email: string };
  channels?: string[];
  merchant_bears_cost?: boolean;
  onSuccess: (data: unknown) => void;
  onFailed: (data: unknown) => void;
  onClose: () => void;
}

declare global {
  interface Window {
    Korapay?: {
      initialize: (opts: KorapayOptions) => void;
    };
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubscriptionStatusData {
  plan: Plan;
  status: string;
  billingCycle: string | null;
  currentPeriodEnd: string | null;
  seatsUsed: number;
  pricing: Record<string, { monthly: number; annual: number }>;
}

interface BillingClientProps {
  initial: SubscriptionStatusData;
  userEmail: string;
  userName: string;
  accessToken: string;
  apiBaseUrl: string;
  initialPlan?: string | null;
}

const PLAN_NAMES: Record<string, string> = {
  free: 'Free',
  navigator: 'Navigator',
  compass: 'Compass',
  flagship: 'Flagship',
};

const PLAN_RANK: Record<string, number> = {
  free: 0, navigator: 1, compass: 2, flagship: 3,
};

// ---------------------------------------------------------------------------
// Dynamic Korapay script loader
// ---------------------------------------------------------------------------

function useKorapayScript() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.Korapay) {
      setLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src =
      'https://korablobstorage.blob.core.windows.net/modal-bucket/korapay-collections.min.js';
    script.async = true;
    script.onload = () => setLoaded(true);
    script.onerror = () => console.error('[korapay] failed to load script');
    document.body.appendChild(script);
  }, []);

  return loaded;
}

// ---------------------------------------------------------------------------
// BillingClient
// ---------------------------------------------------------------------------

export function BillingClient({
  initial,
  userEmail,
  userName,
  accessToken,
  apiBaseUrl,
  initialPlan,
}: BillingClientProps): JSX.Element {
  const router = useRouter();
  const korapayReady = useKorapayScript();

  const [status, setStatus] = useState(initial);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [isLoading, setIsLoading] = useState<string | null>(null); // 'subscribe' | 'cancel' | plan name
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  }, []);

  // Poll billing status until the plan changes (after Korapay onSuccess).
  const pollUntilPlanChanges = useCallback(
    async (expectedPlan: string) => {
      const maxAttempts = 15;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const res = await fetch(`${apiBaseUrl}/api/billing/status`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (res.ok) {
            const json = (await res.json()) as { success: boolean; data?: SubscriptionStatusData };
            if (json.success && json.data && json.data.plan === expectedPlan) {
              setStatus(json.data);
              setIsLoading(null);
              showToast('success', `Plan upgraded to ${PLAN_NAMES[expectedPlan] ?? expectedPlan}!`);
              router.refresh();
              return;
            }
          }
        } catch {
          // Non-fatal — keep polling.
        }
      }
      // Timed out — reload anyway.
      setIsLoading(null);
      router.refresh();
    },
    [accessToken, apiBaseUrl, router, showToast],
  );

  // Start a Korapay checkout.
  const startCheckout = useCallback(
    async (plan: 'navigator' | 'compass' | 'flagship', cycle: 'monthly' | 'annual') => {
      if (!korapayReady || !window.Korapay) {
        showToast('error', 'Payment service not ready. Please refresh and try again.');
        return;
      }

      const korapayPublicKey = process.env.NEXT_PUBLIC_KORAPAY_PUBLIC_KEY;
      if (!korapayPublicKey) {
        showToast('error', 'Payment configuration error. Contact support.');
        return;
      }

      setIsLoading(plan);

      try {
        const res = await fetch(`${apiBaseUrl}/api/billing/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ plan, billingCycle: cycle }),
        });
        const json = (await res.json()) as {
          success: boolean;
          data?: { reference: string; amount: number; currency: string };
          error?: string;
        };

        if (!json.success || !json.data) {
          setIsLoading(null);
          showToast('error', json.error ?? 'Could not create checkout. Try again.');
          return;
        }

        const { reference, amount } = json.data;

        window.Korapay.initialize({
          key: korapayPublicKey,
          reference,
          amount,
          currency: 'NGN',
          customer: { name: userName, email: userEmail },
          channels: ['bank_transfer', 'card'],
          merchant_bears_cost: true,
          onSuccess: () => {
            setIsLoading('activating');
            void pollUntilPlanChanges(plan);
          },
          onFailed: () => {
            setIsLoading(null);
            showToast('error', 'Payment failed. Please try again or use a different card.');
          },
          onClose: () => {
            setIsLoading(null);
          },
        });
      } catch (err) {
        console.error('[billing] startCheckout error', err);
        setIsLoading(null);
        showToast('error', 'Something went wrong. Please try again.');
      }
    },
    [accessToken, billingCycle, korapayReady, pollUntilPlanChanges, showToast, userEmail, userName],
  );

  // Cancel subscription.
  const handleCancel = useCallback(async () => {
    setShowCancelModal(false);
    setIsLoading('cancel');
    try {
      const res = await fetch(`${apiBaseUrl}/api/billing/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (json.success) {
        showToast('success', 'Subscription cancelled. You retain access until period end.');
        const statusRes = await fetch(`${apiBaseUrl}/api/billing/status`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (statusRes.ok) {
          const statusJson = (await statusRes.json()) as { success: boolean; data?: SubscriptionStatusData };
          if (statusJson.success && statusJson.data) setStatus(statusJson.data);
        }
      } else {
        showToast('error', json.error ?? 'Failed to cancel subscription.');
      }
    } catch {
      showToast('error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(null);
    }
  }, [accessToken, showToast]);

  // `initialPlan` from URL search params (e.g. ?plan=compass) — pre-select
  // checkout if user landed from the pricing page. Triggered once on mount.
  useEffect(() => {
    if (!initialPlan || !['navigator', 'compass', 'flagship'].includes(initialPlan)) return;
    if (status.plan === initialPlan) return;
    // Slight delay so the page renders first.
    const t = setTimeout(() => {
      void startCheckout(initialPlan as 'navigator' | 'compass' | 'flagship', billingCycle);
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount.

  const currentPlanRank = PLAN_RANK[status.plan] ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Toast */}
      {toast && (
        <div
          className={[
            'fixed right-4 top-4 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all',
            toast.type === 'success'
              ? 'bg-[#1A7A4A] text-white'
              : 'bg-[#C0392B] text-white',
          ].join(' ')}
        >
          {toast.msg}
        </div>
      )}

      {/* Activating spinner */}
      {isLoading === 'activating' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="rounded-2xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#0B6E6E] border-t-transparent" />
            <p className="font-semibold text-[#1A1A1A]">Activating your plan…</p>
            <p className="mt-1 text-sm text-[#555]">This usually takes a few seconds.</p>
          </div>
        </div>
      )}

      {/* Cancel confirmation modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="mx-4 max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-semibold text-[#1A1A1A]">Cancel subscription?</h3>
            <p className="mb-6 text-sm text-[#555]">
              Your subscription will be cancelled but you keep access until{' '}
              <strong>
                {status.currentPeriodEnd
                  ? new Date(status.currentPeriodEnd).toLocaleDateString('en-NG', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })
                  : 'the end of your billing period'}
              </strong>
              . You can resubscribe at any time.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 rounded-lg border border-[#CCCCCC] py-2.5 text-sm font-semibold text-[#555] hover:bg-[#F5F5F5]"
              >
                Keep subscription
              </button>
              <button
                onClick={() => void handleCancel()}
                className="flex-1 rounded-lg bg-[#C0392B] py-2.5 text-sm font-semibold text-white hover:bg-[#a93226]"
              >
                Yes, cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Current Plan ── */}
      <section className="rounded-2xl border border-[#CCCCCC] bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-[#1A1A1A]">Current plan</h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <PlanBadge plan={status.plan} />
            <div>
              <p className="text-sm font-semibold text-[#1A1A1A]">
                {PLAN_NAMES[status.plan] ?? status.plan}
              </p>
              {status.billingCycle && (
                <p className="text-xs text-[#555]">
                  {status.billingCycle === 'annual' ? 'Annual billing' : 'Monthly billing'}
                </p>
              )}
            </div>
          </div>

          <StatusBadge status={status.status} />

          {status.currentPeriodEnd && (
            <p className="text-xs text-[#555]">
              {status.status === 'cancelled' ? 'Access until' : 'Next renewal'}:{' '}
              <strong>
                {new Date(status.currentPeriodEnd).toLocaleDateString('en-NG', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </strong>
            </p>
          )}

          {status.plan !== 'free' && status.status === 'active' && (
            <button
              onClick={() => setShowCancelModal(true)}
              disabled={isLoading !== null}
              className="ml-auto text-xs text-[#C0392B] underline hover:text-[#a93226] disabled:opacity-50"
            >
              Cancel subscription
            </button>
          )}
        </div>

        {status.seatsUsed > 0 && (
          <p className="mt-3 text-xs text-[#555]">
            Seats used: <strong>{status.seatsUsed}</strong> of{' '}
            <strong>
              {PLAN_LIMITS[status.plan].team_seats === Infinity
                ? 'unlimited'
                : PLAN_LIMITS[status.plan].team_seats}
            </strong>
          </p>
        )}
      </section>

      {/* ── Plans Grid ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1A1A1A]">
            {status.plan === 'free' ? 'Choose a plan' : 'Change plan'}
          </h2>
          {/* Monthly / Annual toggle */}
          <div className="flex items-center gap-2 rounded-lg border border-[#CCCCCC] p-0.5">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={[
                'rounded-md px-3 py-1.5 text-xs font-semibold transition',
                billingCycle === 'monthly'
                  ? 'bg-[#0B6E6E] text-white'
                  : 'text-[#555] hover:text-[#0B6E6E]',
              ].join(' ')}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={[
                'rounded-md px-3 py-1.5 text-xs font-semibold transition',
                billingCycle === 'annual'
                  ? 'bg-[#0B6E6E] text-white'
                  : 'text-[#555] hover:text-[#0B6E6E]',
              ].join(' ')}
            >
              Annual <span className="ml-0.5 rounded-full bg-[#1A7A4A] px-1.5 py-0.5 text-[9px] text-white">-20%</span>
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {(['navigator', 'compass', 'flagship'] as const).map((plan) => {
            const pricing = status.pricing[plan];
            const amount = pricing ? pricing[billingCycle] : 0;
            const isCurrent = status.plan === plan;
            const isHigher = (PLAN_RANK[plan] ?? 0) > currentPlanRank;
            const isCompass = plan === 'compass';

            return (
              <div
                key={plan}
                className={[
                  'relative rounded-2xl border-2 p-5',
                  isCompass
                    ? 'border-[#0B6E6E] bg-[#0D2B45]'
                    : isCurrent
                    ? 'border-[#D4A843] bg-[#FDF6E3]'
                    : 'border-[#CCCCCC] bg-white',
                ].join(' ')}
              >
                {isCompass && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#0B6E6E] px-3 py-0.5 text-[10px] font-bold text-white">
                    Most popular
                  </span>
                )}
                {isCurrent && !isCompass && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#D4A843] px-3 py-0.5 text-[10px] font-bold text-white">
                    Current plan
                  </span>
                )}

                <p
                  className={[
                    'mb-1 text-xs font-bold uppercase tracking-wide',
                    isCompass ? 'text-[#0B6E6E]' : 'text-[#555]',
                  ].join(' ')}
                >
                  {PLAN_NAMES[plan]}
                </p>
                <p className={['mb-3 text-2xl font-bold', isCompass ? 'text-white' : 'text-[#1A1A1A]'].join(' ')}>
                  ₦{(amount ?? 0).toLocaleString()}
                  <span className={['text-sm font-normal', isCompass ? 'text-white/60' : 'text-[#555]'].join(' ')}>
                    /{billingCycle === 'annual' ? 'yr' : 'mo'}
                  </span>
                </p>

                <PlanFeatureList plan={plan} isCompass={isCompass} />

                <div className="mt-4">
                  {plan === 'flagship' ? (
                    <a
                      href="mailto:hello@klarify.africa?subject=Flagship Plan Enquiry"
                      className="block w-full rounded-lg border border-[#D4A843] py-2.5 text-center text-sm font-semibold text-[#D4A843] hover:bg-[#D4A843]/10"
                    >
                      Contact us
                    </a>
                  ) : isCurrent ? (
                    <div className="rounded-lg border border-[#D4A843]/40 py-2.5 text-center text-sm font-semibold text-[#D4A843]">
                      Current plan
                    </div>
                  ) : isHigher ? (
                    <button
                      onClick={() => void startCheckout(plan as 'navigator' | 'compass', billingCycle)}
                      disabled={!korapayReady || isLoading !== null}
                      className={[
                        'w-full rounded-lg py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
                        isCompass
                          ? 'bg-[#0B6E6E] text-white hover:bg-[#0A5F5F]'
                          : 'border border-[#0B6E6E] text-[#0B6E6E] hover:bg-[#E6F4F4]',
                      ].join(' ')}
                    >
                      {isLoading === plan ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Processing…
                        </span>
                      ) : (
                        `Upgrade to ${PLAN_NAMES[plan]}`
                      )}
                    </button>
                  ) : (
                    <div className="rounded-lg border border-[#CCCCCC] py-2.5 text-center text-sm text-[#999]">
                      Lower plan
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-center text-xs text-[#999]">
          Prices in NGN. Payments processed securely via Korapay.{' '}
          <Link href="/pricing" className="underline hover:text-[#0B6E6E]">
            See full feature comparison →
          </Link>
        </p>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PlanBadge({ plan }: { plan: Plan }): JSX.Element {
  const cfg: Record<Plan, { bg: string; text: string }> = {
    free:      { bg: 'bg-[#F5F5F5]',   text: 'text-[#555]' },
    navigator: { bg: 'bg-[#E6F4F4]',   text: 'text-[#0B6E6E]' },
    compass:   { bg: 'bg-[#0D2B45]',   text: 'text-white' },
    flagship:  { bg: 'bg-[#FDF6E3]',   text: 'text-[#D4A843]' },
  };
  const { bg, text } = cfg[plan] ?? cfg.free;
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${bg} ${text}`}>
      {PLAN_NAMES[plan] ?? plan}
    </span>
  );
}

function StatusBadge({ status }: { status: string }): JSX.Element {
  const cfgMap = {
    active:    { bg: 'bg-[#E8F5EE]', text: 'text-[#1A7A4A]', label: 'Active' },
    cancelled: { bg: 'bg-[#FDF6E3]', text: 'text-[#D4A843]', label: 'Cancelled' },
    past_due:  { bg: 'bg-[#FCEAE8]', text: 'text-[#C0392B]', label: 'Past due' },
    pending:   { bg: 'bg-[#F5F5F5]', text: 'text-[#555]',    label: 'Pending' },
  } as const;
  const fallback = { bg: 'bg-[#E8F5EE]', text: 'text-[#1A7A4A]', label: 'Active' };
  const entry = cfgMap[status as keyof typeof cfgMap] ?? fallback;
  const { bg, text, label } = entry;
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${bg} ${text}`}>
      {label}
    </span>
  );
}

function PlanFeatureList({ plan, isCompass }: { plan: string; isCompass: boolean }): JSX.Element {
  const textCls = isCompass ? 'text-white/70' : 'text-[#555]';
  const features: Record<string, string[]> = {
    navigator: [
      '50 AI queries/month',
      'Nigeria jurisdiction',
      '5 document analyses',
      '3 document templates',
    ],
    compass: [
      'Unlimited AI queries',
      '2 jurisdictions',
      'Unlimited document analysis',
      'All 13 document templates',
      'ARIP tracker',
      'Regulator CRM',
      'Human escalation',
    ],
    flagship: [
      'Everything in Compass',
      'All 5 jurisdictions',
      'Unlimited team seats',
      'Priority escalation',
      'Full compliance export',
      'API access',
    ],
  };

  return (
    <ul className={`space-y-1.5 text-xs ${textCls}`}>
      {(features[plan] ?? []).map((f) => (
        <li key={f} className="flex items-start gap-1.5">
          <span className="mt-0.5 text-[#0B6E6E]">✓</span>
          {f}
        </li>
      ))}
    </ul>
  );
}
