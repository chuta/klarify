import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api';
import { getPublicApiBaseUrl } from '@/lib/env';
import type { UserMeResponse } from '@klarify/core';
import { BillingClient, type SubscriptionStatusData } from './_client';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';

export const metadata: Metadata = {
  title: 'Billing — Klarify',
  description: 'Manage your Klarify subscription and billing.',
};

const DEFAULT_PRICING = {
  navigator: { monthly: 47_000, annual: 445_000 },
  compass: { monthly: 159_000, annual: 1_520_000 },
  flagship: { monthly: 479_000, annual: 4_600_000 },
};

interface PageProps {
  searchParams?: { plan?: string };
}

async function loadBillingStatus(accessToken: string): Promise<SubscriptionStatusData> {
  const flyApiBase = getPublicApiBaseUrl();

  // Billing routes live on the Hono API (Fly), not Netlify Route Handlers.
  const result = await apiFetch<SubscriptionStatusData>(
    '/api/billing/status',
    accessToken,
    {},
    flyApiBase,
  );

  if (result.success) {
    return result.data;
  }

  console.error('[billing/page] Fly billing/status failed:', result.error, result.code);

  // Fallback: align plan with Profile (/api/user/me reads organisations.plan).
  const meResult = await apiFetch<UserMeResponse>('/api/user/me', accessToken);
  const membership = meResult.success ? meResult.data.memberships[0] : undefined;

  return {
    plan: (membership?.plan ?? 'free') as SubscriptionStatusData['plan'],
    status: 'active',
    billingCycle: null,
    currentPeriodEnd: null,
    seatsUsed: 1,
    pricing: DEFAULT_PRICING,
  };
}

export default async function BillingPage({ searchParams }: PageProps): Promise<JSX.Element> {
  const supabase = createClient();
  const [userRes, sessionRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ]);

  const user = userRes.data.user;
  const session = sessionRes.data.session;

  if (userRes.error || !user || !session) redirect('/sign-in');

  const accessToken = session.access_token;
  const statusData = await loadBillingStatus(accessToken);
  const apiBaseUrl = getPublicApiBaseUrl();

  const userName =
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split('@')[0] ??
    'User';

  return (
    <DashboardPageShell>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Billing & Subscription</h1>
          <p className="mt-1 text-sm text-[#555]">
            Manage your plan and payment details. All payments processed via Korapay.
          </p>
        </div>
      </div>

      <BillingClient
        initial={statusData}
        userEmail={user.email ?? ''}
        userName={userName}
        accessToken={accessToken}
        apiBaseUrl={apiBaseUrl}
        initialPlan={searchParams?.plan ?? null}
      />
    </DashboardPageShell>
  );
}
