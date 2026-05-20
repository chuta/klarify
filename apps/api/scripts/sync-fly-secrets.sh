#!/usr/bin/env bash
# =============================================================================
# Sync local .env → Fly.io secrets vault for the klarify-api app.
#
# Reads /<repo-root>/.env, filters out NEXT_PUBLIC_*, EXPO_PUBLIC_*, and other
# client-only vars that should NEVER live on the API, then pipes the rest into
# `fly secrets import`. Fly's vault stores each value encrypted at rest and
# injects them as env vars at machine start.
#
# Usage: from the repo root or anywhere inside it:
#   ./apps/api/scripts/sync-fly-secrets.sh                  # default app
#   FLY_APP=klarify-api-staging ./apps/api/scripts/sync-fly-secrets.sh
#
# Re-run this after every credential rotation. Fly performs a rolling restart
# automatically when secrets change — no extra `fly deploy` needed unless code
# also changed.
# =============================================================================
set -euo pipefail

FLY_APP="${FLY_APP:-klarify-api}"
REPO_ROOT="$(git rev-parse --show-toplevel)"
ENV_FILE="${REPO_ROOT}/.env"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "✗ ${ENV_FILE} not found." >&2
  echo "  Copy .env.example → .env and fill in values before running this." >&2
  exit 1
fi

if ! command -v fly >/dev/null 2>&1; then
  echo "✗ flyctl is not installed. brew install flyctl" >&2
  exit 1
fi

if ! fly auth whoami >/dev/null 2>&1; then
  echo "✗ Not logged into Fly. Run: fly auth login" >&2
  exit 1
fi

# ── Filter rules ─────────────────────────────────────────────────────────────
# Drop:
#   - Empty lines and comments
#   - NEXT_PUBLIC_*  — exposed to the browser; belong on Netlify, not the API
#   - EXPO_PUBLIC_*  — exposed to the mobile app; belong in EAS env, not the API
#   - NODE_ENV       — Fly sets this in fly.toml [env] block
#   - PORT, HOST     — Fly sets these in fly.toml [env] block
#   - EMAIL_FROM, EMAIL_REPLY_TO — non-secret, set in fly.toml [env] later
# Keep everything else (DATABASE_URL, SUPABASE_*, AWS_*, ANTHROPIC_*, etc.).

FILTERED_FILE="$(mktemp -t klarify-fly-secrets.XXXXXX)"
trap 'rm -f "${FILTERED_FILE}"' EXIT

awk '
  /^[[:space:]]*$/ { next }
  /^[[:space:]]*#/ { next }
  /^NEXT_PUBLIC_/  { next }
  /^EXPO_PUBLIC_/  { next }
  /^NODE_ENV=/     { next }
  /^PORT=/         { next }
  /^HOST=/         { next }
  /=/ {
    # Strip inline comments after the value (anything from " #" onward).
    # Note: only strips when there is whitespace before the #, to avoid
    # eating # inside JWT secrets or URLs.
    sub(/[[:space:]]+#.*$/, "")
    print
  }
' "${ENV_FILE}" > "${FILTERED_FILE}"

KEY_COUNT=$(awk -F= 'NF>=2 {print $1}' "${FILTERED_FILE}" | sort -u | wc -l | tr -d ' ')

echo "→ App      : ${FLY_APP}"
echo "→ Source   : ${ENV_FILE}"
echo "→ Will set : ${KEY_COUNT} secret(s)"
echo
echo "Keys to be imported:"
awk -F= 'NF>=2 {print "  - "$1}' "${FILTERED_FILE}" | sort -u
echo

read -r -p "Proceed with fly secrets import? [y/N] " CONFIRM
case "${CONFIRM}" in
  y|Y|yes|YES) ;;
  *) echo "Aborted." >&2; exit 1 ;;
esac

# `fly secrets import` reads stdin (KEY=VALUE per line) and triggers a rolling
# restart on the app. --stage skips the restart so we can batch with a deploy;
# we want the restart here so the live app picks up new values immediately.
fly secrets import --app "${FLY_APP}" < "${FILTERED_FILE}"

echo
echo "✓ Done. Verify with:"
echo "  fly secrets list --app ${FLY_APP}"
