# Basis-Image: Node.js 20 auf Alpine Linux (klein & sicher)
FROM node:20-alpine AS base

# Installiere notwendige System-Tools für Backups
# mysql-client -> mysqldump
# postgresql-client -> pg_dump
# mongodb-tools -> mongodump
RUN apk add --no-cache \
    mysql-client \
    postgresql-client \
    mongodb-tools \
    zi

# 1. Dependencies installieren
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
# Installiere pnpm wenn nötig oder nutze corepack
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

# 2. Builder Phase
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment Variablen für Build
ENV NEXT_TELEMETRY_DISABLED=1

# Prisma Client generieren und Next.js App bauen
RUN npx prisma generate
RUN npm run build

# 3. Runner Phase (Das eigentliche Image)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Kopiere gebaute Dateien
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Kopiere Prisma Schema für Runtime-Zugriffe (falls nötig) oder Migrationen
COPY --from=builder /app/prisma ./prisma

# Berechtigungen für Backup-Ordner (optional, falls lokal gespeichert wird)
RUN mkdir -p /backups && chown nextjs:nodejs /backups

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
