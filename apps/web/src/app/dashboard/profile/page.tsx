import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api';
import { updateProfile } from './actions';
import type { UserMeResponse } from '@klarify/core';

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string };
}): Promise<JSX.Element> {
  const supabase = createClient();
  // Parallelise the two auth reads — getUser is the slow one (network);
  // getSession reads cookies and is effectively free.
  const [userRes, sessionRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ]);
  const user = userRes.data.user;
  const error = userRes.error;
  const session = sessionRes.data.session;

  if (error || !user) redirect('/sign-in');

  const email = user.email ?? '';
  const displayName = (user.user_metadata?.name as string | undefined) ?? email.split('@')[0] ?? '';
  const initial = displayName.charAt(0).toUpperCase();

  let meData: UserMeResponse | null = null;
  if (session) {
    const result = await apiFetch<UserMeResponse>('/api/user/me', session.access_token);
    if (result.success) meData = result.data;
  }

  const membership = meData?.memberships[0];

  const PLAN_LABELS: Record<string, string> = {
    free: 'Free',
    navigator: 'Navigator — $29/mo',
    compass: 'Compass — $99/mo',
    flagship: 'Flagship — $299/mo',
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="mb-6 text-2xl font-semibold text-[#1A1A1A]">Account &amp; Profile</h1>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ── Left column: identity (sticky on desktop) ── */}
        <div className="space-y-6 lg:col-span-2">
          {/* Identity card */}
          <section className="overflow-hidden rounded-2xl border border-[#CCCCCC] bg-white shadow-sm">
            <div className="border-b border-[#CCCCCC] bg-[#0D2B45] px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0B6E6E] text-xl font-bold text-white">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-white">{displayName}</p>
                  <p className="truncate text-sm text-white/60">{email}</p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-[#F5F5F5] px-6">
              <InfoRow label="Email" value={email} />
              <InfoRow label="Display name" value={displayName} />
              {membership && (
                <>
                  <InfoRow label="Organisation" value={membership.orgName} />
                  <InfoRow label="Your role" value={membership.role} />
                  <InfoRow label="Plan" value={PLAN_LABELS[membership.plan] ?? membership.plan} />
                </>
              )}
            </div>
          </section>

          {/* Sign out */}
          <section className="rounded-2xl border border-red-100 bg-white p-6">
            <h2 className="mb-1 text-base font-semibold text-red-600">Sign out</h2>
            <p className="mb-4 text-sm text-[#555555]">You will be returned to the sign-in page.</p>
            <form method="POST" action="/auth/sign-out">
              <button
                type="submit"
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                Sign out of Klarify
              </button>
            </form>
          </section>
        </div>

        {/* ── Right column: edit + subscription ── */}
        <div className="space-y-6 lg:col-span-3">
          {/* Edit name */}
          <section className="rounded-2xl border border-[#CCCCCC] bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-base font-semibold text-[#1A1A1A]">Update display name</h2>
            <p className="mb-4 text-sm text-[#555555]">
              This name appears on your dashboard and in reports exported from Klarify.
            </p>

            {searchParams.success && (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                Profile updated successfully.
              </div>
            )}
            {searchParams.error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {decodeURIComponent(searchParams.error)}
              </div>
            )}

            <form action={updateProfile} className="flex flex-col gap-3 sm:flex-row">
              <input
                name="name"
                type="text"
                defaultValue={displayName}
                placeholder="Your name"
                maxLength={100}
                required
                className="flex-1 rounded-lg border border-[#CCCCCC] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#0B6E6E] focus:outline-none focus:ring-2 focus:ring-[#0B6E6E]/20"
              />
              <button
                type="submit"
                className="rounded-lg bg-[#0B6E6E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0D2B45]"
              >
                Save
              </button>
            </form>
          </section>

          {/* Subscription */}
          <section className="rounded-2xl border border-[#CCCCCC] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="mb-1 text-base font-semibold text-[#1A1A1A]">Subscription</h2>
                <p className="text-sm text-[#555555]">
                  You are on the{' '}
                  <strong className="text-[#1A1A1A]">
                    {PLAN_LABELS[membership?.plan ?? 'free'] ?? 'Free'}
                  </strong>{' '}
                  plan.
                </p>
              </div>
              <Link
                href="/billing"
                className="shrink-0 rounded-lg border border-[#D4A843] px-4 py-2 text-sm font-semibold text-[#D4A843] transition hover:bg-[#FDF6E3]"
              >
                Upgrade plan
              </Link>
            </div>

            {(membership?.plan === 'free' || !membership) && (
              <div className="mt-4 rounded-xl bg-[#FDF6E3] p-4">
                <p className="mb-2 text-xs font-semibold text-[#D4A843]">FREE PLAN LIMITS</p>
                <ul className="space-y-1 text-xs text-[#555555]">
                  <li>• 10 AI queries per month</li>
                  <li>• Nigeria jurisdiction only</li>
                  <li>• No document analysis</li>
                  <li>• No document generation</li>
                </ul>
                <Link
                  href="/billing"
                  className="mt-3 block text-xs font-semibold text-[#D4A843] underline underline-offset-2"
                >
                  Upgrade to Navigator ($29/mo) for 50 AI queries + 5 document analyses →
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps): JSX.Element {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-[#555555]">{label}</span>
      <span className="text-sm font-medium capitalize text-[#1A1A1A]">{value}</span>
    </div>
  );
}
