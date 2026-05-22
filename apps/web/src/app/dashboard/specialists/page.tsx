import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { SpecialistsClient } from './_client';

export const metadata: Metadata = {
  title: 'Specialist Network — Klarify',
  description: 'Request introduction to vetted Nigerian digital asset regulatory specialists.',
};

export default async function SpecialistsPage(): Promise<JSX.Element> {
  const supabase = createClient();
  const [userRes, sessionRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ]);

  const user = userRes.data.user;
  const session = sessionRes.data.session;
  if (!session || !user) redirect('/sign-in');

  const membership = await prisma.orgMember.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
    select: { org: { select: { plan: true, name: true } } },
  });

  const plan = membership?.org.plan ?? 'free';
  const hasAccess = plan === 'compass' || plan === 'flagship';
  const orgName = membership?.org.name ?? 'My organisation';
  const userName =
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split('@')[0] ??
    'User';

  return (
    <DashboardPageShell>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Vetted Specialist Network</h1>
        <p className="mt-1 text-sm text-[#555555]">
          Lawyers and compliance professionals vetted for Nigerian digital asset regulation.
          Request a warm introduction — Klarify routes every request personally.
        </p>
      </div>

      <SpecialistsClient
        hasAccess={hasAccess}
        currentPlan={plan}
        userName={userName}
        userEmail={user.email ?? ''}
        orgName={orgName}
      />
    </DashboardPageShell>
  );
}
