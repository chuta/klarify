import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getOptionalUser } from '@/lib/supabase/server';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';

/**
 * / — Klarify landing page.
 *
 * Auth guard: authenticated users are redirected to /dashboard.
 *
 * Lean landing structure (per Sprint 4 marketing-page split):
 *   - Hero, Problem, Two Engines teaser, slim Readiness Score teaser,
 *     How It Works, CTA Banner.
 *
 * Detailed content lives on dedicated pages:
 *   - /features  → full feature grid + ARIP + Regulator Intelligence + Banking + full Readiness breakdown
 *   - /who-its-for → 6 personas + Institutional Investor enterprise card
 *   - /pricing → 4-tier pricing + comparison + FAQ
 */
export default async function HomePage(): Promise<JSX.Element> {
  const user = await getOptionalUser();
  if (user) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <ProblemSection />
      <TwoEngines />
      <ReadinessTeaser />
      <HowItWorks />
      <CtaBanner />
      <Footer />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  HERO                                                       */
/* ─────────────────────────────────────────────────────────── */

function Hero(): JSX.Element {
  return (
    <section className="bg-[#0D2B45] px-6 py-24">
      <div className="mx-auto max-w-4xl text-center">
        <p className="mb-5 inline-block rounded-full border border-[#0B6E6E]/60 bg-[#0B6E6E]/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#0B6E6E]">
          Become regulator-ready, institution-ready, and trust-ready.
        </p>

        <h1 className="mb-6 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
          Navigate{' '}
          <span className="text-[#D4A843]">Regulated Markets</span>
          <br />
          with Confidence
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg text-white/70">
          Know what licences you need. Respond to regulators with confidence. Build your
          compliance infrastructure from day one. All in one platform.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/sign-up"
            className="w-full rounded-xl bg-[#0B6E6E] px-8 py-4 text-base font-semibold text-white transition hover:bg-[#0A5F5F] sm:w-auto"
          >
            Get your Readiness Score, Free
          </Link>
          <Link
            href="/features"
            className="w-full rounded-xl border border-white/20 px-8 py-4 text-base font-semibold text-white transition hover:border-white/40 sm:w-auto"
          >
            See how it works
          </Link>
        </div>

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
/*  PROBLEM                                                    */
/* ─────────────────────────────────────────────────────────── */

function ProblemSection(): JSX.Element {
  const problems = [
    {
      icon: '📋',
      title: 'You don\'t know what you don\'t know',
      body: 'Most founders discover they need a licence only after building for months, or after receiving a regulator\'s letter.',
    },
    {
      icon: '⛔',
      title: 'Regulatory letters trigger panic',
      body: 'A letter from SEC Nigeria, CBN, or NFIU is terrifying without context. You have 21 days and no idea what they\'re asking.',
    },
    {
      icon: '🗃️',
      title: 'Compliance is manual and fragmented',
      body: 'AML manuals nobody follows. STRs filed late. ARIP stalled at Stage 3. Scattered documents and spreadsheets are not a compliance system.',
    },
  ];

  return (
    <section className="bg-[#FAFAFA] px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <blockquote className="mb-16 border-l-4 border-[#0B6E6E] bg-white px-8 py-6 text-base italic text-[#555555] shadow-sm">
          &ldquo;African founders face recurring, and expensive regulatory gaps. They do not know what they
          do not know.&rdquo;
          <footer className="mt-3 text-sm font-semibold not-italic text-[#0B6E6E]">
            — <em>The Founder&apos;s Guide to Building in Regulated Markets</em>, Chimezie
            Chuta, 2026
          </footer>
        </blockquote>

        <div className="mb-8 text-center">
          <h2 className="mb-3 text-3xl font-bold text-[#1A1A1A]">
            The compliance gap is real. And expensive.
          </h2>
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
/*  TWO ENGINES                                                */
/* ─────────────────────────────────────────────────────────── */

function TwoEngines(): JSX.Element {
  return (
    <section className="bg-white px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-[#1A1A1A]">Two engines in one platform</h2>
          <p className="mx-auto max-w-2xl text-[#555555]">
            Knowing what to do and actually doing it are two different problems.
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
              Ask any regulatory question. Get instant answers in plain English, grounded in
              Nigerian and African law, always with citations.
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
              Turn regulatory knowledge into systematic action. Live score, smart roadmap,
              document generator, ARIP tracker, and regulator CRM.
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

        <div className="mt-10 text-center">
          <Link
            href="/features"
            className="inline-block rounded-lg border border-[#0B6E6E] px-6 py-3 text-sm font-semibold text-[#0B6E6E] transition hover:bg-[#E6F4F4]"
          >
            See all features →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  READINESS SCORE TEASER (slim version — full breakdown on /features) */
/* ─────────────────────────────────────────────────────────── */

function ReadinessTeaser(): JSX.Element {
  const totalScore = 23;

  return (
    <section className="bg-[#FAFAFA] px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <h2 className="mb-3 text-3xl font-bold text-[#1A1A1A]">
            Your live Regulatory Readiness Score
          </h2>
          <p className="mx-auto max-w-2xl text-[#555555]">
            A single 0–100 number that tells you where you stand — and updates the moment you
            close a compliance gap.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#CCCCCC] bg-white shadow-sm">
          <div className="bg-[#0D2B45] px-8 py-10">
            <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-center">
              <div className="shrink-0">
                <svg width="160" height="100" viewBox="0 0 120 80">
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
                    fontSize="22"
                    fontWeight="bold"
                    fill="white"
                  >
                    {totalScore}
                  </text>
                </svg>
              </div>

              <div className="text-center sm:text-left">
                <p className="text-sm font-semibold uppercase tracking-wide text-red-400">
                  Critical, Significant gaps identified
                </p>
                <p className="mt-2 max-w-sm text-sm text-white/60">
                  Example score at sign-up. Your actual score reflects 8 weighted compliance
                  dimensions and updates in real time.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-[#CCCCCC] bg-[#E6F4F4] px-8 py-5 text-center">
            <p className="mb-3 text-sm text-[#555555]">
              Answer 5 questions to get your real Readiness Score, takes under 3 minutes
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-block rounded-lg bg-[#0B6E6E] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0A5F5F]"
              >
                Calculate my Readiness Score →
              </Link>
              <Link
                href="/features"
                className="inline-block text-sm font-semibold text-[#0B6E6E] transition hover:text-[#0A5F5F]"
              >
                See the full 8-dimension breakdown →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  HOW IT WORKS                                               */
/* ─────────────────────────────────────────────────────────── */

function HowItWorks(): JSX.Element {
  const steps = [
    {
      step: '01',
      title: 'Answer 5 questions',
      body: 'Tell us what you\'re building and which markets you\'re targeting. Takes under 3 minutes.',
    },
    {
      step: '02',
      title: 'Get your Readiness Score',
      body: 'Receive an instant 0–100 score across 8 compliance dimensions. Understand exactly where your gaps are.',
    },
    {
      step: '03',
      title: 'Work your personalised roadmap',
      body: 'A phase-locked roadmap guides you from corporate structure to ARIP registration. Every task links to the specific regulatory requirement it satisfies.',
    },
  ];

  return (
    <section className="bg-white px-6 py-20">
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
/*  CTA BANNER                                                 */
/* ─────────────────────────────────────────────────────────── */

function CtaBanner(): JSX.Element {
  return (
    <section className="bg-[#0D2B45] px-6 py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="mb-4 text-3xl font-bold text-white">
          Start building with regulatory confidence today
        </h2>
        <p className="mb-8 text-white/60">
          Know your regulatory gaps in 3 minutes. No credit card required.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/sign-up"
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
