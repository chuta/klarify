/**
 * Send lifecycle drip emails on demand — no cron wait.
 *
 * Usage (from apps/api):
 *   pnpm test:drips -- chimeziechuta@gmail.com
 *   pnpm test:drips -- chimeziechuta@gmail.com readiness
 *   pnpm test:drips -- chimeziechuta@gmail.com --cron
 *
 * Requires RESEND_API_KEY + EMAIL_FROM in ../../.env
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

(function loadRootEnv(): void {
  try {
    const envPath = resolve(process.cwd(), '../../.env');
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (key && !(key in process.env)) process.env[key] = val;
    }
  } catch {
    /* .env optional if vars already exported */
  }
})();

type DripKey =
  | 'abandoned'
  | 'readiness'
  | 'case-study'
  | 'plan-compare'
  | 'launch-offer'
  | 'all';

const STEP_ALIASES: Record<string, DripKey> = {
  abandoned:        'abandoned',
  readiness:        'readiness',
  'case-study':     'case-study',
  casestudy:        'case-study',
  postletter:       'case-study',
  plan:             'plan-compare',
  'plan-compare':   'plan-compare',
  offer:            'launch-offer',
  'launch-offer':   'launch-offer',
  all:              'all',
};

function usage(): never {
  console.error(`
Usage:
  pnpm test:drips -- <email> [step] [--cron]

Steps (default: all):
  abandoned      Your Readiness Score is waiting (incomplete onboarding)
  readiness      Day 2 — Readiness Score explained
  case-study     Day 4 — Post-letter founder case study
  plan-compare   Day 6 — Navigator vs Compass
  launch-offer   Day 9 — Launch coupon expiry

Options:
  --cron         Run runLifecycleDrips() against the DB instead of direct sends
  --help         Show this help

Examples:
  pnpm test:drips -- you@gmail.com
  pnpm test:drips -- you@gmail.com readiness
  pnpm test:drips -- you@gmail.com --cron
`);
  process.exit(1);
}

async function sendDirect(to: string, step: DripKey): Promise<void> {
  const {
    sendDripAbandonedOnboardingEmail,
    sendDripReadinessScoreExplainedEmail,
    sendDripPostLetterCaseStudyEmail,
    sendDripPlanComparisonEmail,
    sendDripLaunchOfferExpiryEmail,
  } = await import('@klarify/email');

  const stamp = Date.now();
  const name = 'Test Founder';

  const runners: Record<Exclude<DripKey, 'all'>, () => Promise<{ success: boolean; id?: string; error?: string }>> = {
    abandoned: () =>
      sendDripAbandonedOnboardingEmail({
        to,
        name,
        idempotencyKey: `test/abandoned/${stamp}`,
      }),
    readiness: () =>
      sendDripReadinessScoreExplainedEmail({
        to,
        name,
        score: 42,
        idempotencyKey: `test/readiness/${stamp}`,
      }),
    'case-study': () =>
      sendDripPostLetterCaseStudyEmail({
        to,
        name,
        idempotencyKey: `test/case-study/${stamp}`,
      }),
    'plan-compare': () =>
      sendDripPlanComparisonEmail({
        to,
        name,
        currentPlan: 'free',
        idempotencyKey: `test/plan-compare/${stamp}`,
      }),
    'launch-offer': () =>
      sendDripLaunchOfferExpiryEmail({
        to,
        name,
        couponCode: 'LAUNCH20',
        discountPercent: 20,
        expiryDateLabel: 'Sunday, 8 June 2026',
        recommendedPlan: 'compass',
        idempotencyKey: `test/launch-offer/${stamp}`,
      }),
  };

  const steps: Array<Exclude<DripKey, 'all'>> =
    step === 'all'
      ? ['abandoned', 'readiness', 'case-study', 'plan-compare', 'launch-offer']
      : [step];

  for (const key of steps) {
    const result = await runners[key]();
    if (result.success) {
      console.log(`✓ ${key} → sent (${result.id ?? 'no id'})`);
    } else {
      console.error(`✗ ${key} → ${result.error ?? 'unknown error'}`);
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.length === 0) usage();

  const useCron = args.includes('--cron');
  const positional = args.filter((a) => !a.startsWith('--') && a !== '-');
  const to = positional[0];
  if (!to?.includes('@')) {
    console.error('Error: provide a valid recipient email.');
    usage();
  }

  const stepArg = positional[1];
  const step: DripKey = stepArg ? (STEP_ALIASES[stepArg.toLowerCase()] ?? usage()) : 'all';

  if (!process.env.RESEND_API_KEY) {
    console.error('Error: RESEND_API_KEY is not set. Add it to ../../.env');
    process.exit(1);
  }

  if (useCron) {
    const { runLifecycleDrips } = await import('../src/services/lifecycleDripService.js');
    console.warn('Running runLifecycleDrips() against the database…');
    console.log(await runLifecycleDrips());
    return;
  }

  console.log(`Sending drip test email(s) to ${to}…`);
  await sendDirect(to, step);
  console.log('Done.');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
