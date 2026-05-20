# Klarify API — Fly.io Deployment Runbook

> Audience: anyone shipping `apps/api` (Hono backend) to Fly.io.
> Architecture: see CLAUDE.md §3 (Backend). Hybrid model — Next.js Route
> Handlers on Netlify for browser-origin requests, this Hono API on Fly.io
> for long-running, streaming, and mobile-bearer-token endpoints.

---

## TL;DR

```bash
# from repo root, after secrets are set:
pnpm --filter @klarify/api deploy:fly
```

That wraps:

```bash
fly deploy --config apps/api/fly.toml \
           --dockerfile apps/api/Dockerfile .
```

---

## 0. Prerequisites (one-time)

- [ ] Fly CLI installed: `brew install flyctl` (macOS) — verify with `flyctl version`
- [ ] Logged in: `fly auth login`
- [ ] Klarify org created: `fly orgs create klarify` (or use the web UI)
- [ ] Docker Desktop running (only if you want to build locally; Fly's
      remote builder is the default and is fine for first deploys)
- [ ] DNS access to `klarify.africa` at Cloudflare (for the custom domain step)

---

## 1. One-time app + volume setup

```bash
# 1a. Create the app under the klarify org, in jnb (Johannesburg).
fly apps create klarify-api --org klarify

# 1b. Confirm the region the app will deploy to.
fly regions list --app klarify-api
# → should show 'jnb' as primary (set by fly.toml).
```

---

## 2. Set secrets

> **NEVER** commit secrets. `fly secrets set` encrypts at rest in Fly's vault and
> injects them as env vars at runtime.

Set in one shot from your rotated `.env` values (do this in a private terminal —
the values will appear in shell history, so clear it afterwards with
`history -c` or use `fly secrets import < .env.production` instead):

```bash
fly secrets set --config apps/api/fly.toml --app klarify-api \
  DATABASE_URL='postgresql://postgres:[PWD]@db.ladnmszfzbfhthcmjuww.supabase.co:5432/postgres?sslmode=require' \
  DIRECT_URL='postgresql://postgres:[PWD]@db.ladnmszfzbfhthcmjuww.supabase.co:5432/postgres?sslmode=require' \
  SUPABASE_URL='https://ladnmszfzbfhthcmjuww.supabase.co' \
  SUPABASE_SERVICE_ROLE_KEY='...' \
  SUPABASE_JWT_SECRET='...' \
  SUPABASE_ANON_KEY='...' \
  ANTHROPIC_API_KEY='sk-ant-...' \
  ANTHROPIC_MODEL_ADVISORY='claude-sonnet-4-5' \
  ANTHROPIC_MODEL_ARCH='claude-opus-4' \
  ANTHROPIC_MODEL_SIMPLE='claude-haiku-4-5' \
  VOYAGE_API_KEY='...' \
  AWS_ACCESS_KEY_ID='...' \
  AWS_SECRET_ACCESS_KEY='...' \
  AWS_S3_BUCKET='klarify-documents-afs' \
  AWS_REGION='af-south-1' \
  AWS_TEXTRACT_REGION='eu-west-1' \
  RESEND_API_KEY='...' \
  EMAIL_FROM='Klarify <hello@klarify.africa>' \
  EMAIL_REPLY_TO='hello@klarify.africa' \
  NEXT_PUBLIC_APP_URL='https://klarify.africa' \
  JWT_SECRET='...'
```

Verify the secret names made it (values are never echoed):

```bash
fly secrets list --app klarify-api
```

> **Note:** Fly does **not** reserve the `AWS_` prefix the way Netlify does. The
> AWS S3 + Textract creds belong here, not on Netlify.

---

## 3. First deploy

```bash
# From the repo root.
fly deploy --config apps/api/fly.toml \
           --dockerfile apps/api/Dockerfile .
```

What this does:

1. Tars the build context (repo root, minus everything in
   `apps/api/Dockerfile.dockerignore` — corpus PDFs, node_modules, .next, etc.).
