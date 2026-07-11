# syntax=docker/dockerfile:1
# Build context: repo root (so shared/schemas is reachable from apps/web).

# ---- deps: install node_modules from the lockfile ----
FROM oven/bun:1 AS deps
WORKDIR /app/apps/web
COPY apps/web/package.json apps/web/bun.lock ./
RUN bun install --frozen-lockfile

# ---- builder: compile the Next.js app ----
FROM oven/bun:1 AS builder
WORKDIR /app
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY apps/web ./apps/web
COPY shared/schemas ./shared/schemas

WORKDIR /app/apps/web

# The Maps key is NEXT_PUBLIC_*, so it must be present at BUILD time to be
# inlined into the client bundle. Passed via --build-arg (see deploy notes).
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ARG NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_APP_NAME
ARG NEXT_PUBLIC_ENABLE_VOICE
ARG NEXT_PUBLIC_ENABLE_DOC_UPLOAD
ARG NEXT_PUBLIC_ENABLE_AGENT_DEBUG
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_ENABLE_VOICE=$NEXT_PUBLIC_ENABLE_VOICE
ENV NEXT_PUBLIC_ENABLE_DOC_UPLOAD=$NEXT_PUBLIC_ENABLE_DOC_UPLOAD
ENV NEXT_PUBLIC_ENABLE_AGENT_DEBUG=$NEXT_PUBLIC_ENABLE_AGENT_DEBUG
ENV NEXT_TELEMETRY_DISABLED=1

RUN bun run build

# ---- runner: minimal image running the standalone server ----
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Next standalone in a monorepo preserves the workspace layout:
#   .next/standalone/apps/web/server.js
#   .next/standalone/apps/web/node_modules/
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 8080
CMD ["node", "apps/web/server.js"]
