// One-shot PostHog smoke test — verifies the project token reaches US Cloud.
//
// Run: pnpm tsx scripts/posthog-smoke.ts (from apps/api/)
//
// After running, open PostHog → Activity → Live events and filter for
// `klarify_setup_smoke_test`. Events can take 10–30 seconds to appear.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PostHog } from 'posthog-node';

/** Load root .env; last non-empty value wins (handles duplicate keys). */
function loadRootEnv(): void {
  try {
    const content = readFileSync(resolve(process.cwd(), '../../.env'), 'utf-8');
    const parsed: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      // Strip inline comments (`KEY=value # note`) — common in .env files.
      const hashIdx = val.indexOf(' #');
      if (hashIdx >= 0) val = val.slice(0, hashIdx).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (key && val) parsed[key] = val;
    }
    for (const [key, val] of Object.entries(parsed)) {
      process.env[key] ??= val;
    }
  } catch {
    /* ignore — rely on process.env */
  }
}

async function main(): Promise<void> {
  loadRootEnv();

  const key = process.env.POSTHOG_API_KEY;
  const host = process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com';

  if (!key) {
    console.error('FAIL: POSTHOG_API_KEY is not set');
    process.exit(1);
  }

  const distinctId = `klarify-smoke-${Date.now()}`;
  const ph = new PostHog(key, { host, flushAt: 1, flushInterval: 0 });

  ph.capture({
    distinctId,
    event: 'klarify_setup_smoke_test',
    properties: {
      source: 'cli',
      checked_at: new Date().toISOString(),
    },
  });

  await ph.shutdown();

  console.log('OK: sent klarify_setup_smoke_test');
  console.log(`Host: ${host}`);
  console.log(`distinctId: ${distinctId}`);
  console.log('');
  console.log('Next: PostHog → Activity → Live events');
  console.log('Filter: event name = klarify_setup_smoke_test');
}

main().catch((err: unknown) => {
  console.error('FAIL:', err);
  process.exit(1);
});
