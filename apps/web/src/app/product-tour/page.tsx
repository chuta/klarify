import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getOptionalUser } from '@/lib/supabase/server';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { ProductTourClient } from '@/components/marketing/ProductTourClient';

export const metadata: Metadata = {
  title: 'Product Tour — Klarify',
  description:
    'Preview Klarify inside: Readiness Score, FounderCounsel AI, product classification, regulatory letter analyser, compliance roadmap, document generator, ARIP tracker, and more.',
};

/**
 * /product-tour — public sneak preview of the authenticated dashboard.
 * Uses screenshots from apps/web/public/product-tour/.
 */
export default async function ProductTourPage(): Promise<JSX.Element> {
  const user = await getOptionalUser();
  if (user) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <PageHeader />
      <ProductTourClient />
      <CtaBanner />
      <Footer />
    </div>
  );
}

function PageHeader(): JSX.Element {
  return (
    <section className="bg-[#0D2B45] px-6 py-20">
      <div className="mx-auto max-w-4xl text-center">
        <p className="mb-5 inline-block rounded-full border border-[#0B6E6E]/60 bg-[#0B6E6E]/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#0B6E6E]">
          Product Tour
        </p>
        <h1 className="mb-4 text-4xl font-bold leading-tight text-white sm:text-5xl">
          See inside{' '}
          <span className="text-[#D4A843]">Klarify</span>
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-white/70">
          A guided walkthrough of the dashboard — Readiness Score, AI advisory, compliance
          roadmap, document generator, ARIP tracker, and more. No account required.
        </p>
        <Link
          href="/sign-up"
          className="inline-block rounded-xl bg-[#0B6E6E] px-8 py-4 text-base font-semibold text-white transition hover:bg-[#0A5F5F]"
        >
          Get your Readiness Score, Free
        </Link>
      </div>
    </section>
  );
}

function CtaBanner(): JSX.Element {
  return (
    <section className="bg-[#0D2B45] px-6 py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="mb-4 text-3xl font-bold text-white">
          Like what you see? Start building with confidence.
        </h2>
        <p className="mb-8 text-white/60">
          Sign up free in 3 minutes. Your Readiness Score and Phase 1 roadmap are included on
          every plan.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/sign-up"
            className="w-full rounded-xl bg-[#0B6E6E] px-8 py-4 text-base font-semibold text-white transition hover:bg-[#0A5F5F] sm:w-auto"
          >
            Get started free
          </Link>
          <Link
            href="/pricing"
            className="w-full rounded-xl border border-white/20 px-8 py-4 text-base font-semibold text-white transition hover:border-white/40 sm:w-auto"
          >
            See pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
