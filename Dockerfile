# syntax=docker/dockerfile:1.10
#
# Production image for Coolify (Dockerfile build pack).
#
# `next build` prerenders pages, which queries Payload, so the build needs the
# real database: migrations run first, then the build renders against it.
# Coolify builds with --network host plus an --add-host entry for every
# container on the destination network, so the Postgres resource's internal
# URL resolves during the build.
#
# Build-time values (DATABASE_URL, PAYLOAD_SECRET, NEXT_PUBLIC_SERVER_URL,
# GCS_BUCKET) arrive either as build args (ARGs below) or, with Coolify's
# "Docker BuildKit secrets" option, as secrets (the --mount flags). Both work.

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat

FROM base AS pnpm
RUN npm install -g pnpm@10.24.0
WORKDIR /app

FROM pnpm AS deps
COPY package.json pnpm-lock.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM pnpm AS builder
ARG DATABASE_URL
ARG PAYLOAD_SECRET
ARG NEXT_PUBLIC_SERVER_URL
ARG GCS_BUCKET
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# PAYLOAD_SECRET only has to be non-empty here: nothing is signed at build time.
RUN --mount=type=secret,id=DATABASE_URL,env=DATABASE_URL \
    --mount=type=secret,id=PAYLOAD_SECRET,env=PAYLOAD_SECRET \
    --mount=type=secret,id=NEXT_PUBLIC_SERVER_URL,env=NEXT_PUBLIC_SERVER_URL \
    --mount=type=secret,id=GCS_BUCKET,env=GCS_BUCKET \
    : "${DATABASE_URL:?DATABASE_URL must be available at build time}" \
    && : "${NEXT_PUBLIC_SERVER_URL:?NEXT_PUBLIC_SERVER_URL must be available at build time}" \
    && export PAYLOAD_SECRET="${PAYLOAD_SECRET:-build-time-placeholder}" \
    && pnpm payload migrate \
    && pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
# Writable for the ISR / image-optimization cache.
RUN mkdir .next && chown nextjs:nodejs .next
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
