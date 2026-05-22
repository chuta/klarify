import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load the monorepo root .env before anything else.
// tsx watch spawns child processes and may not forward --env-file to them, so we
// read the file explicitly here using only Node built-ins (no dotenv dependency needed).
// process.cwd() is apps/api/ when run via turbo, so ../../ resolves to the repo root.
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
      // Strip surrounding quotes if present.
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      // Never overwrite vars already injected by the platform / shell.
      if (key && !(key in process.env)) {
        process.env[key] = val;
      }
    }
  } catch {
    // .env file not present (production) — env vars come from platform.
  }
})();

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import type { ApiSuccess } from '@klarify/core';
import { userRoutes } from './routes/user.js';
import { onboardingRoutes } from './routes/onboarding.js';
import { complianceRoutes } from './routes/compliance.js';
import { aripRoutes } from './routes/arip.js';
import { authRoutes } from './routes/auth.js';
import { regulatorRoutes } from './routes/regulators.js';
import { documentRoutes } from './routes/documents.js';
import { documentGeneratorRoutes } from './routes/documents/generate.js';
import { chatRoutes } from './routes/ai/chat.js';
import { conversationRoutes } from './routes/ai/conversations.js';
import { classifyRoutes } from './routes/ai/classify.js';
import { billingRoutes } from './routes/billing/index.js';
import { billingWebhookRoutes } from './routes/billing/webhooks.js';
import { notificationRoutes } from './routes/notifications.js';
import { scheduleJobs } from './jobs/deadlineAlerts.js';

const app = new Hono();

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: process.env.NEXT_PUBLIC_APP_URL ?? '*',
    credentials: true,
    allowHeaders: ['Authorization', 'Content-Type', 'X-Klarify-Org-Id'],
  }),
);

// Friendly banner at the root so platform sweeps (Fly edge, uptime probes,
// curious humans hitting the bare hostname) get a structured response instead
// of an unstyled 404. NOT for client use — the real surface is /api/*.
app.get('/', (c) =>
  c.json({
    success: true,
    data: {
      name: 'klarify-api',
      docs: 'https://klarify.africa',
      health: '/api/health',
    },
  }),
);

// CLAUDE.md §9: GET /api/health
app.get('/api/health', (c) => {
  const body: ApiSuccess<{ status: 'ok'; uptime: number }> = {
    success: true,
    data: { status: 'ok', uptime: process.uptime() },
  };
  return c.json(body);
});

// Auth-required routes.
app.route('/api/user', userRoutes);
// Alias to match CLAUDE.md §9 path exactly.
app.route('/api/user/profile', userRoutes);

// Onboarding.
app.route('/api/onboarding', onboardingRoutes);

// ComplianceOS.
app.route('/api/compliance', complianceRoutes);

// ARIP tracker.
app.route('/api/arip', aripRoutes);

// Regulators CRM (read-only in Sprint 1 — interactions/contacts in Sprint 5).
app.route('/api/regulators', regulatorRoutes);

// Auth sync (must be registered before requireAuth-guarded routes).
app.route('/api/auth', authRoutes);

// Document analyser — Resend notifications when analysis completes (Sprint 3).
// Sprint 4 — Document Generator MUST mount before the analyser routes because the
// analyser owns /api/documents/:id and would otherwise greedily catch literal
// prefixes like /api/documents/generated.
app.route('/api/documents', documentGeneratorRoutes);
app.route('/api/documents', documentRoutes);

// Billing — Sprint 5: Korapay subscriptions.
// Webhook route is intentionally mounted WITHOUT auth middleware (public endpoint).
app.route('/api/billing/webhook', billingWebhookRoutes);
app.route('/api/billing', billingRoutes);

// Notification preferences + unsubscribe (Sprint 5-D2).
app.route('/api/notifications', notificationRoutes);

// FounderCounsel — Sprint 2 streaming AI chat (RAG + Claude SSE).
app.route('/api/ai', chatRoutes);
app.route('/api/ai/conversations', conversationRoutes);

// Product classification — Sprint 2 Opus-powered Regulatory Identity Card.
app.route('/api/ai', classifyRoutes);

// Unknown route → consistent JSON envelope (CLAUDE.md §15 API standards).
// Without this, Hono returns plain-text "404 Not Found" which breaks clients
// that always expect application/json.
app.notFound((c) =>
  c.json(
    {
      success: false,
      error: `Route not found: ${c.req.method} ${c.req.path}`,
      code: 'NOT_FOUND',
    } as const,
    404,
  ),
);

app.onError((err, c) => {
  console.error('[api] unhandled error', err);
  return c.json(
    { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' } as const,
    500,
  );
});

// Start background cron jobs — deadline alerts + weekly digest (Sprint 5-D2).
scheduleJobs();

// Bind explicitly to 0.0.0.0 — Fly.io and most container platforms route to
// `0.0.0.0:$PORT`. Defaulting to `localhost` would silently 502 in production.
const port = Number(process.env.PORT ?? 3001);
const hostname = process.env.HOST ?? '0.0.0.0';
serve({ fetch: app.fetch, port, hostname }, ({ port: p }) => {
  console.warn(`Klarify API listening on ${hostname}:${p}`);
});

export type AppType = typeof app;
export default app;
