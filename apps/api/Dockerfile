FROM node:22-alpine AS builder

WORKDIR /app
RUN corepack enable
ENV npm_config_fetch_timeout=600000 \
    npm_config_fetch_retries=10 \
    npm_config_fetch_retry_mintimeout=10000 \
    npm_config_fetch_retry_maxtimeout=600000

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json .npmrc ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile --fetch-timeout=600000 --network-concurrency=2
RUN pnpm --filter @study-note/api prisma:generate
RUN pnpm --filter @study-note/api build

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
COPY apps/api/package.json ./apps/api/package.json
RUN pnpm install --frozen-lockfile --prod --fetch-timeout=600000 --network-concurrency=2

# Install prisma CLI globally so entrypoint can run `prisma migrate deploy`.
# Pinned to match devDependencies in apps/api/package.json.
# @prisma/client engines are already in node_modules via --prod install;
# the CLI (devDep) is not, so we add it explicitly here.
RUN npm install -g prisma@6.19.3

COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Entrypoint: DB wait → migrate deploy → optional seed → exec app
COPY --chmod=0755 apps/api/docker-entrypoint.sh ./apps/api/docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["sh", "/app/apps/api/docker-entrypoint.sh"]
