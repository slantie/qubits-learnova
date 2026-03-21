FROM node:20-alpine AS base

RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# ─── Production ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY --from=base /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 4001

CMD ["node", "dist/server.js"]
