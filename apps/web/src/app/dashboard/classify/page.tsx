import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ClassifyForm } from '@/components/classify/ClassifyForm';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';

/**
 * /dashboard/classify — Product Classification (Sprint 2, US-001).
 *
 * Server component gates on auth + threads the API base URL down to the
 * client form (which calls the Fly API directly because Opus latency
 * can exceed Netlify's serverless timeout).
 */
export default async function ClassifyPage(): Promise<JSX.Element> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect('/sign-in');

  // Public env — exposed to the client form for browser-origin fetches.
  // Mirrors the resolution in apps/web/src/lib/env.ts so both server-side
  // and client-side requests hit the same Klarify API origin.
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3001';

  return (
    <DashboardPageShell>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">Classify Your Product</h1>
        <p className="mt-1 text-sm text-[#555]">
          Complete every field below. Klarify uses your description, features, business
          model, and target users to map your product against Nigerian and African
          regulatory frameworks (ISA 2025, SEC Digital Asset Rules, MLPPA 2022, CBN VASP
          Guidelines) and return a Regulatory Identity Card. No guess work.
        </p>
      </header>

      <ClassifyForm apiBaseUrl={apiBaseUrl} />
    </DashboardPageShell>
  );
}
