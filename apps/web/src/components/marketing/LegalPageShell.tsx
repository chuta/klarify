import Link from 'next/link';
import type { ReactNode } from 'react';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';

export interface LegalPageShellProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

const LEGAL_LINKS = [
  { href: '/legal/privacy', label: 'Privacy Policy' },
  { href: '/legal/terms', label: 'Terms of Service' },
  { href: '/legal/cookies', label: 'Cookie Policy' },
] as const;

/**
 * Shared layout for public legal pages (/legal/*).
 * Authenticated users can read these pages — no dashboard redirect.
 */
export function LegalPageShell({ title, lastUpdated, children }: LegalPageShellProps): JSX.Element {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <nav aria-label="Legal documents" className="mb-8 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[#555555] underline-offset-2 hover:text-[#0B6E6E] hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <header className="mb-10 border-b border-[#CCCCCC] pb-8">
            <h1 className="text-3xl font-bold text-[#1A1A1A]">{title}</h1>
            <p className="mt-2 text-sm text-[#555555]">Last updated: {lastUpdated}</p>
            <p className="mt-1 text-sm text-[#555555]">
              Blockspace Technologies Limited · Lagos, Nigeria ·{' '}
              <a href="mailto:hello@klarify.africa" className="text-[#0B6E6E] hover:underline">
                hello@klarify.africa
              </a>
            </p>
          </header>

          <article className="legal-prose space-y-8 text-sm leading-relaxed text-[#555555]">
            {children}
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-[#1A1A1A]">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: string[] }): JSX.Element {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
