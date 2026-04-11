# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN corepack enable

WORKDIR /app

# Copy workspace manifests + lockfile first
COPY package.json yarn.lock .yarnrc.yml* ./
COPY api/package.json api/
COPY web/package.json web/

# Install all workspace deps
RUN yarn install --immutable

# Copy source
COPY web/ web/
COPY api/ api/
COPY redwood.toml graphql.config.js ./

# Generate Prisma client (needed for type generation)
RUN yarn rw prisma generate

# Build the web bundle
# REDWOOD_ENV_* vars are baked in at build time by Vite.
# Leave them empty so the browser uses relative URLs through Nginx,
# which removes any deployment-specific hostname from the image.
ARG REDWOOD_ENV_GO_SERVICE_URL=""
ARG REDWOOD_ENV_GO_SERVICE_WS_URL=""

RUN yarn rw build web

# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# wget is not included in nginx:alpine by default; needed for the healthcheck
RUN apk add --no-cache wget

# Copy built SPA
COPY --from=builder /app/web/dist/ /usr/share/nginx/html/

# Replace default nginx config with SPA-aware config
COPY web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000
