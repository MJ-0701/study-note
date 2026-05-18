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

# ------------------------------------------------------------------
# DB readiness target — priority:
#   1. Explicit DB_HOST / DB_PORT env (사용자 명시 override)
#   2. DATABASE_URL 에서 host:port 파싱 (RDS / non-compose prod 대응)
#   3. compose fallback (db-service:3306)
# POSIX sh 호환 (busybox/alpine sh, bash extension 금지)
# ------------------------------------------------------------------
_parse_url_host=""
_parse_url_port=""
if [ -n "${DATABASE_URL:-}" ]; then
  # scheme 제거 (mysql://, mysql+pymysql:// 등 — :// 이후)
  _no_scheme="${DATABASE_URL#*://}"
  # query string 제거 (? 이후)
  _no_query="${_no_scheme%%\?*}"
  # path 제거 (첫 / 이후) → authority 부분만
  _authority="${_no_query%%/*}"
  # user[:pass]@ 제거 → host[:port]
  case "$_authority" in
    *@*) _hostport="${_authority##*@}" ;;
    *)   _hostport="$_authority" ;;
  esac
  # host 와 port 분리
  _parse_url_host="${_hostport%%:*}"
  if [ "${_hostport}" = "${_hostport%%:*}" ]; then
    # ':' 없음 → port 미지정
    _parse_url_port=""
  else
    _parse_url_port="${_hostport##*:}"
  fi
fi

DB_HOST="${DB_HOST:-${_parse_url_host:-db-service}}"
DB_PORT="${DB_PORT:-${_parse_url_port:-3306}}"
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
