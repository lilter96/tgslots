FROM oven/bun:1.3.13-alpine AS build
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile

ARG VITE_GAME_CLIENT_URL
ENV VITE_GAME_CLIENT_URL=$VITE_GAME_CLIENT_URL
RUN bun --filter @tgslots/marketing run build

FROM caddy:2.8-alpine
COPY --from=build /app/apps/marketing/dist /srv
COPY apps/marketing/Caddyfile /etc/caddy/Caddyfile
EXPOSE 3004
