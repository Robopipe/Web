# Multi-stage build for Cloud Run. `next build` prerenders pages, which queries
# Payload — so the builder stage needs a reachable (ephemeral) Postgres; see cloudbuild.yaml.

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat && corepack enable pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app

# Build-time config. DATABASE_URL points at the ephemeral build DB;
# NEXT_PUBLIC_* values are baked into the client bundle per environment.
ARG DATABASE_URL=postgres://payload:payload@build-db:5432/robopipe
ARG PAYLOAD_SECRET=build-only-secret
ARG NEXT_PUBLIC_SERVER_URL=http://localhost:3000
ARG NEXT_PUBLIC_PLAUSIBLE_DOMAIN=
ENV DATABASE_URL=$DATABASE_URL \
    PAYLOAD_SECRET=$PAYLOAD_SECRET \
    NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL \
    NEXT_PUBLIC_PLAUSIBLE_DOMAIN=$NEXT_PUBLIC_PLAUSIBLE_DOMAIN \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm payload migrate && pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
RUN mkdir .next && chown nextjs:nodejs .next
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
