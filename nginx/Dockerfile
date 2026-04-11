FROM nginx:1.27-alpine

# wget for healthcheck; openssl for self-signed TLS cert
RUN apk add --no-cache wget openssl

# Generate self-signed cert (CN=localhost — browser warns for self-signed regardless of CN)
RUN mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/nginx/ssl/selfsigned.key \
      -out /etc/nginx/ssl/selfsigned.crt \
      -subj "/CN=localhost"

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Remove the default server block that comes with the base image
RUN rm -f /etc/nginx/conf.d/default.conf.bak

EXPOSE 80 443

# Healthcheck stays on plain HTTP /healthz (not redirected to HTTPS)
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://localhost/healthz
