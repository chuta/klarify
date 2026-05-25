import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { ScenarioSimulator } from '@/components/scenario/ScenarioSimulator';
import { hasCompassAccess, resolveUserPlan } from '@/lib/plan';

export default async function ScenarioPage(): Promise<JSX.Element> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect('/sign-in');

  const plan = await resolveUserPlan(user.id);
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3001';

  return (
    <DashboardPageShell>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">Scenario Simulator</h1>
        <p className="mt-1 text-sm text-[#555]">
          Stress-test a regulatory decision before you make it. Klarify models Best, Likely, and
          Worst case outcomes with citations to Nigerian and African frameworks.
        </p>
      </header>
      <ScenarioSimulator apiBaseUrl={apiBaseUrl} hasAccess={hasCompassAccess(plan)} />
    </DashboardPageShell>
  );
}
