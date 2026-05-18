import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';

export const metadata: Metadata = {
  title: 'Who It\'s For — Klarify',
  description:
    'Klarify is built for founders, compliance officers, lawyers, corporate innovators, and institutional investors operating across African regulated markets. See which persona matches your situation.',
};

/**
 * /who-its-for — audience personas.
 *
 * Sections:
 *   1. Page header
 *   2. Personas grid (6 cards + Institutional Investor enterprise card)
 *   3. CTA banner
 */
export default async function WhoItsForPage(): Promise<JSX.Element> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <PageHeader />
      <Personas />
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
          Who It&apos;s For
        </p>
        <h1 className="mb-4 text-4xl font-bold leading-tight text-white sm:text-5xl">
          Built for every stage of the{' '}
          <span className="text-[#D4A843]">journey</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-white/70">
          From first-time founders to institutional investors. Klarify meets you where you are.
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */

function Personas(): JSX.Element {
  const personas = [
    {
      icon: '🚀',
      title: 'The Pre-Launch Founder',
      urgent: false,
      body: 'Building a digital asset product in Nigeria. Has not yet engaged any regulator.',
      useCase: 'Instant product classification, regulator map, step-by-step readiness roadmap.',
    },
    {
      icon: '⛔',
      title: 'The Post-Letter Founder',
      urgent: true,
      body: 'Has received a letter from SEC Nigeria, CBN, or NFIU. Does not understand it. Has 21 days to respond.',
      useCase: 'Letter analysis, 72-hour action plan, draft response, specialist connection.',
    },
    {
      icon: '🏗️',
      title: 'The Compliance Builder',
      urgent: false,
      body: 'Has clarity on what to do but lacks infrastructure to do it systematically. AML manual exists but nobody follows it. ARIP stalled at Stage 3.',
      useCase: 'ComplianceOS — smart checklists, document generators, compliance calendar.',
    },
    {
      icon: '🏢',
      title: 'The Corporate Innovator',
      urgent: false,
      body: 'Innovation lead at a bank, telco, or insurance company told to "do something with blockchain." No Web3 background, no compliance framework.',
      useCase: 'Guided onboarding, regulator map, roadmap appropriate for enterprise context.',
    },
    {
      icon: '⚖️',
      title: 'The Compliance Professional',
      urgent: false,
      body: 'Lawyer or compliance officer serving multiple clients across Nigeria or West Africa. Needs fast, citable regulatory intelligence and client-ready outputs.',
      useCase: 'Document analysis, regulatory Q&A, jurisdiction comparison, client-ready reports.',
    },
    {
      icon: '🌍',
      title: 'The Cross-Border Operator',
      urgent: false,
      body: 'Expanding beyond Nigeria into Ghana, Kenya, or South Africa. Each new market brings different regulators and a different compliance framework.',
      useCase: 'Jurisdiction gap analysis, multi-market readiness scoring, pan-African regulator intelligence.',
    },
  ];

  const institutionalDeliverables = [
    'Regulatory due diligence reports',
    'Startup Readiness Scores',
    'Product classification analysis',
    'Jurisdiction risk mapping',
    'Compliance maturity assessment',
    'Portfolio-wide regulatory monitoring',
  ];

  const institutionalSegments = [
    'Venture Capital Firms',
    'Private Equity',
    'Family Offices',
    'Development Finance Institutions',
    'Corporate Venture Arms',
    'Accelerators & Incubators',
  ];

  return (
    <section className="bg-[#0D2B45] px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {personas.map(({ icon, title, urgent, body, useCase }) => (
            <div
              key={title}
              className={`relative rounded-2xl border p-6 ${
                urgent
                  ? 'border-red-400/40 bg-red-950/30'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              {urgent && (
                <span className="absolute right-4 top-4 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                  Most Urgent
                </span>
              )}
              <div className="mb-3 text-3xl">{icon}</div>
              <h3 className="mb-2 text-base font-semibold text-white">{title}</h3>
              <p className="mb-4 text-sm text-white/60">{body}</p>
              <div className="rounded-lg bg-white/10 px-3 py-2">
                <p className="text-xs font-semibold text-[#0B6E6E]">KLARIFY DELIVERS</p>
                <p className="mt-1 text-xs text-white/70">{useCase}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Featured enterprise card: Institutional Investor */}
        <div className="relative overflow-hidden rounded-2xl border border-[#D4A843]/40 bg-gradient-to-br from-[#1A2F45] via-[#0D2B45] to-[#0B1E30] p-8">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#D4A843]/60 via-[#D4A843] to-[#D4A843]/60" />

          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#D4A843]/20 text-2xl">
                🏦
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">The Institutional Investor</h3>
                  <span className="rounded-full border border-[#D4A843]/50 bg-[#D4A843]/15 px-2.5 py-0.5 text-xs font-semibold text-[#D4A843]">
                    Enterprise
                  </span>
                </div>
                <p className="text-sm text-white/60">
                  VCs · Family Offices · DFIs · Private Equity · Accelerators
                </p>
              </div>
            </div>
          </div>

          <p className="mb-6 max-w-3xl text-sm leading-relaxed text-white/70">
            Portfolio companies may be operating without licences, mis-classified, or one regulator
            letter away from failure. Most investment teams lack the specialist diligence capability
            to know.
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <p className="mb-3 text-xs font-semibold tracking-wider text-[#D4A843]">
                KLARIFY DELIVERS
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {institutionalDeliverables.map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#D4A843]" />
                    <span className="text-sm text-white/80">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold tracking-wider text-[#D4A843]">
                WHO THIS SERVES
              </p>
              <div className="flex flex-col gap-2">
                {institutionalSegments.map((segment) => (
                  <div key={segment} className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#D4A843]/60" />
                    <span className="text-sm text-white/70">{segment}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-[#D4A843]/20 bg-[#D4A843]/5 px-4 py-3">
            <p className="text-xs text-[#D4A843]/90">
              <span className="font-semibold">Investor Mode, coming soon.</span>{' '}
              Portfolio-wide compliance dashboards, startup risk scoring, and regulatory due
              diligence reports.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */

function CtaBanner(): JSX.Element {
  return (
    <section className="bg-white px-6 py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="mb-4 text-3xl font-bold text-[#1A1A1A]">
          See which persona matches your situation
        </h2>
        <p className="mb-8 text-[#555555]">
          Sign up free. Onboarding takes 3 minutes and tailors the experience to where you are
          on your regulatory journey.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/sign-up"
            className="w-full rounded-xl bg-[#0B6E6E] px-8 py-4 text-base font-semibold text-white transition hover:bg-[#0A5F5F] sm:w-auto"
          >
            Get started free
          </Link>
          <Link
            href="/features"
            className="w-full rounded-xl border border-[#CCCCCC] px-8 py-4 text-base font-semibold text-[#1A1A1A] transition hover:border-[#0B6E6E] hover:text-[#0B6E6E] sm:w-auto"
          >
            See all features
          </Link>
        </div>
      </div>
    </section>
  );
}
