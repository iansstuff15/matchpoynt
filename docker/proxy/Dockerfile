# syntax=docker/dockerfile:1

# ---- config: validate the proxy config at build time ----
FROM nginx:stable-alpine AS config
COPY docker/proxy/nginx.conf /etc/nginx/nginx.conf
RUN mkdir -p /var/log/matchpoynt \
  && sed -e 's/server web:8080;/server 127.0.0.1:8080;/' -e 's/server api:8787;/server 127.0.0.1:8787;/' /etc/nginx/nginx.conf > /tmp/nginx.test.conf \
  && nginx -t -c /tmp/nginx.test.conf

# ---- runtime: reverse proxy in front of the web container ----
FROM nginx:stable-alpine AS runtime
RUN addgroup -S -g 10001 matchpoynt \
  && adduser -S -D -H -u 10001 -G matchpoynt -s /sbin/nologin matchpoynt \
  && rm -rf /etc/nginx/conf.d /usr/share/nginx/html/* /docker-entrypoint.d
COPY --from=config /etc/nginx/nginx.conf /etc/nginx/nginx.conf
RUN mkdir -p /var/log/matchpoynt && chown matchpoynt:matchpoynt /var/log/matchpoynt
USER matchpoynt
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO /dev/null http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["nginx", "-g", "daemon off;"]
