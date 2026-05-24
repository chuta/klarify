import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { resolveOrgId } from '@/lib/db';
import {
  defaultSubscriptionStatus,
  getSubscriptionStatusForOrg,
  normalizeSubscriptionStatus,
  type SubscriptionStatusData,
} from '@/lib/billingStatus';
import { getPublicApiBaseUrl } from '@/lib/env';
import { BillingClient } from './_client';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';

export const metadata: Metadata = {
  title: 'Billing — Klarify',
  description: 'Manage your Klarify subscription and billing.',
};

interface PageProps {
  searchParams?: { plan?: string };
}

async function loadBillingStatus(userId: string): Promise<SubscriptionStatusData> {
  try {
    const orgId = await resolveOrgId(userId);
    if (!orgId) {
      return defaultSubscriptionStatus();
    }
    return await getSubscriptionStatusForOrg(orgId);
  } catch (err) {
    console.error('[billing/page] loadBillingStatus error:', err);
    return defaultSubscriptionStatus();
  }
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
  const statusData = normalizeSubscriptionStatus(await loadBillingStatus(user.id));
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
