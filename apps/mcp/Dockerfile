FROM node:22-alpine AS builder

WORKDIR /app
RUN corepack enable
ENV npm_config_fetch_timeout=600000 \
    npm_config_fetch_retries=10 \
    npm_config_fetch_retry_mintimeout=10000 \
    npm_config_fetch_retry_maxtimeout=600000

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json .npmrc ./
COPY packages ./packages
COPY apps/mcp ./apps/mcp

RUN pnpm install --frozen-lockfile --fetch-timeout=600000 --network-concurrency=2
RUN pnpm --filter @study-note/mcp build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
ENV npm_config_fetch_timeout=600000 \
    npm_config_fetch_retries=10 \
    npm_config_fetch_retry_mintimeout=10000 \
    npm_config_fetch_retry_maxtimeout=600000

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages ./packages
COPY apps/mcp/package.json ./apps/mcp/package.json
RUN pnpm install --frozen-lockfile --prod --fetch-timeout=600000 --network-concurrency=2

COPY --from=builder /app/apps/mcp/dist ./apps/mcp/dist
CMD ["node", "apps/mcp/dist/index.js"]
