import type { Metadata } from 'next';
import Link from 'next/link';
import { getOptionalUser } from '@/lib/supabase/server';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { FlagshipContactButton } from '@/components/billing/FlagshipContactButton';

export const metadata: Metadata = {
  title: 'Pricing — Klarify',
  description:
    'Transparent pricing for African founders building in regulated markets. Start free with 10 AI queries/month, or upgrade for unlimited Q&A, document analysis, ARIP tracking, and multi-jurisdiction support.',
};

/**
 * /pricing — pricing tiers and FAQ.
 *
 * Sections:
 *   1. Page header
 *   2. Pricing tiers (Free / Navigator / Compass / Flagship)
 *   3. Comparison highlights
 *   4. FAQ
 *   5. CTA banner
 */
export default async function PricingPage(): Promise<JSX.Element> {
  // user is fetched so the Navbar can show the right CTA (sign in vs dashboard).
  const _user = await getOptionalUser();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <PageHeader />
      <PricingTiers />
      <ComparisonHighlights />
      <PricingFaq />
      <CtaBanner />
      <Footer />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */

function PageHeader(): JSX.Element {
  return (
    <section className="bg-[#0D2B45] px-6 py-20">
      <div className="mx-auto max-w-4xl text-center">
        <p className="mb-5 inline-block rounded-full border border-[#0B6E6E]/60 bg-[#0B6E6E]/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#0B6E6E]">
          Pricing
        </p>
        <h1 className="mb-4 text-4xl font-bold leading-tight text-white sm:text-5xl">
          Transparent, <span className="text-[#D4A843]">founder-friendly</span> pricing
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-white/70">
          Start free. Upgrade when you need more power. All prices in USD, billed in Naira at the
          prevailing rate.
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */

function PricingTiers(): JSX.Element {
  return (
    <section className="bg-white px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Free */}
          <div className="rounded-2xl border border-[#CCCCCC] bg-[#FAFAFA] p-6">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[#555555]">Free</p>
            <p className="mb-4 text-3xl font-bold text-[#1A1A1A]">$0</p>
            <ul className="mb-6 space-y-2 text-sm text-[#555555]">
              <li>✓ 10 AI queries/month</li>
              <li>✓ Nigeria jurisdiction only</li>
              <li>✓ Readiness Score</li>
              <li>✗ Document analysis</li>
              <li>✗ Document generator</li>
              <li>✗ ARIP tracker</li>
            </ul>
            <Link
              href="/sign-up"
              className="block w-full rounded-lg border border-[#CCCCCC] px-4 py-2.5 text-center text-sm font-semibold text-[#1A1A1A] transition hover:border-[#0B6E6E] hover:text-[#0B6E6E]"
            >
              Get started free
            </Link>
          </div>

          {/* Navigator */}
          <div className="rounded-2xl border border-[#CCCCCC] bg-[#FAFAFA] p-6">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[#0B6E6E]">
              Navigator
            </p>
            <p className="mb-1 text-3xl font-bold text-[#1A1A1A]">$29<span className="text-sm font-normal text-[#555555]">/mo</span></p>
            <p className="mb-4 text-xs text-[#555555]">$278/year (save 20%)</p>
            <ul className="mb-6 space-y-2 text-sm text-[#555555]">
              <li>✓ 50 AI queries/month</li>
              <li>✓ Nigeria jurisdiction</li>
              <li>✓ 5 document analyses</li>
              <li>✓ 3 document templates</li>
              <li>✗ ARIP tracker</li>
              <li>✗ Regulator CRM</li>
            </ul>
            <Link
              href="/sign-up?next=/dashboard/billing%3Fplan%3Dnavigator"
              className="block w-full rounded-lg border border-[#0B6E6E] px-4 py-2.5 text-center text-sm font-semibold text-[#0B6E6E] transition hover:bg-[#E6F4F4]"
            >
              Start Navigator
            </Link>
          </div>

          {/* Compass — highlighted */}
          <div className="relative rounded-2xl border-2 border-[#0B6E6E] bg-[#0D2B45] p-6">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#0B6E6E] px-3 py-0.5 text-xs font-bold text-white">
              Most popular
            </div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[#0B6E6E]">
              Compass
            </p>
            <p className="mb-1 text-3xl font-bold text-white">$99<span className="text-sm font-normal text-white/60">/mo</span></p>
            <p className="mb-4 text-xs text-white/50">$950/year (save 20%)</p>
            <ul className="mb-6 space-y-2 text-sm text-white/70">
              <li>✓ Unlimited AI queries</li>
              <li>✓ 2 jurisdictions</li>
              <li>✓ Unlimited document analyses</li>
              <li>✓ All 13 document templates</li>
              <li>✓ ARIP tracker</li>
              <li>✓ Regulator CRM</li>
              <li>✓ Human escalation</li>
            </ul>
            <Link
              href="/sign-up?next=/dashboard/billing%3Fplan%3Dcompass"
              className="block w-full rounded-lg bg-[#0B6E6E] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[#0A5F5F]"
            >
              Start Compass
            </Link>
          </div>

          {/* Flagship */}
          <div className="rounded-2xl border border-[#D4A843]/30 bg-[#FDF6E3] p-6">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[#D4A843]">
              Flagship
            </p>
            <p className="mb-1 text-3xl font-bold text-[#1A1A1A]">$299<span className="text-sm font-normal text-[#555555]">/mo</span></p>
            <p className="mb-4 text-xs text-[#555555]">$2,870/year (save 20%)</p>
            <ul className="mb-6 space-y-2 text-sm text-[#555555]">
              <li>✓ Everything in Compass</li>
              <li>✓ All 5 jurisdictions</li>
              <li>✓ Unlimited team seats</li>
              <li>✓ Priority human escalation</li>
              <li>✓ Full compliance export</li>
              <li>✓ API access</li>
            </ul>
            <FlagshipContactButton
              source="pricing"
              className="block w-full rounded-lg border border-[#D4A843] px-4 py-2.5 text-center text-sm font-semibold text-[#D4A843] transition hover:bg-[#D4A843]/10"
            />
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-[#555555]">
          All plans include a 14-day money-back guarantee.
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */

function ComparisonHighlights(): JSX.Element {
  const highlights = [
    {
      title: 'Start where the risk is',
      body: 'Every plan unlocks the live Readiness Score. The Free plan tells you, in 3 minutes, how exposed your product currently is — at no cost.',
    },
    {
      title: 'Upgrade when stakes go up',
      body: 'Move to Navigator when you start writing real responses. Move to Compass when you begin ARIP. Move to Flagship when you expand beyond Nigeria.',
    },
    {
      title: 'Nigeria-priced, globally-built',
      body: 'Naira-billed at the prevailing rate. No hidden FX surcharge. The same enterprise-grade infrastructure used by international compliance teams.',
    },
  ];

  return (
    <section className="bg-[#FAFAFA] px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-6 md:grid-cols-3">
          {highlights.map(({ title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-[#CCCCCC] bg-white p-6 shadow-sm"
            >
              <h3 className="mb-2 text-base font-semibold text-[#1A1A1A]">{title}</h3>
              <p className="text-sm text-[#555555]">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */

function PricingFaq(): JSX.Element {
  const faqs = [
    {
      q: 'Can I switch plans later?',
      a: 'Yes. Upgrade or downgrade any time from your billing settings. Upgrades take effect immediately; downgrades take effect at the end of your current billing cycle.',
    },
    {
      q: 'Do you offer annual billing?',
      a: 'Yes. Annual billing saves 20% on all paid plans. Switch in your billing settings after signing up.',
    },
    {
      q: 'What counts as an "AI query"?',
      a: 'Each question you ask in Ask Klarify, each product classification, and each document analysis counts as one query. Roadmap updates, Readiness Score recalculations, and dashboard views are unlimited on every plan.',
    },
    {
      q: 'Which payment methods do you accept?',
      a: 'Naira card payments and bank transfers via Korapay. All major Nigerian bank cards, USSD, and bank transfer are supported. International cards are accepted through Korapay\'s multi-currency support.',
    },
    {
      q: 'Is my data secure?',
      a: 'Yes. Documents are encrypted at rest (AES-256) and in transit. Row-level security ensures no user can ever see another organisation\'s data. Uploaded regulatory letters are never used to train AI models.',
    },
    {
      q: 'Do you offer a team or enterprise plan?',
      a: 'Flagship includes unlimited team seats. For organisations needing custom procurement, SSO, or on-prem deployment, contact hello@klarify.africa.',
    },
  ];

  return (
    <section className="bg-white px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <h2 className="mb-3 text-3xl font-bold text-[#1A1A1A]">Pricing questions, answered</h2>
        </div>

        <div className="space-y-4">
          {faqs.map(({ q, a }) => (
            <details
              key={q}
              className="group rounded-xl border border-[#CCCCCC] bg-[#FAFAFA] p-5 transition open:bg-white open:shadow-sm"
            >
              <summary className="flex cursor-pointer items-center justify-between text-base font-semibold text-[#1A1A1A]">
                {q}
                <span className="ml-3 text-[#0B6E6E] transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-[#555555]">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */

function CtaBanner(): JSX.Element {
  return (
    <section className="bg-[#0D2B45] px-6 py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="mb-4 text-3xl font-bold text-white">
          Start free in 3 minutes
        </h2>
        <p className="mb-8 text-white/60">
          No credit card required. Get your Readiness Score and explore Klarify before deciding
          which plan fits.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/sign-up"
            className="w-full rounded-xl bg-[#0B6E6E] px-8 py-4 text-base font-semibold text-white transition hover:bg-[#0A5F5F] sm:w-auto"
          >
            Get started free
          </Link>
          <Link
            href="/product-tour"
            className="w-full rounded-xl border border-white/20 px-8 py-4 text-base font-semibold text-white transition hover:border-white/40 sm:w-auto"
          >
            Preview the app first
          </Link>
        </div>
      </div>
    </section>
  );
}
