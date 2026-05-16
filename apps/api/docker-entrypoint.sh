#!/bin/sh
set -e

# -------------------------------------------------------------------------
# study-note be-service entrypoint
# Responsibilities:
#   1. Wait for DB to accept TCP connections (max 60s)
#   2. Run prisma migrate deploy (exit 1 on failure → docker restart loop)
#   3. Optionally run seed (STUDY_NOTE_RUN_SEED=true)
#   4. exec app (PID 1 receives SIGTERM cleanly)
# -------------------------------------------------------------------------

DB_HOST="${DB_HOST:-db-service}"
DB_PORT="${DB_PORT:-3306}"
MAX_WAIT=30   # 30 * 2s = 60s

# ------------------------------------------------------------------
# 1. DB readiness wait — nc TCP probe every 2s, max 60s
# ------------------------------------------------------------------
echo "[entrypoint] waiting for ${DB_HOST}:${DB_PORT} to accept TCP connections..."

i=0
while [ "$i" -lt "$MAX_WAIT" ]; do
  if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
    echo "[entrypoint] db ready (attempt $((i + 1)))"
    break
  fi
  i=$((i + 1))
  if [ "$i" -eq "$MAX_WAIT" ]; then
    echo "[entrypoint] ERROR: db not ready after $((MAX_WAIT * 2))s — giving up" >&2
    exit 1
  fi
  echo "[entrypoint] db not yet ready — retry $i/${MAX_WAIT} (sleeping 2s)..."
  sleep 2
done

# ------------------------------------------------------------------
# 2. prisma migrate deploy
# ------------------------------------------------------------------
echo "[entrypoint] running prisma migrate deploy..."
if ! pnpm --filter @study-note/api prisma:migrate:deploy; then
  echo "[entrypoint] ERROR: prisma migrate deploy failed" >&2
  exit 1
fi
echo "[entrypoint] prisma migrate deploy complete"

# ------------------------------------------------------------------
# 3. seed (toggle — dev default true, prod explicit false)
# ------------------------------------------------------------------
if [ "${STUDY_NOTE_RUN_SEED:-false}" = "true" ]; then
  echo "[entrypoint] running prisma seed (STUDY_NOTE_RUN_SEED=true)..."
  if ! pnpm --filter @study-note/api prisma:seed; then
    echo "[entrypoint] WARNING: seed failed (non-fatal — continuing)" >&2
  else
    echo "[entrypoint] seed complete"
  fi
else
  echo "[entrypoint] seed skipped (STUDY_NOTE_RUN_SEED=${STUDY_NOTE_RUN_SEED:-false})"
fi

# ------------------------------------------------------------------
# 4. start app — exec so Node is PID 1 and receives SIGTERM directly
# ------------------------------------------------------------------
echo "[entrypoint] starting app..."
exec node apps/api/dist/main.js