2. Ships the tar to Fly's remote builder.
3. Builds the multi-stage image:
   - stage `deps` → `pnpm install --filter @klarify/api...`
   - stage `build` → `pnpm --filter @klarify/email build` + `prisma generate`
   - stage `runner` → slim image with non-root user, runs via `tsx`
4. Pushes the image to Fly's registry.
5. Boots a new machine in `jnb`, runs the `/api/health` probe, swaps over.

Expected time: ~3–5 min for cold builds, ~90s with layer cache warm.

---

## 4. Smoke test

```bash
# Health probe (no auth).
curl https://klarify-api.fly.dev/api/health
# → {"success":true,"data":{"status":"ok","uptime":12.34}}

# Tail logs in real time.
fly logs --app klarify-api
```

If `/api/health` 200s, the Prisma client loaded and Hono is routing. ✅

---

## 5. Custom domain (`api.klarify.africa`)

```bash
# 5a. Tell Fly to mint a cert.
fly certs add api.klarify.africa --app klarify-api

# 5b. Fly prints the CNAME target — add it at Cloudflare as a DNS-only
#     (grey-cloud) record so Fly's edge handles TLS.
#     api.klarify.africa  CNAME  klarify-api.fly.dev   Proxy: OFF

# 5c. Watch the cert come up.
fly certs show api.klarify.africa --app klarify-api
# → Status: Ready ✓ (usually 30–60s after DNS propagates)
```

Then update the web app to call `https://api.klarify.africa` for the routes
that live on Fly (set `NEXT_PUBLIC_API_URL` on Netlify accordingly).

---

## 6. Re-deploy / iterating

```bash
# After any commit on main:
git pull
pnpm --filter @klarify/api deploy:fly
```

Or run from the apps/api dir directly (the script `cd`s to the repo root).

Updating a single secret:

```bash
fly secrets set --app klarify-api ANTHROPIC_API_KEY='sk-ant-...'
# Triggers a rolling restart automatically.
```

---

## 7. Operations cheatsheet

| Task                          | Command                                                |
|-------------------------------|--------------------------------------------------------|
| Live logs                     | `fly logs --app klarify-api`                           |
| One-off shell into a machine  | `fly ssh console --app klarify-api`                    |
| List machines + status        | `fly status --app klarify-api`                         |
| Restart all machines          | `fly machine restart --app klarify-api`                |
| Roll back                     | `fly releases --app klarify-api` → `fly deploy --image registry.fly.io/klarify-api:v<N>` |
| Open the Fly dashboard        | `fly dashboard --app klarify-api`                      |

---

## 8. Why `tsx` at runtime?

`@klarify/core` and `@klarify/ai` declare `"main": "./src/index.ts"` — they ship
raw TypeScript so the web/mobile apps (which have their own bundlers) consume
them directly without an intermediate compile step. A plain `node dist/index.js`
on the API server would fail when those workspace deps load, because Node
cannot evaluate `.ts` files.

Options considered:

1. **Add `tsc` build scripts to every workspace package.** Invasive — every
   import path in the workspace would need to switch from source to `dist`.
2. **Bundle the API with esbuild.** Cleanest long-term, but the
   `--packages=external` / workspace-bundle interplay needs careful tuning.
3. **Run via `tsx` at runtime.** ✅ Zero changes to workspace packages, ~150ms
   extra cold-start cost (acceptable for our traffic profile), `tsx` is already
   a battle-tested dep we use in dev.

We picked option 3 for V1. Re-evaluate when cold-start becomes a bottleneck
(probably never on Fly's auto-start-from-stopped flow).

---

## 9. Cost guardrails

- `min_machines_running = 0` → no idle cost. First request after idle has
  ~1.5s cold-start.
- `512mb` machine ≈ $1.94/mo if always-on; near-$0 with auto-stop.
- Bump to `min_machines_running = 1` once we have paying users on Compass+.
- Watch usage: `fly dashboard --app klarify-api` → Metrics tab.
