import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { requireUser } from '@/lib/supabase/server';
import { userHasCompletedOnboarding } from '@/lib/teamService';
import { getDashboardNav } from './_nav';
import { MobileNav } from './_mobile-nav';
import { DashboardShellExtras } from '@/components/dashboard/DashboardShellExtras';
import { SessionInactivityGuard } from '@/components/auth/SessionInactivityGuard';
import { PostHogIdentify } from '@/components/analytics/PostHogIdentify';
import { SignOutButton } from '@/components/analytics/SignOutButton';

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * Dashboard shell layout — wraps all /dashboard/* pages.
 *
 * Responsibilities:
 *   1. Auth guard — redirect unauthenticated users to /sign-in.
 *   2. Persistent left sidebar (desktop) with primary navigation.
 *   3. Mobile top bar with hamburger menu (opens MobileNav drawer).
 *
 * Both the desktop sidebar and the mobile drawer render from the same
 * DASHBOARD_NAV structure in _nav.tsx so they cannot drift apart.
 *
 * All child pages receive an already-authenticated context; they do NOT
 * need to re-check auth (but they may call supabase.auth.getUser() for
 * fresh data or to get the access token for API calls).
 */
export default async function DashboardLayout({ children }: DashboardLayoutProps): Promise<JSX.Element> {
  const user = await requireUser();

  const email = user.email ?? '';
  const displayName = (user.user_metadata?.name as string | undefined) ?? email.split('@')[0] ?? '';
  const hasCompletedOnboarding = await userHasCompletedOnboarding(user.id);
  const navSections = getDashboardNav(hasCompletedOnboarding);

  return (
    <div className="flex h-screen bg-[#FAFAFA] overflow-hidden">
      <SessionInactivityGuard />
      <PostHogIdentify userId={user.id} email={email} />
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-[#CCCCCC] bg-white">
        <div className="flex h-16 items-center border-b border-[#CCCCCC] px-5">
          <Link href="/dashboard">
            <Image
              src="/klarify_logo.png"
              alt="Klarify"
              width={110}
              height={37}
              priority
              className="object-contain"
            />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navSections.map((section, i) => (
            <div key={section.title} className={i > 0 ? 'mt-6' : ''}>
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-[#CCCCCC]">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#555555] transition hover:bg-[#F5F5F5] hover:text-[#0B6E6E]"
                    >
                      <span className="h-4 w-4 shrink-0 text-[#CCCCCC]">{item.icon}</span>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-[#CCCCCC] p-4">
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#555555] transition hover:bg-[#F5F5F5]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E6F4F4] text-xs font-semibold text-[#0B6E6E]">
              {displayName.charAt(0).toUpperCase()}
            </span>
            <span className="flex-1 truncate text-xs">{email}</span>
          </Link>
          <SignOutButton />
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex h-14 items-center justify-between border-b border-[#CCCCCC] bg-white px-4 md:hidden">
          <div className="flex items-center gap-2">
            <MobileNav email={email} displayName={displayName} navSections={navSections} />
            <Link href="/dashboard">
              <Image
                src="/klarify_logo.png"
                alt="Klarify"
                width={90}
                height={30}
                priority
                className="object-contain"
              />
            </Link>
          </div>
          <Link
            href="/dashboard/profile"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E6F4F4] text-xs font-semibold text-[#0B6E6E]"
            aria-label="Profile"
          >
            {displayName.charAt(0).toUpperCase()}
          </Link>
        </header>

        <main className="flex-1 w-full min-w-0 overflow-y-auto px-6 py-6 md:px-8 md:py-8 lg:px-10 xl:px-12">
          <DashboardShellExtras userId={user.id}>
            {children}
          </DashboardShellExtras>
        </main>
      </div>
    </div>
  );
}
