FROM oven/bun:1.3.13-alpine
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
USER bun
CMD ["bun", "apps/x7-math-worker/src/main.ts"]
