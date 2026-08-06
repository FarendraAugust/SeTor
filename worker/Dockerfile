FROM oven/bun:1.3-alpine

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY tsconfig.json drizzle.config.ts ./
COPY drizzle ./drizzle
COPY src ./src
COPY docker-entrypoint.sh ./

# TypeScript compile check + emit ke dist (bun start menjalankan dist/main.js)
RUN bun run build

RUN chmod +x docker-entrypoint.sh
EXPOSE 3101
ENTRYPOINT ["./docker-entrypoint.sh"]
