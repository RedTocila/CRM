#!/usr/bin/env bash
# Push required env vars from .env to a Vercel project.
# Usage: ./scripts/sync-vercel-env.sh [project-name]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env — copy from .env.example and fill in values."
  exit 1
fi

PROJECT="${1:-crm-saas}"

# shellcheck disable=SC1091
set -a
source .env
set +a

VARS=(
  DATABASE_URL
  DIRECT_URL
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  SUPABASE_PROJECT_REF
  AUTH_SECRET
  NEXTAUTH_SECRET
  NEXTAUTH_URL
  NEXT_PUBLIC_APP_URL
  NEXT_PUBLIC_APP_DOMAIN
)

echo "Linking Vercel project: $PROJECT"
npx vercel@latest link --project "$PROJECT" --yes 2>/dev/null || npx vercel@latest link --yes

for key in "${VARS[@]}"; do
  val="${!key:-}"
  if [[ -z "$val" ]]; then
    echo "⊘ Skipping $key (empty)"
    continue
  fi
  for target in production preview development; do
    echo "→ $key ($target)"
    printf '%s' "$val" | npx vercel@latest env add "$key" "$target" --force
  done
done

echo "✓ Vercel env sync complete. Redeploy: npx vercel --prod"
