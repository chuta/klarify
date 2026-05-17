import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/server';

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * Dashboard shell layout — wraps all /dashboard/* pages.
 *
 * Responsibilities:
 *   1. Auth guard — redirect unauthenticated users to /sign-in.
 *   2. Persistent left sidebar with primary navigation.
 *   3. Top bar with logo + user email + sign-out.
 *
 * All child pages receive an already-authenticated context; they do NOT
 * need to re-check auth (but they may call supabase.auth.getUser() for
 * fresh data or to get the access token for API calls).
 */
export default async function DashboardLayout({ children }: DashboardLayoutProps): Promise<JSX.Element> {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/sign-in');
  }

  const email = user.email ?? '';
  const displayName = (user.user_metadata?.name as string | undefined) ?? email.split('@')[0] ?? '';

  return (
    <div className="flex h-screen bg-[#FAFAFA] overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-[#CCCCCC] bg-white">
        {/* Logo */}
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

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-[#CCCCCC]">
            Setup
          </p>
          <ul className="mb-4 space-y-0.5">
            <SidebarLink href="/dashboard/onboarding" icon={<SetupIcon />} label="Get Started" />
          </ul>

          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-[#CCCCCC]">
            ComplianceOS
          </p>
          <ul className="space-y-0.5">
            <SidebarLink href="/dashboard" icon={<HomeIcon />} label="Dashboard" />
            <SidebarLink href="/dashboard/roadmap" icon={<ListIcon />} label="Roadmap" />
            <SidebarLink href="/dashboard/documents" icon={<DocIcon />} label="Documents" />
            <SidebarLink href="/dashboard/regulators" icon={<BuildingIcon />} label="Regulators" />
            <SidebarLink href="/dashboard/calendar" icon={<CalIcon />} label="Calendar" />
          </ul>

          <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-widest text-[#CCCCCC]">
            FounderCounsel
          </p>
          <ul className="space-y-0.5">
            <SidebarLink href="/dashboard/chat" icon={<ChatIcon />} label="AI Advisory" />
          </ul>
        </nav>

        {/* User section */}
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
          <form method="POST" action="/auth/sign-out" className="mt-1">
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-xs text-[#555555] transition hover:bg-[#F5F5F5] hover:text-[#C0392B]"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex h-14 items-center justify-between border-b border-[#CCCCCC] bg-white px-4 md:hidden">
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
          <form method="POST" action="/auth/sign-out">
            <button
              type="submit"
              className="rounded-lg border border-[#CCCCCC] px-3 py-1 text-xs text-[#555555]"
            >
              Sign out
            </button>
          </form>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

// ── Sidebar link ──────────────────────────────────────────────────────────────

interface SidebarLinkProps {
  href: string;
  icon: JSX.Element;
  label: string;
}

function SidebarLink({ href, icon, label }: SidebarLinkProps): JSX.Element {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#555555] transition hover:bg-[#F5F5F5] hover:text-[#0B6E6E]"
      >
        <span className="h-4 w-4 shrink-0 text-[#CCCCCC]">{icon}</span>
        {label}
      </Link>
    </li>
  );
}

// ── Minimal icon set (inline SVG) ─────────────────────────────────────────────

function SetupIcon(): JSX.Element {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function HomeIcon(): JSX.Element {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function ListIcon(): JSX.Element {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function DocIcon(): JSX.Element {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

function BuildingIcon(): JSX.Element {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function CalIcon(): JSX.Element {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function ChatIcon(): JSX.Element {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );
}
