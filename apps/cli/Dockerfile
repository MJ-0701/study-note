FROM node:20-alpine AS builder

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/cli ./apps/cli

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @study-note/cli build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/cli/package.json ./apps/cli/package.json
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/cli/dist ./dist
RUN cat <<'EOS' > /usr/local/bin/study-note-cli && chmod +x /usr/local/bin/study-note-cli
#!/bin/sh
set -eu
command="${1:-ingest-pdf}"
if [ "$#" -gt 0 ]; then
  shift
fi
case "$command" in
  ingest-pdf)
    exec node dist/ingest-pdf.js "$@"
    ;;
  persona-turn)
    exec node dist/persona-turn.js "$@"
    ;;
  *)
    echo "usage: ingest-pdf|persona-turn [args...]" >&2
    exit 1
    ;;
esac
EOS

ENTRYPOINT ["/usr/local/bin/study-note-cli"]
CMD ["ingest-pdf"]
