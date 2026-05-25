import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { JurisdictionGapAnalyser } from '@/components/jurisdiction/JurisdictionGapAnalyser';
import { resolveUserPlan } from '@/lib/plan';
import type { JurisdictionCode } from '@klarify/core';

export default async function JurisdictionPage(): Promise<JSX.Element> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect('/sign-in');

  const [plan, profile] = await Promise.all([
    resolveUserPlan(user.id),
    prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: { targetMarkets: true },
    }),
  ]);

  const defaultSource = (profile?.targetMarkets?.[0] ?? 'NG') as JurisdictionCode;
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3001';

  return (
    <DashboardPageShell>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">Jurisdiction Expansion</h1>
        <p className="mt-1 text-sm text-[#555]">
          Compare your current compliance posture in Nigeria against target markets before you
          expand — licensing, AML, KYC, capital, and reporting gaps in one structured analysis.
        </p>
      </header>
      <JurisdictionGapAnalyser
        apiBaseUrl={apiBaseUrl}
        plan={plan}
        defaultSource={defaultSource === 'NG' ? 'NG' : 'NG'}
      />
    </DashboardPageShell>
  );
}
