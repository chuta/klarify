# syntax=docker/dockerfile:1.7
# =============================================================================
# Klarify Hono API — production image for Fly.io (apps/api workspace).
# =============================================================================
# Build context  : repo root (klarify/)
# Deploy command : fly deploy --config apps/api/fly.toml \
#                             --dockerfile apps/api/Dockerfile .
# Runtime        : tsx (TypeScript-aware Node loader) — see DEPLOY.md for why.
# Base image     : node:20-slim (Debian bookworm) — matches the Prisma
#                  binaryTarget `debian-openssl-3.0.x` already in schema.prisma.
# =============================================================================

ARG NODE_VERSION=20.18.0-slim

# ─── 1. Base — Node + pnpm via corepack ──────────────────────────────────────
FROM node:${NODE_VERSION} AS base
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates wget tini \
 && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
ENV CI=true
WORKDIR /workspace

# ─── 2. Dependencies — manifest-only copy for Docker layer cache ─────────────
# Copying every workspace package.json (even ones we don't need) keeps pnpm
# happy: it parses pnpm-workspace.yaml and expects each declared workspace to
# have a manifest on disk. Filtered install (`@klarify/api...`) then resolves
# only the api's transitive workspace + npm deps.
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json ./
COPY apps/api/package.json        ./apps/api/
COPY apps/web/package.json        ./apps/web/
COPY apps/mobile/package.json     ./apps/mobile/
COPY packages/ai/package.json     ./packages/ai/
COPY packages/config/package.json ./packages/config/
COPY packages/core/package.json   ./packages/core/
COPY packages/email/package.json  ./packages/email/
COPY packages/ui/package.json     ./packages/ui/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm config set store-dir /pnpm-store \
 && pnpm install --frozen-lockfile --filter @klarify/api...

# ─── 3. Build — compile @klarify/email + generate Prisma client ──────────────
# @klarify/core and @klarify/ai export raw .ts (consumed at runtime via tsx).
# @klarify/email is the only workspace dep that ships compiled JS — build it.
FROM deps AS build
COPY tsconfig*.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm --filter @klarify/email build
RUN cd apps/api && pnpm exec prisma generate

# ─── 4. Runtime — slim production image ──────────────────────────────────────
FROM node:${NODE_VERSION} AS runner
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates wget tini \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0
# Put workspace bins on PATH so the CMD can invoke `tsx` directly.
ENV PATH="/app/apps/api/node_modules/.bin:${PATH}"

# Non-root runtime user.
RUN groupadd --system --gid 1001 nodejs \
 && useradd  --system --uid 1001 --gid nodejs --shell /usr/sbin/nologin klarify

# Ship the whole workspace — preserves pnpm's symlink graph, no fragile pruning.
COPY --from=build --chown=klarify:nodejs /workspace /app

USER klarify
WORKDIR /app/apps/api

EXPOSE 3001

# Container-level health check (Fly also probes via fly.toml).
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget --quiet --spider http://127.0.0.1:3001/api/health || exit 1

# tini ensures clean signal handling on Fly stop/restart.
# tsx is the TypeScript-aware Node runtime (see DEPLOY.md §8).
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["tsx", "src/index.ts"]
