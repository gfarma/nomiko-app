# Nomiko App — self-hosted production image
# Build:  docker build -t nomiko-app .
# Run:    docker run -d --name nomiko -p 3000:3000 --env-file .env.production nomiko-app
# Env required at runtime: DATABASE_URL, AUTH_SECRET, AUTH_TRUST_HOST=true
# (schema/seed run separately: `npx prisma db push && npm run seed` with the same DATABASE_URL)

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
# postinstall runs `prisma generate` (needs schema present)
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/src/generated ./src/generated
COPY . .
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# uploaded documents live here (mount a volume in production)
RUN mkdir -p /app/storage && chown nextjs:nodejs /app/storage
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
