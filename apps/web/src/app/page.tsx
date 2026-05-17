import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * / — Klarify landing page.
 *
 * Auth guard: authenticated users are redirected to /dashboard.
 *
 * Sections (in order):
 *   1. Navbar
 *   2. Hero
 *   3. Problem
 *   4. Two Engines (FounderCounsel + ComplianceOS)
 *   5. Features
 *   6. Who It's For (7 segments — 6 cards + 1 featured enterprise card)
 *   7. Readiness Score Preview
 *   8. How It Works
 *   9. Pricing
 *  10. CTA Banner
 *  11. Footer (with mandatory legal disclaimer)
 */
export default async function HomePage(): Promise<JSX.Element> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <ProblemSection />
      <TwoEngines />
      <Features />
      <WhoItIsFor />
      <ReadinessPreview />
      <HowItWorks />
      <Pricing />
      <CtaBanner />
      <Footer />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  1. NAVBAR                                                  */
/* ─────────────────────────────────────────────────────────── */

function Navbar(): JSX.Element {
  return (
    <header className="sticky top-0 z-50 border-b border-[#1A3A55] bg-[#0D2B45]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
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

        {/* Nav links (desktop) */}
        <nav className="hidden items-center gap-6 md:flex">
          <a href="#features" className="text-sm text-white/70 transition hover:text-white">
            Features
          </a>
          <a href="#who" className="text-sm text-white/70 transition hover:text-white">
            Who It&apos;s For
          </a>
          <a href="#pricing" className="text-sm text-white/70 transition hover:text-white">
            Pricing
          </a>
        </nav>

        {/* CTA buttons */}
        <div className="flex items-center gap-3">
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
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  2. HERO                                                    */
/* ─────────────────────────────────────────────────────────── */

function Hero(): JSX.Element {
  return (
    <section className="bg-[#0D2B45] px-6 py-24">
      <div className="mx-auto max-w-4xl text-center">
        {/* Eyebrow */}
        <p className="mb-5 inline-block rounded-full border border-[#0B6E6E]/60 bg-[#0B6E6E]/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#0B6E6E]">
          AI-Powered Regulatory Compliance for African Founders
        </p>

        {/* Headline */}
        <h1 className="mb-6 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
          Navigate{' '}
          <span className="text-[#D4A843]">Regulated Markets</span>
          <br />
          with Confidence
        </h1>

        {/* Sub-headline */}
        <p className="mx-auto mb-10 max-w-2xl text-lg text-white/70">
          Klarify gives Nigerian and African founders instant regulatory clarity, product
          classification, compliance infrastructure, document analysis, and AI advisory in
          one platform. Know what you need. Build what matters.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/sign-in"
            className="w-full rounded-xl bg-[#0B6E6E] px-8 py-4 text-base font-semibold text-white transition hover:bg-[#0A5F5F] sm:w-auto"
          >
            Get your Readiness Score, Free
          </Link>
          <a
            href="#features"
            className="w-full rounded-xl border border-white/20 px-8 py-4 text-base font-semibold text-white transition hover:border-white/40 sm:w-auto"
          >
            See how it works
          </a>
        </div>

        {/* Trust signal */}
        <p className="mt-6 text-sm text-white/40">
          No credit card required · Free plan available · Nigerian &amp; African regulatory
          frameworks
        </p>

        {/* Score progression teaser */}
        <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { score: 0, label: 'Day 1', colour: '#C0392B' },
            { score: 35, label: 'Week 2', colour: '#D4A843' },
            { score: 62, label: 'Month 1', colour: '#D4A843' },
            { score: 84, label: 'Month 3', colour: '#1A7A4A' },
          ].map(({ score, label, colour }) => (
            <div
              key={label}
              className="rounded-xl border border-white/10 bg-white/5 p-4 text-center"
            >
              <div
                className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full border-4 text-lg font-bold text-white"
                style={{ borderColor: colour }}
              >
                {score}
              </div>
              <p className="text-xs text-white/50">{label}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-white/30">
          Typical founder journey from sign-up to Regulator Ready
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  3. PROBLEM                                                 */
/* ─────────────────────────────────────────────────────────── */

function ProblemSection(): JSX.Element {
  const problems = [
    {
      icon: '📋',
      title: 'You don\'t know what you don\'t know',
      body: 'Most Nigerian founders discover they need a licence only after building for months, or after receiving a regulator\'s letter. Klarify closes this gap on Day 1.',
    },
    {
      icon: '⛔',
      title: 'Regulatory letters trigger panic',
      body: 'A letter from SEC Nigeria or CBN is terrifying without context. You have 21 days and no idea what they\'re asking. Klarify translates it into a 72-hour action plan.',
    },
    {
      icon: '🗃️',
      title: 'Compliance is manual and fragmented',
      body: 'AML manuals nobody follows. STRs filed late. ARIP applications stalled at Stage 3. Klarify replaces scattered documents and spreadsheets with a live compliance operating system.',
    },
  ];

  return (
    <section className="bg-[#FAFAFA] px-6 py-20">
      <div className="mx-auto max-w-5xl">
        {/* Pull quote from The Founder's Guide */}
        <blockquote className="mb-16 border-l-4 border-[#0B6E6E] bg-white px-8 py-6 text-base italic text-[#555555] shadow-sm">
          &ldquo;African founders building in regulated markets face a recurring, expensive, and
          often business-ending gap — they do not know what they do not know. They build for
          months before discovering their product requires a licence.&rdquo;
          <footer className="mt-3 text-sm font-semibold not-italic text-[#0B6E6E]">
            — <em>The Founder&apos;s Guide to Building in Regulated Markets</em>, Chimezie
            Chuta, 2026
          </footer>
        </blockquote>

        <div className="mb-8 text-center">
          <h2 className="mb-3 text-3xl font-bold text-[#1A1A1A]">
            The compliance gap is real. And expensive.
          </h2>
          <p className="mx-auto max-w-2xl text-[#555555]">
            From pre-launch classification to post-letter crisis response to ongoing operational
            compliance, Klarify covers the entire regulatory journey.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {problems.map(({ icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-[#CCCCCC] bg-white p-6 shadow-sm"
            >
              <div className="mb-4 text-3xl">{icon}</div>
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
/*  4. TWO ENGINES                                            */
/* ─────────────────────────────────────────────────────────── */

function TwoEngines(): JSX.Element {
  return (
    <section className="bg-white px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-[#1A1A1A]">Two engines in one platform</h2>
          <p className="mx-auto max-w-2xl text-[#555555]">
            Klarify combines an AI advisory engine with a compliance operating system, because
            knowing what to do and actually doing it are two different problems.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* FounderCounsel */}
          <div className="rounded-2xl border border-[#0B6E6E]/20 bg-[#E6F4F4] p-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#0B6E6E] px-3 py-1">
              <span className="text-xs font-bold uppercase tracking-wide text-white">
                FounderCounsel
              </span>
            </div>
            <h3 className="mb-3 text-xl font-bold text-[#0D2B45]">AI Advisory Engine</h3>
            <p className="mb-6 text-sm text-[#555555]">
              Ask any regulatory question in plain English. Get instant answers grounded in
              ISA 2025, SEC Digital Asset Rules, MLPPA 2022, CBN guidelines, and pan-African
              frameworks, always with citations.
            </p>
            <ul className="space-y-3">
              {[
                'AI regulatory Q&A with citations to specific sections',
                'Product classification engine (what licence does my product need?)',
                'Document analyser: upload a regulator letter → get 72-hour action plan',
                'Scenario simulator (what happens if I do X?)',
                'Jurisdiction expansion adviser (Nigeria → Ghana/Kenya/SA)',
                'Human escalation to vetted specialist network',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[#555555]">
                  <span className="mt-0.5 shrink-0 text-[#0B6E6E]">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* ComplianceOS */}
          <div className="rounded-2xl border border-[#D4A843]/20 bg-[#FDF6E3] p-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#D4A843] px-3 py-1">
              <span className="text-xs font-bold uppercase tracking-wide text-white">
                ComplianceOS
              </span>
            </div>
            <h3 className="mb-3 text-xl font-bold text-[#0D2B45]">Operational Engine</h3>
            <p className="mb-6 text-sm text-[#555555]">
              Turn regulatory knowledge into systematic action. A live compliance score, smart
              roadmap, document generator, ARIP tracker, and regulator CRM, all in one place.
            </p>
            <ul className="space-y-3">
              {[
                'Regulatory Readiness Score (0–100) across 8 dimensions',
                'Smart Compliance Roadmap (personalised Kanban, 4 phases)',
                'Compliance document generator (13 regulatory templates)',
                'ARIP application tracker (5-stage process, ARIP Framework 2024)',
                'Regulator engagement CRM (all Nigerian regulators pre-loaded)',
                'Compliance calendar with automated deadline alerts',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[#555555]">
                  <span className="mt-0.5 shrink-0 text-[#D4A843]">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  5. FEATURES                                               */
/* ─────────────────────────────────────────────────────────── */

function Features(): JSX.Element {
  const features = [
    {
      icon: '⚖️',
      badge: 'FounderCounsel',
      badgeColour: '#0B6E6E',
      title: 'Regulatory Q&A with Citations',
      body: 'Ask anything. Get answers grounded in Nigerian and African law with exact section references — not generic advice.',
    },
    {
      icon: '🔍',
      badge: 'FounderCounsel',
      badgeColour: '#0B6E6E',
      title: 'Product Classification Engine',
      body: 'Describe your product. We classify it as DAX, DAOP, DAC, DAI, or Payment — and tell you exactly which regulators you need to engage.',
    },
    {
      icon: '📄',
      badge: 'FounderCounsel',
      badgeColour: '#0B6E6E',
      title: 'Regulatory Letter Analyser',
      body: 'Upload a letter from SEC Nigeria, CBN, or NFIU. Get a plain-English summary, urgency rating, 72-hour action plan, and a draft response.',
    },
    {
      icon: '📊',
      badge: 'ComplianceOS',
      badgeColour: '#D4A843',
      title: 'Live Readiness Score',
      body: 'A 0–100 gauge across 8 compliance dimensions that updates in real time as you complete tasks, upload documents, and tick off indicators.',
    },
    {
      icon: '🗺️',
      badge: 'ComplianceOS',
      badgeColour: '#D4A843',
      title: 'Smart Compliance Roadmap',
      body: 'A personalised, phase-locked Kanban board. Complete Phase 1 to unlock Phase 2. Each task links to the specific regulatory requirement it satisfies.',
    },
    {
      icon: '📁',
      badge: 'ComplianceOS',
      badgeColour: '#D4A843',
      title: 'Document Generator',
      body: 'Generate 13 regulatory documents in minutes: BWRA, AML/CFT Policy, KYC Tiers Framework, ARIP Operational Plan, Sworn Undertakings, Entity Rules, and more.',
    },
    {
      icon: '📋',
      badge: 'ComplianceOS',
      badgeColour: '#D4A843',
      title: 'ARIP Process Tracker',
      body: 'Navigate the 5-stage ARIP process with stage-by-stage checklists, the 10% customer growth cap monitor, AIP restrictions tracker, and solicitor engagement workflows.',
    },
  ];

  return (
    <section id="features" className="bg-[#FAFAFA] px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-[#1A1A1A]">
            Everything you need to build in regulated markets
          </h2>
          <p className="mx-auto max-w-2xl text-[#555555]">
            From your first question about licences to your ARIP application to your ongoing
            STR filings, Klarify covers the full compliance lifecycle.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon, badge, badgeColour, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-[#CCCCCC] bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-3xl">{icon}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: badgeColour }}
                >
                  {badge}
                </span>
              </div>
              <h3 className="mb-2 text-base font-semibold text-[#1A1A1A]">{title}</h3>
              <p className="text-sm text-[#555555]">{body}</p>
            </div>
          ))}
        </div>

        {/* ARIP Feature Highlight Card */}
        <ARIPFeatureCard />
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  5b. ARIP FEATURE CARD                                      */
/* ─────────────────────────────────────────────────────────── */

function ARIPFeatureCard(): JSX.Element {
  const stages = [
    'Initial Assessment',
    'Eligibility Notification',
    'Formal Application',
    'AIP Active',
    'Transition',
  ];

  return (
    <div className="mt-12 overflow-hidden rounded-2xl border-2 border-[#0B6E6E] bg-[#0D2B45]">
      <div className="grid md:grid-cols-2">
        {/* Left: copy */}
        <div className="p-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#D4A843]/20 px-3 py-1">
            <span className="text-xs font-bold uppercase tracking-wide text-[#D4A843]">
              ARIP Framework · SEC Nigeria · June 2024
            </span>
          </div>
          <h3 className="mb-3 text-2xl font-bold text-white">
            Navigate the ARIP Process with Confidence
          </h3>
          <p className="mb-2 text-sm font-semibold text-[#0B6E6E]">
            The only compliance platform built around the SEC Nigeria ARIP Framework
          </p>
          <p className="mb-6 text-sm text-white/70">
            From Initial Assessment through Approval-in-Principle to full registration —
            Klarify guides you through every stage of the 5-stage ARIP process with
            checklists, document templates, deadline alerts, and automatic monitoring of
            AIP conditions including the 10% customer growth cap.
          </p>
          <ul className="mb-8 space-y-2">
            {[
              '13-document compliance library including ARIP Operational Plan, Sworn Undertaking, and Entity Rules',
              '10% customer growth cap tracker — monitors AIP compliance automatically',
              'AIP restrictions monitor — prevents accidental breach of promotional ban',
              '11-task ARIP application roadmap — from solicitor engagement to AIP receipt',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-white/70">
                <span className="mt-0.5 shrink-0 text-[#D4A843]">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/sign-in"
            className="inline-block rounded-lg bg-[#0B6E6E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0A5F5F]"
          >
            Start Your ARIP Journey →
          </Link>
        </div>

        {/* Right: 5-stage visual */}
        <div className="flex items-center justify-center bg-[#0B2035] p-8">
          <div className="w-full max-w-xs">
            <p className="mb-5 text-center text-xs font-bold uppercase tracking-widest text-white/40">
              5-Stage ARIP Process
            </p>
            <div className="space-y-3">
              {stages.map((stage, i) => (
                <div key={stage} className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: i === 3 ? '#D4A843' : '#0B6E6E',
                      color: 'white',
                    }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                      {stage}
                      {i === 2 && (
                        <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                          Solicitor Required
                        </span>
                      )}
                      {i === 3 && (
                        <span className="ml-2 rounded bg-[#D4A843]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#D4A843]">
                          Growth Cap Active
                        </span>
                      )}
                    </p>
                  </div>
                  {i < stages.length - 1 && (
                    <div className="absolute ml-3.5 mt-8 h-3 w-px bg-white/10" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  6. WHO IT'S FOR                                           */
/* ─────────────────────────────────────────────────────────── */

function WhoItIsFor(): JSX.Element {
  const personas = [
    {
      icon: '🚀',
      title: 'The Pre-Launch Founder',
      urgent: false,
      body: 'Building a digital asset product in Nigeria. Has not yet engaged any regulator. May have been building for months without knowing they need a licence.',
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
      body: 'Licensed or operational in Nigeria and expanding into Ghana, Kenya, or South Africa. Each new market brings fresh regulators, new capital requirements, and a different compliance stack.',
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
    <section id="who" className="bg-[#0D2B45] px-6 py-20">
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-white">
            Built for every stage of the journey
          </h2>
          <p className="mx-auto max-w-2xl text-white/60">
            Whether you&apos;re classifying your first product, responding to a regulator, deploying
            capital, or advising clients, Klarify meets you where you are.
          </p>
        </div>

        {/* 6-card grid (2 × 3) */}
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

        {/* ── Featured enterprise card: Institutional Investor ── */}
        <div className="relative overflow-hidden rounded-2xl border border-[#D4A843]/40 bg-gradient-to-br from-[#1A2F45] via-[#0D2B45] to-[#0B1E30] p-8">
          {/* Gold top-accent line */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#D4A843]/60 via-[#D4A843] to-[#D4A843]/60" />

          {/* Header row */}
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

          {/* Pain point */}
          <p className="mb-6 max-w-3xl text-sm leading-relaxed text-white/70">
            Investing in African fintech, digital assets, or Web3 startups without clear visibility
            into licensing exposure, regulatory risk, or compliance maturity. Portfolio companies may
            be operating without required licences, mis-classified, or one regulator letter away from
            collapse! Most investment teams lack the regulatory diligence capability to know.
          </p>

          {/* Two-column breakdown */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Deliverables */}
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

            {/* Segments */}
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

          {/* Strategic note */}
          <div className="mt-6 rounded-xl border border-[#D4A843]/20 bg-[#D4A843]/5 px-4 py-3">
            <p className="text-xs text-[#D4A843]/90">
              <span className="font-semibold">Investor Mode — coming soon.</span>{' '}
              Portfolio compliance dashboards, due diligence reports, startup risk benchmarking, and
              regulatory health scoring across your entire investment portfolio.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  7. READINESS SCORE PREVIEW                                */
/* ─────────────────────────────────────────────────────────── */

function ReadinessPreview(): JSX.Element {
  const dimensions = [
    { name: 'Corporate Structure', score: 40, weight: '10%' },
    { name: 'Capital & Licensing', score: 20, weight: '20%' },
    { name: 'KYC Infrastructure', score: 30, weight: '15%' },
    { name: 'AML/CFT Programme', score: 10, weight: '20%' },
    { name: 'Transaction Monitoring', score: 0, weight: '10%' },
    { name: 'Regulatory Reporting', score: 20, weight: '10%' },
    { name: 'Regulator Relationships', score: 0, weight: '10%' },
    { name: 'Product Classification', score: 75, weight: '5%' },
  ];

  const totalScore = 23;

  function getBarColour(score: number): string {
    if (score <= 40) return '#C0392B';
    if (score <= 70) return '#D4A843';
    if (score <= 90) return '#1A7A4A';
    return '#0B6E6E';
  }

  return (
    <section className="bg-white px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-[#1A1A1A]">
            Your live Regulatory Readiness Score
          </h2>
          <p className="mx-auto max-w-2xl text-[#555555]">
            A 0–100 score across 8 compliance dimensions, calibrated to Nigerian and African
            regulatory requirements. It updates in real time as you act.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#CCCCCC] bg-[#FAFAFA] shadow-sm">
          {/* Score header */}
          <div className="border-b border-[#CCCCCC] bg-[#0D2B45] px-8 py-6">
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              {/* Static SVG gauge */}
              <div className="shrink-0">
                <svg width="120" height="80" viewBox="0 0 120 80">
                  {/* Track */}
                  <path
                    d="M 10 70 A 50 50 0 0 1 110 70"
                    fill="none"
                    stroke="#1A3A55"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  {/* Fill — 23% of the arc */}
                  <path
                    d="M 10 70 A 50 50 0 0 1 110 70"
                    fill="none"
                    stroke="#C0392B"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="157"
                    strokeDashoffset={`${157 - (157 * totalScore) / 100}`}
                  />
                  <text
                    x="60"
                    y="65"
                    textAnchor="middle"
                    fontSize="20"
                    fontWeight="bold"
                    fill="white"
                  >
                    {totalScore}
                  </text>
                </svg>
              </div>

              {/* Score details */}
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-red-400">
                  Critical, Significant gaps identified
                </p>
                <p className="mt-1 text-white/60 text-sm">
                  Example score for a founder who just completed onboarding. Your actual score
                  updates as you complete tasks and build compliance infrastructure.
                </p>
              </div>
            </div>
          </div>

          {/* Dimension breakdown */}
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            {dimensions.map(({ name, score, weight }) => (
              <div key={name} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1A1A1A]">{name}</span>
                  <span className="text-xs text-[#555555]">{weight} weight</span>
                </div>
                <div className="mb-1 h-2 overflow-hidden rounded-full bg-[#F5F5F5]">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${score}%`,
                      backgroundColor: getBarColour(score),
                    }}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-[#555555]">{score}/100</span>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="border-t border-[#CCCCCC] bg-[#E6F4F4] px-8 py-5 text-center">
            <p className="mb-3 text-sm text-[#555555]">
              Answer 5 questions to get your real Readiness Score, takes under 3 minutes
            </p>
            <Link
              href="/sign-in"
              className="inline-block rounded-lg bg-[#0B6E6E] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0A5F5F]"
            >
              Calculate my Readiness Score →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  8. HOW IT WORKS                                           */
/* ─────────────────────────────────────────────────────────── */

function HowItWorks(): JSX.Element {
  const steps = [
    {
      step: '01',
      title: 'Answer 5 questions',
      body: 'Tell us what you\'re building, which markets you\'re targeting, and where you are in the compliance journey. Takes under 3 minutes.',
    },
    {
      step: '02',
      title: 'Get your Readiness Score',
      body: 'Receive an instant 0–100 score across 8 regulatory dimensions, calibrated to Nigerian and African frameworks. Understand exactly where your gaps are.',
    },
    {
      step: '03',
      title: 'Work your personalised roadmap',
      body: 'A phase-locked compliance roadmap guides you from corporate structure to ARIP registration. Every task links to the specific regulatory requirement it satisfies.',
    },
  ];

  return (
    <section className="bg-[#FAFAFA] px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-[#1A1A1A]">
            From sign-up to compliance clarity in 3 minutes
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map(({ step, title, body }) => (
            <div key={step} className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#0B6E6E] text-lg font-bold text-white">
                {step}
              </div>
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
/*  9. PRICING                                                */
/* ─────────────────────────────────────────────────────────── */

function Pricing(): JSX.Element {
  return (
    <section id="pricing" className="bg-white px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-[#1A1A1A]">
            Transparent, founder-friendly pricing
          </h2>
          <p className="text-[#555555]">
            Start free. Upgrade when you need more power. All prices in USD, billed in Naira at
            the prevailing rate.
          </p>
        </div>

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
              href="/sign-in"
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
              href="/sign-in"
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
              href="/sign-in"
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
            <Link
              href="/sign-in"
              className="block w-full rounded-lg border border-[#D4A843] px-4 py-2.5 text-center text-sm font-semibold text-[#D4A843] transition hover:bg-[#D4A843]/10"
            >
              Start Flagship
            </Link>
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
/*  10. CTA BANNER                                            */
/* ─────────────────────────────────────────────────────────── */

function CtaBanner(): JSX.Element {
  return (
    <section className="bg-[#0D2B45] px-6 py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="mb-4 text-3xl font-bold text-white">
          Start building with regulatory confidence today
        </h2>
        <p className="mb-8 text-white/60">
          Answer 5 questions. Get your Readiness Score in 3 minutes. Know exactly what you need
          to build in Nigerian and African regulated markets.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/sign-in"
            className="w-full rounded-xl bg-[#0B6E6E] px-8 py-4 text-base font-semibold text-white transition hover:bg-[#0A5F5F] sm:w-auto"
          >
            Get your Readiness Score, Free
          </Link>
          <Link
            href="/sign-in"
            className="w-full rounded-xl border border-white/20 px-8 py-4 text-base font-semibold text-white transition hover:border-white/40 sm:w-auto"
          >
            Sign in to your account
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  11. FOOTER (mandatory legal disclaimer per CLAUDE.md §16) */
/* ─────────────────────────────────────────────────────────── */

function Footer(): JSX.Element {
  return (
    <footer className="border-t border-[#CCCCCC] bg-[#FAFAFA] px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Image
              src="/klarify_logo.png"
              alt="Klarify"
              width={100}
              height={34}
              className="mb-2 object-contain"
            />
            <p className="mb-4 text-sm text-[#555555]">
              AI-powered regulatory compliance and advisory for founders building digital asset and
              fintech products in African regulated markets.
            </p>
            <p className="text-xs text-[#555555]">
              Klarify is a product of Blockspace Technologies Limited · Lagos, Nigeria
            </p>
            <p className="text-xs text-[#555555]">klarify.africa · hello@klarify.africa</p>
          </div>

          {/* Product */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#1A1A1A]">
              Product
            </p>
            <ul className="space-y-2 text-sm text-[#555555]">
              <li><a href="#features" className="hover:text-[#0B6E6E]">Features</a></li>
              <li><a href="#pricing" className="hover:text-[#0B6E6E]">Pricing</a></li>
              <li><Link href="/sign-in" className="hover:text-[#0B6E6E]">Sign in</Link></li>
              <li><Link href="/sign-in" className="hover:text-[#0B6E6E]">Get started free</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#1A1A1A]">
              Legal
            </p>
            <ul className="space-y-2 text-sm text-[#555555]">
              <li><a href="#" className="hover:text-[#0B6E6E]">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#0B6E6E]">Terms of Service</a></li>
              <li><a href="#" className="hover:text-[#0B6E6E]">Cookie Policy</a></li>
            </ul>
          </div>
        </div>

        {/* MANDATORY LEGAL DISCLAIMER — must never be removed (CLAUDE.md §16 Rule 1) */}
        <div className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-700">
            Important Legal Notice
          </p>
          <p className="text-xs text-amber-800">
            Klarify provides regulatory information and educational guidance only, not legal
            advice. All AI-generated content on this platform is for informational purposes and
            must not be relied upon as a substitute for advice from a qualified Nigerian legal or
            compliance practitioner. Regulatory frameworks are subject to change. Always verify
            current requirements directly with the relevant regulatory authority. Klarify accepts
            no liability for regulatory decisions made based on information provided through this
            platform. For advice specific to your situation, consult a qualified practitioner.
          </p>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-[#555555]">
            © {new Date().getFullYear()} Blockspace Technologies Limited. All rights reserved.
          </p>
          <p className="text-xs text-[#555555]">
            Powered by Klarify Team · Grounded in ISA 2025, SEC Digital Asset Rules, MLPPA
            2022
          </p>
        </div>
      </div>
    </footer>
  );
}
