'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/features', label: 'Features' },
  { href: '/product-tour', label: 'Product Tour' },
  { href: '/who-its-for', label: "Who It's For" },
  { href: '/pricing', label: 'Pricing' },
] as const;

/**
 * Shared marketing navbar.
 *
 * Used on /, /features, /pricing, /who-its-for, /product-tour. Links route to real pages
 * (not hash anchors) so they remain navigable from any marketing page.
 *
 * Mobile: collapses behind a hamburger that opens an in-header drop-down
 * panel with the same links + CTAs. The panel auto-closes on route change
 * and on Escape.
 */
export function Navbar(): JSX.Element {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-[#1A3A55] bg-[#0D2B45]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center">
          <Image
            src="/klarify_logo.png"
            alt="Klarify"
            width={112}
            height={38}
            priority
            className="object-contain brightness-0 invert"
          />
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-6 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-white/70 transition hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-white/80 transition hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg bg-[#0B6E6E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0A5F5F]"
          >
            Get started free
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="marketing-mobile-menu"
          className="-mr-2 flex h-10 w-10 items-center justify-center rounded-lg text-white transition hover:bg-white/10 md:hidden"
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {/* Mobile drop-down menu */}
      <div
        id="marketing-mobile-menu"
        className={`overflow-hidden border-t border-[#1A3A55] transition-[max-height,opacity] duration-200 ease-out md:hidden ${
          open ? 'max-h-[28rem] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <nav className="flex flex-col gap-1 px-4 py-3">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-3 text-base font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
          <div className="my-2 h-px bg-white/10" />
          <Link
            href="/sign-in"
            className="rounded-lg px-3 py-3 text-base font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="mt-1 rounded-lg bg-[#0B6E6E] px-3 py-3 text-center text-base font-semibold text-white transition hover:bg-[#0A5F5F]"
          >
            Get started free
          </Link>
        </nav>
      </div>
    </header>
  );
}

function MenuIcon(): JSX.Element {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon(): JSX.Element {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
