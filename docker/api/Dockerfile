# syntax=docker/dockerfile:1

# ---- deps: install the API, the shared package and the unit tests from the lockfile ----
FROM node:24-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY test/package.json test/
RUN pnpm install --frozen-lockfile --filter @matchpoynt/server... --filter @matchpoynt/test

# ---- build: test, then bundle into a single file ----
FROM deps AS build
COPY shared shared
COPY server server
COPY scripts scripts
COPY test/unit test/unit
COPY test/vitest.config.ts test/
RUN pnpm --filter @matchpoynt/test unit && pnpm --filter @matchpoynt/server build

# ---- runtime: one JS file, no node_modules, no secrets ----
FROM node:24-alpine AS runtime
RUN addgroup -S -g 10001 matchpoynt \
  && adduser -S -D -H -u 10001 -G matchpoynt -s /sbin/nologin matchpoynt
WORKDIR /srv
COPY --from=build --chown=root:root /app/server/dist ./
ENV NODE_ENV=production API_PORT=8787
USER matchpoynt
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO /dev/null http://127.0.0.1:8787/api/health || exit 1
CMD ["node", "--enable-source-maps", "index.js"]
