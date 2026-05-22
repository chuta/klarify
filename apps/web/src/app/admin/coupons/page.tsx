import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isPlatformAdmin } from '@/lib/platformAdmin';
import { AdminCouponsClient } from './_client';

export const metadata = {
  title: 'Coupon Admin — Klarify',
  description: 'Manage marketing coupon codes',
};

export default async function AdminCouponsPage(): Promise<JSX.Element> {
  const supabase = createClient();
  const [userRes, sessionRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ]);

  const user = userRes.data.user;
  const session = sessionRes.data.session;
  if (!session || !user) redirect('/sign-in');

  if (!isPlatformAdmin(user.email)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="border-b border-[#CCCCCC] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0B6E6E]">
              Platform Admin
            </p>
            <h1 className="text-xl font-bold text-[#1A1A1A]">Coupon Management</h1>
          </div>
          <a href="/dashboard" className="text-sm text-[#555555] hover:text-[#0B6E6E]">
            ← Back to dashboard
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <AdminCouponsClient accessToken={session.access_token} />
      </main>
    </div>
  );
}
