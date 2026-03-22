# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Generate Prisma client BEFORE tsc (custom output = ../generated/prisma)
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src/

RUN npm run build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/

# Install production deps only (prisma CLI is devDep, so skip generate here)
RUN npm ci --omit=dev

# Copy compiled app
COPY --from=builder /app/dist ./dist

# Copy generated Prisma client (custom output path: /app/generated/prisma)
COPY --from=builder /app/generated ./generated

# Copy Prisma query engine binaries
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 4000

CMD ["node", "dist/server.js"]
