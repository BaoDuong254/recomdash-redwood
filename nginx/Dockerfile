FROM nginx:1.27-alpine

# wget is not included in nginx:alpine by default; needed for healthcheck
RUN apk add --no-cache wget

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Remove the default server block that comes with the base image
RUN rm -f /etc/nginx/conf.d/default.conf.bak

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://localhost/healthz
