# syntax=docker/dockerfile:1

# ---- deps: install with the lockfile only, so this layer caches well ----
FROM node:24-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json shared/
RUN pnpm install --frozen-lockfile --filter matchpoynt...

# ---- build: compile the Vite app ----
FROM deps AS build
COPY . .
RUN pnpm build

# ---- runtime: static files only, served by an unprivileged nginx ----
FROM nginx:stable-alpine AS runtime
RUN addgroup -S -g 10001 matchpoynt \
  && adduser -S -D -H -u 10001 -G matchpoynt -s /sbin/nologin matchpoynt \
  && rm -rf /etc/nginx/conf.d /usr/share/nginx/html/* /docker-entrypoint.d
COPY docker/web/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
RUN mkdir -p /var/log/matchpoynt && chown matchpoynt:matchpoynt /var/log/matchpoynt && nginx -t
USER matchpoynt
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO /dev/null http://127.0.0.1:8080/ || exit 1
ENTRYPOINT ["nginx", "-g", "daemon off;"]
