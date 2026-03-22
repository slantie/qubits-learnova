# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Generate Prisma client to src/generated/prisma (custom output in schema)
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src/

# Compile TypeScript
RUN npm run build

# Copy Prisma generated runtime files into dist so require('../generated/prisma') works
RUN cp -r src/generated dist/generated

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/

# Install production deps only
RUN npm ci --omit=dev

# dist/ already contains generated/ from the builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 4000

CMD ["node", "dist/server.js"]
