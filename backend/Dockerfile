# Backend Dockerfile — built from repo root context.
# root package.json holds NestJS/Prisma deps for the monorepo.

FROM node:20-alpine

WORKDIR /app

# Install all deps (incl. devDeps: prisma CLI, typescript) — needed for build + migrate.
COPY package*.json ./
RUN npm install

# Copy full repo (root context) so backend/* and prisma schema are present.
COPY . .

# Generate Prisma client types (resolves @prisma/client model imports at compile time).
RUN npx prisma generate --schema backend/prisma/schema.prisma

# Compile backend TypeScript to backend/dist.
RUN npm run build:backend

EXPOSE 3000

# On boot: apply migrations -> seed (idempotent upsert) -> start NestJS.
CMD ["sh", "-c", "npx prisma migrate deploy --schema backend/prisma/schema.prisma && node backend/prisma/seed.mjs && node backend/dist/main.js"]
