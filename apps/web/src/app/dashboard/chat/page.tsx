import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { ChatInterface } from '@/components/chat/ChatInterface';

/**
 * /dashboard/chat — FounderCounsel AI Advisory
 */
export default async function ChatPage(): Promise<JSX.Element> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect('/sign-in');

  const membership = await prisma.orgMember.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
    select: { org: { select: { plan: true, name: true } } },
  });

  const plan = membership?.org.plan ?? 'free';
  const hasSpecialistAccess = plan === 'compass' || plan === 'flagship';
  const orgName = membership?.org.name ?? 'My organisation';
  const userName =
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split('@')[0] ??
    'User';

  return (
    <div className="-mx-6 -my-6 md:-mx-8 md:-my-8 lg:-mx-10 xl:-mx-12">
      <ChatInterface
        hasSpecialistAccess={hasSpecialistAccess}
        currentPlan={plan}
        userName={userName}
        userEmail={user.email ?? ''}
        orgName={orgName}
      />
    </div>
  );
}
