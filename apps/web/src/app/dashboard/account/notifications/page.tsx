import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { NotificationsClient } from './_client';
import { AnalyticsPreference } from '@/components/analytics/AnalyticsPreference';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';

export const metadata = {
  title: 'Notification Preferences — Klarify',
  description: 'Manage your email notification settings',
};

export default async function NotificationsPage(): Promise<JSX.Element> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/sign-in');

  return (
    <DashboardPageShell>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">
          Notification Preferences
        </h1>
        <p className="text-[#555555] text-sm">
          Choose which email notifications you receive from Klarify.
        </p>
      </div>

      <Suspense fallback={<NotificationsSkeleton />}>
        <NotificationsClient accessToken={session.access_token} />
      </Suspense>

      <div className="mt-10 mb-4">
        <h2 className="text-lg font-bold text-[#1A1A1A] mb-1">Privacy &amp; analytics</h2>
        <p className="text-[#555555] text-sm">
          Control the anonymous usage data Klarify collects to improve the product.
        </p>
      </div>

      <AnalyticsPreference />
    </DashboardPageShell>
  );
}

function NotificationsSkeleton(): JSX.Element {
  return (
    <div className="space-y-4 animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-40 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-64" />
            </div>
            <div className="h-6 w-11 bg-gray-200 rounded-full ml-4 flex-shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
