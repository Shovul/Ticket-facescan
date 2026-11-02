# FROM node:20-alpine
# WORKDIR /app

# # Copy file quản lý thư viện và cài đặt
# COPY package*.json ./
# RUN npm install

# # Copy toàn bộ mã nguồn
# COPY . .

# EXPOSE 3000
# # Chạy Next.js ở chế độ development
# CMD ["npm", "run", "dev"]

# --- STAGE 1: Base image for installation and caching ---
FROM node:20-alpine AS base
WORKDIR /app
# Check https://github.com to understand why libc6-compat might be needed.
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
# ARG NEXT_PUBLIC_API_URL
# ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

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
# https://nextjs.org
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
