import { userHasCompletedOnboarding } from '@/lib/teamService';
import { prisma } from '@/lib/db';
import { OnboardingNudgeBanner } from '@/components/dashboard/OnboardingNudgeBanner';
import type { ReactNode } from 'react';

interface DashboardShellExtrasProps {
  userId: string;
  children: ReactNode;
}

export async function DashboardShellExtras({
  userId,
  children,
}: DashboardShellExtrasProps): Promise<JSX.Element> {
  const [hasCompleted, membership] = await Promise.all([
    userHasCompletedOnboarding(userId),
    prisma.orgMember.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: { org: { select: { name: true } } },
    }),
  ]);

  return (
    <>
      <OnboardingNudgeBanner
        hasCompletedOnboarding={hasCompleted}
        role={membership?.role ?? null}
        orgName={membership?.org.name ?? null}
      />
      {children}
    </>
  );
}
