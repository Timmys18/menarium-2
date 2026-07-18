FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS migrator
ENV NODE_ENV=production
COPY prisma ./prisma
USER node
CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]

FROM base AS builder
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG APP_RELEASE=development
ARG APP_ENVIRONMENT=staging
ARG APP_URL=https://menarium.ru
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_SENTRY_ENVIRONMENT=development
ARG STORAGE_PUBLIC_BASE_URL=https://storage.yandexcloud.net
ENV APP_RELEASE=$APP_RELEASE
ENV APP_ENVIRONMENT=$APP_ENVIRONMENT
ENV APP_URL=$APP_URL
ENV NEXT_PUBLIC_APP_RELEASE=$APP_RELEASE
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SENTRY_ENVIRONMENT=$NEXT_PUBLIC_SENTRY_ENVIRONMENT
ENV STORAGE_PUBLIC_BASE_URL=$STORAGE_PUBLIC_BASE_URL
RUN npx prisma generate
RUN npm run build

FROM base AS runner
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ARG APP_RELEASE=development
ARG APP_ENVIRONMENT=staging
ENV APP_RELEASE=$APP_RELEASE
ENV APP_ENVIRONMENT=$APP_ENVIRONMENT

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health/live').then((response) => { if (!response.ok) process.exit(1) }).catch(() => process.exit(1))"]

CMD ["node", "server.js"]
