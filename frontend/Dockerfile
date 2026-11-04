# --- STAGE 1: Base image for installation and caching ---
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# --- STAGE 2: Dependencies installer ---
FROM base AS deps
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* bun.lockb* ./
RUN \
  if [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  elif [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f bun.lockb ]; then corepack enable bun && bun install --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# --- STAGE 3: Application builder ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment variables must be present during build time for Next.js to embed them
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SIGNALR_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SIGNALR_URL=$NEXT_PUBLIC_SIGNALR_URL
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID

RUN \
  if [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  elif [ -f yarn.lock ]; then yarn build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f bun.lockb ]; then corepack enable bun && bun run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# --- STAGE 4: Production runner ---
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets and static files
COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
