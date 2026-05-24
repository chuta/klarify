'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Plan } from '@klarify/core';
import { PLAN_LIMITS } from '@klarify/core';
import { FlagshipContactButton } from '@/components/billing/FlagshipContactButton';
import {
  normalizeSubscriptionStatus,
  PLAN_PRICING_NGN,
  type SubscriptionStatusData,
} from '@/lib/billingStatus';

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

export type { SubscriptionStatusData };

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

  const [status, setStatus] = useState(() => normalizeSubscriptionStatus(initial));
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [isLoading, setIsLoading] = useState<string | null>(null); // 'subscribe' | 'cancel' | plan name
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    label: string;
    originalAmount: number;
    discountedAmount: number;
    plan: 'navigator' | 'compass' | 'flagship';
    billingCycle: 'monthly' | 'annual';
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponPlan, setCouponPlan] = useState<'navigator' | 'compass' | 'flagship'>('compass');

  useEffect(() => {
    setAppliedCoupon(null);
    setCouponError(null);
  }, [billingCycle, couponPlan]);

  const mergeStatus = useCallback(
    (data: Partial<SubscriptionStatusData> | undefined) => {
      setStatus((prev) => normalizeSubscriptionStatus(data, prev));
    },
    [],
  );

  // Refresh status from same-origin route on mount.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/billing/status', {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as { success: boolean; data?: SubscriptionStatusData };
        if (json.success && json.data && !cancelled) {
          mergeStatus(json.data);
        }
      } catch {
        // Non-fatal — keep SSR initial state.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, mergeStatus]);

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
          const res = await fetch('/api/billing/status', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (res.ok) {
            const json = (await res.json()) as { success: boolean; data?: SubscriptionStatusData };
            if (json.success && json.data && json.data.plan === expectedPlan) {
              mergeStatus(json.data);
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
    [accessToken, mergeStatus, router, showToast],
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

      const couponCode =
        appliedCoupon &&
        appliedCoupon.plan === plan &&
        appliedCoupon.billingCycle === cycle
          ? appliedCoupon.code
          : undefined;

      try {
        const res = await fetch(`${apiBaseUrl}/api/billing/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ plan, billingCycle: cycle, couponCode }),
        });
        const json = (await res.json()) as {
          success: boolean;
          data?: {
            reference: string;
            amount: number;
            originalAmount?: number;
            discountAmount?: number;
            couponLabel?: string;
            complimentary?: boolean;
          };
          error?: string;
        };

        if (!json.success || !json.data) {
          setIsLoading(null);
          showToast('error', json.error ?? 'Could not create checkout. Try again.');
          return;
        }

        const { reference, amount, complimentary } = json.data;

        if (complimentary || amount === 0) {
          setIsLoading('activating');
          showToast('success', 'Complimentary plan activated — no payment required.');
          void pollUntilPlanChanges(plan);
          return;
        }

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
    [accessToken, appliedCoupon, korapayReady, pollUntilPlanChanges, showToast, userEmail, userName],
  );

  const applyCoupon = useCallback(
    async (plan: 'navigator' | 'compass' | 'flagship') => {
      const code = couponInput.trim();
      if (code.length < 3) {
        setCouponError('Enter a coupon code.');
        return;
      }
      setValidatingCoupon(true);
      setCouponError(null);
      try {
        const res = await fetch(`${apiBaseUrl}/api/billing/validate-coupon`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ code, plan, billingCycle }),
        });
        const json = (await res.json()) as {
          success: boolean;
          data?: {
            code: string;
            discountLabel: string;
            originalAmount: number;
            discountedAmount: number;
          };
          error?: string;
        };
        if (!json.success || !json.data) {
          setAppliedCoupon(null);
          setCouponError(json.error ?? 'Invalid coupon code.');
          return;
        }
        setAppliedCoupon({
          code: json.data.code,
          label: json.data.discountLabel,
          originalAmount: json.data.originalAmount,
          discountedAmount: json.data.discountedAmount,
          plan,
          billingCycle,
        });
        showToast('success', `Coupon applied: ${json.data.discountLabel}`);
      } catch {
        setCouponError('Could not validate coupon. Try again.');
      } finally {
        setValidatingCoupon(false);
      }
    },
    [accessToken, apiBaseUrl, billingCycle, couponInput, showToast],
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
        const statusRes = await fetch('/api/billing/status', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (statusRes.ok) {
          const statusJson = (await statusRes.json()) as { success: boolean; data?: SubscriptionStatusData };
          if (statusJson.success && statusJson.data) mergeStatus(statusJson.data);
        }
      } else {
        showToast('error', json.error ?? 'Failed to cancel subscription.');
      }
    } catch {
      showToast('error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(null);
    }
  }, [accessToken, apiBaseUrl, mergeStatus, showToast]);

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
    <div className="w-full min-w-0 space-y-8">
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
              {(() => {
                const seats = PLAN_LIMITS[status.plan]?.team_seats ?? PLAN_LIMITS.free.team_seats;
                return seats === Infinity ? 'unlimited' : seats;
              })()}
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

        {/* Coupon code */}
        <div className="mb-4 rounded-xl border border-[#D4A843]/40 bg-[#FDF6E3] p-4">
          <p className="mb-2 text-sm font-semibold text-[#1A1A1A]">Have a coupon code?</p>
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="text-xs text-[#555555] sm:mr-1">Apply to plan</label>
            <select
              value={couponPlan}
              onChange={(e) =>
                setCouponPlan(e.target.value as 'navigator' | 'compass' | 'flagship')
              }
              className="rounded-lg border border-[#CCCCCC] bg-white px-3 py-2 text-sm outline-none focus:border-[#0B6E6E]"
            >
              <option value="navigator">Navigator</option>
              <option value="compass">Compass</option>
              <option value="flagship">Flagship</option>
            </select>
            <span className="hidden text-xs text-[#555555] sm:inline">
              · {billingCycle === 'annual' ? 'Annual' : 'Monthly'} billing
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={couponInput}
              onChange={(e) => {
                setCouponInput(e.target.value.toUpperCase());
                setCouponError(null);
              }}
              placeholder="e.g. COMPASS20"
              className="flex-1 rounded-lg border border-[#CCCCCC] bg-white px-3 py-2 font-mono text-sm uppercase outline-none focus:border-[#0B6E6E]"
            />
            <button
              type="button"
              onClick={() => void applyCoupon(couponPlan)}
              disabled={validatingCoupon || !couponInput.trim()}
              className="rounded-lg border border-[#D4A843] bg-white px-4 py-2 text-sm font-semibold text-[#D4A843] hover:bg-[#D4A843]/10 disabled:opacity-50"
            >
              {validatingCoupon ? 'Checking…' : 'Apply coupon'}
            </button>
          </div>
          {couponError ? (
            <p className="mt-2 text-xs text-[#C0392B]">{couponError}</p>
          ) : appliedCoupon ? (
            <p className="mt-2 text-xs text-[#1A7A4A]">
              <strong>{appliedCoupon.code}</strong> applied ({appliedCoupon.label}) —{' '}
              {appliedCoupon.discountedAmount === 0
                ? 'Free'
                : `₦${appliedCoupon.discountedAmount.toLocaleString()}`}{' '}
              for {PLAN_NAMES[appliedCoupon.plan]} {appliedCoupon.billingCycle}.{' '}
              <button
                type="button"
                onClick={() => {
                  setAppliedCoupon(null);
                  setCouponInput('');
                }}
                className="underline"
              >
                Remove
              </button>
            </p>
          ) : (
            <p className="mt-2 text-xs text-[#555555]">
              Coupon applies to the plan selected at checkout. Change billing cycle above before
              applying.
            </p>
          )}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {(['navigator', 'compass', 'flagship'] as const).map((plan) => {
            const pricing = status.pricing?.[plan] ?? PLAN_PRICING_NGN[plan];
            const amount = pricing[billingCycle];
            const couponApplies =
              appliedCoupon !== null &&
              appliedCoupon.plan === plan &&
              appliedCoupon.billingCycle === billingCycle;
            const displayAmount = couponApplies ? appliedCoupon.discountedAmount : amount;
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
                  {couponApplies ? (
                    displayAmount === 0 ? (
                      <>Free</>
                    ) : (
                      <>
                        <span className={['mr-2 text-lg line-through opacity-60', isCompass ? 'text-white/50' : 'text-[#999]'].join(' ')}>
                          ₦{amount.toLocaleString()}
                        </span>
                        ₦{displayAmount.toLocaleString()}
                      </>
                    )
                  ) : (
                    <>₦{(amount ?? 0).toLocaleString()}</>
                  )}
                  {displayAmount > 0 && (
                  <span className={['text-sm font-normal', isCompass ? 'text-white/60' : 'text-[#555]'].join(' ')}>
                    /{billingCycle === 'annual' ? 'yr' : 'mo'}
                  </span>
                  )}
                  {couponApplies && displayAmount === 0 && (
                  <span className={['text-sm font-normal', isCompass ? 'text-white/60' : 'text-[#555]'].join(' ')}>
                    {' '}· {billingCycle === 'annual' ? 'annual' : 'monthly'}
                  </span>
                  )}
                </p>
                {couponApplies ? (
                  <p className={['mb-2 text-[10px] font-semibold uppercase tracking-wide', isCompass ? 'text-[#D4A843]' : 'text-[#1A7A4A]'].join(' ')}>
                    {appliedCoupon.code} · {appliedCoupon.label}
                  </p>
                ) : null}

                <PlanFeatureList plan={plan} isCompass={isCompass} />

                <div className="mt-4">
                  {plan === 'flagship' ? (
                    <FlagshipContactButton
                      source="billing"
                      defaultName={userName}
                      defaultEmail={userEmail}
                      currentPlan={initial.plan}
                      accessToken={accessToken}
                    />
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
