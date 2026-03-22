FROM node:20-alpine AS base

RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY prisma ./prisma

# Generate Prisma client to src/generated/prisma BEFORE copying src
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript
RUN npm run build

# Copy Prisma generated runtime files into dist so require('../generated/prisma') works
RUN cp -r src/generated dist/generated

# ─── Production ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# dist already contains generated/ from the base stage
COPY --from=base /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 4001

CMD ["node", "dist/server.js"]
