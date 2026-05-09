FROM node:20-alpine AS builder

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @study-note/api prisma:generate
RUN pnpm --filter @study-note/api build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/api/package.json ./apps/api/package.json
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/api/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
