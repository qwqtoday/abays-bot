FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

FROM node:20-alpine AS production

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S bot -u 1001

COPY package.json package-lock.json ./
RUN npm install --omit=dev && npm cache clean --force

# Install tsx for running TypeScript directly
RUN npm install tsx

COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/drizzle.config.ts ./

RUN mkdir -p /app/data && chown -R bot:nodejs /app

USER bot

ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/bot.db

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["npx", "tsx", "src/index.ts"]