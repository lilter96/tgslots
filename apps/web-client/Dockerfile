FROM oven/bun:1.3.13-alpine AS build
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN bun --filter @tgslots/web-client run build

FROM caddy:2.8-alpine
COPY --from=build /app/apps/web-client/dist /srv
COPY apps/web-client/Caddyfile /etc/caddy/Caddyfile
EXPOSE 3002
