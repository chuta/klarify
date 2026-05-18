'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { DASHBOARD_NAV } from './_nav';

interface MobileNavProps {
  email: string;
  displayName: string;
}

/**
 * Dashboard mobile navigation.
 *
 * Renders a hamburger button (visible on mobile only) that opens a
 * slide-in drawer mirroring the desktop sidebar — same nav sections,
 * same user/sign-out controls.
 *
 * Behaviour:
 *   - Closes on route change
 *   - Closes on Escape
 *   - Closes on backdrop click
 *   - Locks body scroll while open
 *
 * Receives `email` and `displayName` from the server layout so it can
 * render the user section without a second auth round-trip.
 */
export function MobileNav({ email, displayName }: MobileNavProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) {
      document.documentElement.classList.add('overflow-hidden');
    } else {
      document.documentElement.classList.remove('overflow-hidden');
    }
    return () => document.documentElement.classList.remove('overflow-hidden');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={open}
        aria-controls="dashboard-mobile-drawer"
        className="-ml-2 flex h-10 w-10 items-center justify-center rounded-lg text-[#555555] transition hover:bg-[#F5F5F5]"
      >
        <MenuIcon />
      </button>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 md:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Drawer */}
      <aside
        id="dashboard-mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Dashboard navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl transition-transform duration-200 ease-out md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header: logo + close */}
        <div className="flex h-16 items-center justify-between border-b border-[#CCCCCC] px-5">
          <Link href="/dashboard" onClick={() => setOpen(false)}>
            <Image
              src="/klarify_logo.png"
              alt="Klarify"
              width={110}
              height={37}
              priority
              className="object-contain"
            />
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#555555] transition hover:bg-[#F5F5F5]"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {DASHBOARD_NAV.map((section, i) => (
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

        {/* User + sign out */}
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
    </>
  );
}

function MenuIcon(): JSX.Element {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon(): JSX.Element {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
