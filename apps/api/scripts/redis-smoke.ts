// One-shot Redis smoke test — verifies REDIS_URL is reachable and that
// INCR / EXPIRE / TTL work as rateLimitAI expects.
//
// Run: pnpm tsx scripts/redis-smoke.ts (from apps/api/)
//
// Safe to delete after Sprint 2 — kept here as ops documentation.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Reuse the same .env loader pattern as src/index.ts.
(function loadRootEnv() {
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
    /* ignore */
  }
})();

import { getRedis, aiQueryCounterKey, secondsUntilEndOfMonth } from '../src/redis.js';

async function main(): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    console.error('FAIL: REDIS_URL not set');
    process.exit(1);
  }

  const testUserId = '00000000-0000-0000-0000-000000000001';
  const key = aiQueryCounterKey(testUserId);
  const ttl = secondsUntilEndOfMonth();

  console.warn(`→ key:  ${key}`);
  console.warn(`→ ttl:  ${ttl}s (${(ttl / 86400).toFixed(1)} days)`);

  await redis.del(key);
  const c1 = await redis.incr(key);
  await redis.expire(key, ttl);
  const c2 = await redis.incr(key);
  const ttlReadback = await redis.ttl(key);
  await redis.del(key);

  console.warn(`✔ incr #1: ${c1}`);
  console.warn(`✔ incr #2: ${c2}`);
  console.warn(`✔ ttl readback: ${ttlReadback}s`);

  if (c1 !== 1 || c2 !== 2 || ttlReadback < 0) {
    console.error('FAIL: Redis smoke test did not return expected values');
    process.exit(1);
  }

  console.warn('✅ Redis smoke test passed');
  await redis.quit();
}

main().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
