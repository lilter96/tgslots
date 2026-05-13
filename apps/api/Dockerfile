FROM oven/bun:1.3.13-alpine
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY packages ./packages
COPY apps/api ./apps/api

RUN bun install

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["bun", "run", "--cwd", "apps/api", "src/index.ts"]
