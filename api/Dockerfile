# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# corepack ships with node:20; enable Yarn Berry
RUN corepack enable

WORKDIR /app

# Copy workspace manifests + lockfile first so dependency layer is cached
COPY package.json yarn.lock .yarnrc.yml* ./
COPY api/package.json api/
COPY web/package.json web/

# Install all workspace deps (needed to build API)
RUN yarn install --immutable

# Copy source
COPY api/ api/
COPY redwood.toml graphql.config.js ./

# Generate Prisma client (no DATABASE_URL needed at generate time)
RUN yarn rw prisma generate

# Build the API (outputs to api/dist/)
RUN yarn rw build api

# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM node:20-alpine

RUN corepack enable

WORKDIR /app

# Copy workspace manifests + lockfile
COPY package.json yarn.lock .yarnrc.yml* ./
COPY api/package.json api/
COPY web/package.json web/

# Install production deps only
RUN yarn workspaces focus api --production

# Copy built API and Prisma schema
COPY --from=builder /app/api/dist/ api/dist/
COPY --from=builder /app/api/db/ api/db/
COPY --from=builder /app/node_modules/.prisma/ node_modules/.prisma/
COPY --from=builder /app/node_modules/@prisma/ node_modules/@prisma/
# Copy prisma CLI so we can run migrations without devDependencies.
# Invoke via build/index.js directly (not .bin/prisma) so __dirname resolves
# to node_modules/prisma/build/ where the companion WASM files live.
COPY --from=builder /app/node_modules/prisma/ node_modules/prisma/
COPY redwood.toml ./

EXPOSE 8911

# Run DB migrations then start the API server
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy --schema api/db/schema.prisma && node api/dist/server.js"]
