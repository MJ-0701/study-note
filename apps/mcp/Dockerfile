FROM node:20-alpine AS builder

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/mcp ./apps/mcp

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @study-note/mcp build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/mcp/package.json ./apps/mcp/package.json
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/mcp/dist ./dist
CMD ["node", "dist/index.js"]
