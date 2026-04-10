FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Remove the default server block that comes with the base image
RUN rm -f /etc/nginx/conf.d/default.conf.bak

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ -S 2>&1 | grep -q "HTTP/" || exit 1
