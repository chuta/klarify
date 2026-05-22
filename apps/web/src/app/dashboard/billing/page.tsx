import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api';
import { BillingClient, type SubscriptionStatusData } from './_client';

// Billing calls go directly to the Hono API (Fly.io) — they need persistence
// and aren't short-lived enough for Netlify's serverless timeout.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3001';

export const metadata: Metadata = {
  title: 'Billing — Klarify',
  description: 'Manage your Klarify subscription and billing.',
};

interface PageProps {
  searchParams?: { plan?: string };
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
  const result = await apiFetch<SubscriptionStatusData>(
    '/api/billing/status',
    accessToken,
  );

  const statusData: SubscriptionStatusData = result.success
    ? result.data
    : {
        plan: 'free',
        status: 'active',
        billingCycle: null,
        currentPeriodEnd: null,
        seatsUsed: 1,
        pricing: {
          navigator: { monthly: 47_000,    annual: 445_000 },
          compass:   { monthly: 159_000,   annual: 1_520_000 },
          flagship:  { monthly: 479_000,   annual: 4_600_000 },
        },
      };

  const userName =
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split('@')[0] ??
    'User';

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Billing & Subscription</h1>
        <p className="mt-1 text-sm text-[#555]">
          Manage your plan and payment details. All payments processed via Korapay.
        </p>
      </div>

      <BillingClient
        initial={statusData}
        userEmail={user.email ?? ''}
        userName={userName}
        accessToken={accessToken}
        apiBaseUrl={API_BASE_URL}
        initialPlan={searchParams?.plan ?? null}
      />
    </div>
  );
}
