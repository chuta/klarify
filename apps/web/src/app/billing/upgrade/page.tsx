import { redirect } from 'next/navigation';

interface PageProps {
  searchParams?: { plan?: string };
}

/** Legacy upgrade URL — billing lives under /dashboard/billing. */
export default function BillingUpgradeRedirect({ searchParams }: PageProps): never {
  const plan = searchParams?.plan;
  if (plan && ['navigator', 'compass', 'flagship'].includes(plan)) {
    redirect(`/dashboard/billing?plan=${encodeURIComponent(plan)}`);
  }
  redirect('/dashboard/billing');
}
