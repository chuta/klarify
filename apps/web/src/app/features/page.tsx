import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getOptionalUser } from '@/lib/supabase/server';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';

export const metadata: Metadata = {
  title: 'Features — Klarify',
  description:
    'Everything you need to build in regulated markets: AI regulatory Q&A, product classification, document analysis, live Readiness Score, smart roadmap, document generator, ARIP tracker, regulator engagement copilot, and banking readiness.',
};

/**
 * /features — full features inventory.
 *
 * Sections:
 *   1. Page header
 *   2. Features grid (9 cards across FounderCounsel + ComplianceOS)
 *   3. ARIP highlight card
 *   4. Regulator Relationship Intelligence highlight card
 *   5. Banking & Partner Readiness highlight card
 *   6. Full Readiness Score breakdown (8 dimensions)
 *   7. CTA banner
 */
export default async function FeaturesPage(): Promise<JSX.Element> {
  const user = await getOptionalUser();
  if (user) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <PageHeader />
      <FeaturesGrid />
      <ARIPFeatureCard />
      <RegulatorRelationshipCard />
      <BankingReadinessCard />
      <ReadinessBreakdown />
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
          Features
        </p>
        <h1 className="mb-4 text-4xl font-bold leading-tight text-white sm:text-5xl">
          Everything you need to build in{' '}
          <span className="text-[#D4A843]">regulated markets</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-white/70">
          Two engines, one platform. FounderCounsel answers the questions. ComplianceOS turns
          the answers into systematic, auditable action.
        </p>
        <Link
          href="/product-tour"
          className="mt-8 inline-block text-sm font-semibold text-[#0B6E6E] transition hover:text-[#0A5F5F]"
        >
          Preview the dashboard →
        </Link>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */

function FeaturesGrid(): JSX.Element {
  const features = [
    {
      icon: '⚖️',
      badge: 'FounderCounsel',
      badgeColour: '#0B6E6E',
      title: 'Regulatory Q&A with Citations',
      body: 'Ask anything. Get answers grounded in Nigerian and African law with exact section references, not generic advice.',
    },
    {
      icon: '🔍',
      badge: 'FounderCounsel',
      badgeColour: '#0B6E6E',
      title: 'Product Classification Engine',
      body: 'Describe your product. We classify it under SEC Nigeria VASP categories — DAX, DAOP, RATOP, AVASP, and more — and tell you which regulators you need to engage.',
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
    {
      icon: '🤝',
      badge: 'FounderCounsel',
      badgeColour: '#0B6E6E',
      title: 'Regulator Relationship Intelligence',
      body: 'Go beyond knowing the rules — learn how to work with regulators. Meeting prep, jurisdiction-specific etiquette, communication templates, escalation protocols, and institutional maturity scoring.',
    },
    {
      icon: '🏦',
      badge: 'ComplianceOS',
      badgeColour: '#D4A843',
      title: 'Banking & Partner Readiness',
      body: 'Compliance alone does not guarantee banking access. Klarify prepares your risk profile, institutional due diligence pack, and operational transparency systems so partners say yes.',
    },
  ];

  return (
    <section className="bg-[#FAFAFA] px-6 py-20">
      <div className="mx-auto max-w-5xl">
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
      </div>
    </section>
  );
}

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
    <section className="bg-white px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-2xl border-2 border-[#0B6E6E] bg-[#0D2B45]">
          <div className="grid md:grid-cols-2">
            <div className="p-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#D4A843]/20 px-3 py-1">
                <span className="text-xs font-bold uppercase tracking-wide text-[#D4A843]">
                  ARIP Framework · SEC Nigeria · June 2024
                </span>
              </div>
              <h3 className="mb-3 text-2xl font-bold text-white">
                Navigate the ARIP Process with Confidence
              </h3>
              <p className="mb-6 text-sm font-semibold text-[#0B6E6E]">
                The only compliance platform built around the SEC Nigeria ARIP Framework
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
                href="/sign-up"
                className="inline-block rounded-lg bg-[#0B6E6E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0A5F5F]"
              >
                Start Your ARIP Journey →
              </Link>
            </div>

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
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */

function RegulatorRelationshipCard(): JSX.Element {
  const capabilities = [
    { label: 'Meeting Preparation', desc: 'Pre-meeting briefings on regulator priorities, open enforcement actions, and institutional sensitivities' },
    { label: 'Communication Templates', desc: 'Jurisdiction-specific letter templates calibrated for tone, formality, and regulatory etiquette' },
    { label: 'Response Drafting', desc: 'Structured, legally neutral responses to information requests, co-operative, not combative' },
    { label: 'Engagement Timelines', desc: 'Recommended sequencing: who to engage first, when, and in what order across SEC, CBN, NFIU, and NITDA' },
    { label: '"What NOT to Say"', desc: 'Common mistakes that signal non-compliance or bad faith, avoid them before you walk into the room' },
    { label: 'Institutional Maturity Scoring', desc: 'How does your organisation appear to a regulator right now? Score and fix gaps before your first formal meeting' },
  ];

  return (
    <section className="bg-white px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-2xl border-2 border-[#0B6E6E] bg-white">
          <div className="grid md:grid-cols-2">
            <div className="bg-[#0D2B45] p-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#0B6E6E]/20 px-3 py-1">
                <span className="text-xs font-bold uppercase tracking-wide text-[#0B6E6E]">
                  FounderCounsel · Regulator Engagement Copilot
                </span>
              </div>
              <h3 className="mb-3 text-2xl font-bold text-white">
                Regulator Relationship Intelligence
              </h3>
              <p className="mb-6 text-sm font-semibold text-[#0B6E6E]">
                Knowing the rules is not enough. You need to know how to work with the people who enforce them.
              </p>
              <Link
                href="/sign-up"
                className="inline-block rounded-lg bg-[#0B6E6E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0A5F5F]"
              >
                Prepare for Your Regulator Meeting →
              </Link>
            </div>

            <div className="bg-[#FAFAFA] p-8">
              <p className="mb-5 text-xs font-bold uppercase tracking-widest text-[#555555]">
                What the Engagement Copilot gives you
              </p>
              <div className="space-y-4">
                {capabilities.map(({ label, desc }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0B6E6E]">
                      <span className="text-[10px] font-bold text-white">✓</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A1A]">{label}</p>
                      <p className="text-xs text-[#555555]">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */

function BankingReadinessCard(): JSX.Element {
  const pillars = [
    {
      icon: '🏦',
      title: 'Banking Readiness Score',
      body: 'Assess your profile against the risk criteria Nigerian and international correspondent banks apply to fintech and digital asset companies before opening accounts.',
    },
    {
      icon: '📋',
      title: 'Institutional Due Diligence Pack',
      body: 'Auto-generate the documentation package that banks, payment processors, and institutional partners request, KYC, UBO register, AML policy, source-of-funds narrative.',
    },
    {
      icon: '🎯',
      title: 'Risk Profile Optimisation',
      body: 'Identify the exact flags that cause banks to decline or terminate accounts, and fix them before your application, not after rejection.',
    },
    {
      icon: '🔍',
      title: 'Operational Transparency Systems',
      body: 'Transaction monitoring documentation, audit trail architecture, and reporting infrastructure that gives partners confidence your controls are real.',
    },
  ];

  return (
    <section className="bg-white px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-2xl border border-[#D4A843]/40 bg-[#FDF6E3]">
          <div className="p-8">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#D4A843]/20 px-3 py-1">
                  <span className="text-xs font-bold uppercase tracking-wide text-[#D4A843]">
                    ComplianceOS · Banking & Partner Readiness
                  </span>
                </div>
                <h3 className="mb-3 text-2xl font-bold text-[#0D2B45]">
                  Compliance alone does not open bank accounts.
                </h3>
                <p className="text-sm text-[#555555]">
                  Being compliant doesn&apos;t guarantee a bank account. Klarify prepares you for the
                  institutional due diligence that regulatory compliance alone doesn&apos;t cover.
                </p>
              </div>
              <div className="shrink-0">
                <Link
                  href="/sign-up"
                  className="inline-block rounded-lg bg-[#D4A843] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#C49A3A]"
                >
                  Check Your Banking Readiness →
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {pillars.map(({ icon, title, body }) => (
                <div
                  key={title}
                  className="rounded-xl border border-[#D4A843]/20 bg-white p-5 shadow-sm"
                >
                  <div className="mb-3 text-2xl">{icon}</div>
                  <h4 className="mb-2 text-sm font-semibold text-[#1A1A1A]">{title}</h4>
                  <p className="text-xs text-[#555555]">{body}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-[#C0392B]/20 bg-[#C0392B]/5 p-4">
              <p className="text-sm text-[#1A1A1A]">
                <span className="font-semibold text-[#C0392B]">The silent killer: </span>
                18 months of compliance work. Bank account still frozen. Payment processor
                offboarded. The compliance was real — it just wasn&apos;t designed for a bank&apos;s risk appetite.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */

function ReadinessBreakdown(): JSX.Element {
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
    <section className="bg-[#FAFAFA] px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-[#1A1A1A]">
            Your live Regulatory Readiness Score
          </h2>
          <p className="mx-auto max-w-2xl text-[#555555]">
            8 compliance dimensions, weighted by regulatory priority. Updates in real time as you
            complete tasks.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#CCCCCC] bg-white shadow-sm">
          <div className="border-b border-[#CCCCCC] bg-[#0D2B45] px-8 py-6">
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <div className="shrink-0">
                <svg width="120" height="80" viewBox="0 0 120 80">
                  <path
                    d="M 10 70 A 50 50 0 0 1 110 70"
                    fill="none"
                    stroke="#1A3A55"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
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

              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-red-400">
                  Critical, Significant gaps identified
                </p>
                <p className="mt-1 text-sm text-white/60">
                  Example score at sign-up. Your actual score updates as you complete tasks.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2">
            {dimensions.map(({ name, score, weight }) => (
              <div key={name} className="rounded-xl bg-[#FAFAFA] p-4 shadow-sm">
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

          <div className="border-t border-[#CCCCCC] bg-[#E6F4F4] px-8 py-5 text-center">
            <p className="mb-3 text-sm text-[#555555]">
              Answer 5 questions to get your real Readiness Score, takes under 3 minutes
            </p>
            <Link
              href="/sign-up"
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

function CtaBanner(): JSX.Element {
  return (
    <section className="bg-[#0D2B45] px-6 py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="mb-4 text-3xl font-bold text-white">
          See these features at work in your business
        </h2>
        <p className="mb-8 text-white/60">
          Sign up free, complete onboarding in 3 minutes, and start using FounderCounsel and
          ComplianceOS today.
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
            Take the product tour
          </Link>
        </div>
      </div>
    </section>
  );
}
