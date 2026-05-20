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
# api 와 그의 dependencies 를 topological order 로 한 번에 빌드.
# 'api...' = api + 그의 의존성 패키지들 (auth, persistence, corpus, persona-engine, storage 등).
# domain 은 build script 없어서 자동 skip (main 이 src 직접 가리킴).
# 이전엔 api 만 빌드해서 packages/* 의 dist 가 없어 TS2307 에러 발생했음.
RUN pnpm --filter "@study-note/api..." build

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

# Runtime requires the BUILT dist/ of every workspace package that apps/api depends on.
# Without these, pnpm symlinks (apps/api/node_modules/@study-note/* → packages/*) resolve
# to source-only folders, and Node fails: `Cannot find module '.../dist/index.js'` (MODULE_NOT_FOUND).
# `domain` is excluded — its package.json points main at src/, so source copy is enough.
COPY --from=builder /app/packages/auth/dist           ./packages/auth/dist
COPY --from=builder /app/packages/corpus/dist         ./packages/corpus/dist
COPY --from=builder /app/packages/persistence/dist    ./packages/persistence/dist
COPY --from=builder /app/packages/persona-engine/dist ./packages/persona-engine/dist
COPY --from=builder /app/packages/storage/dist        ./packages/storage/dist

# Regenerate Prisma client in runner — `pnpm install --prod` installs @prisma/client
# but does NOT include the generated client (which `prisma generate` writes alongside
# @prisma/client in pnpm's isolated layout: .pnpm/@prisma+client@<hash>/node_modules/.prisma).
# Copying from builder is path-fragile across pnpm versions; regenerating is deterministic.
RUN pnpm --filter @study-note/api prisma:generate

COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Entrypoint: DB wait → migrate deploy → optional seed → exec app
COPY --chmod=0755 apps/api/docker-entrypoint.sh ./apps/api/docker-entrypoint.sh

EXPOSE 3010
ENTRYPOINT ["sh", "/app/apps/api/docker-entrypoint.sh"]
