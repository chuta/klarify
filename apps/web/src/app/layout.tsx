import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

/**
 * `metadataBase` is consumed by Next.js when resolving relative URLs in
 * `icons`, `openGraph.images`, `twitter.images`, etc. If we don't set it
 * explicitly, Next 14 tries to derive a base from env / request headers,
 * and on Netlify that derivation can produce the literal string `"null"`
 * — which then crashes with `TypeError: Invalid URL { input: 'null' }`
 * on every server-rendered page.
 *
 * The build is static-evaluated, so this resolver must work without a
 * request context. We try the explicit `NEXT_PUBLIC_APP_URL`, then the
 * production canonical, then a localhost default. We DO NOT touch the
 * `headers()` API here — it isn't available during static prerender.
 */
function resolveMetadataBase(): URL {
  const candidate = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (candidate && /^https?:\/\//i.test(candidate) && candidate !== 'null') {
    try {
      return new URL(candidate);
    } catch {
      // Fall through to canonical default below.
    }
  }
  return new URL(
    process.env.NODE_ENV === 'production'
      ? 'https://klarify.africa'
      : 'http://localhost:3000',
  );
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: 'Klarify — Navigate Regulated Markets with Confidence',
  description:
    'Compliance OS for African fintech & digital assets. Know what licence you need, what to do next, and stay regulator-ready. Starting with Nigeria.',
  icons: {
    icon: [
      { url: '/klarity_icon.png', type: 'image/png' },
    ],
    apple: '/klarity_icon.png',
    shortcut: '/klarity_icon.png',
  },
};

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <body className="bg-bg-primary text-[color:var(--klarify-text-primary,#1A1A1A)] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
