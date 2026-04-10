# Production Deployment Guide

## Architecture

Four Docker containers sit behind an Nginx reverse proxy:

```
Internet → EC2 :80 → nginx
                       ├─ /ws, /api/realtime/  → go-realtime:8080
                       ├─ /.redwood/functions/ → redwood-api:8911
                       └─ /                    → redwood-web:3000
```

All containers communicate over a private Docker bridge network (`internal`). Only `nginx` publishes a port to the host.

---

## GitHub Secrets Checklist

Set these in **Settings → Secrets and variables → Actions → Secrets** (repository or environment-scoped under `production`):

| Secret               | Description                                          |
| -------------------- | ---------------------------------------------------- |
| `DOCKERHUB_USERNAME` | Docker Hub account username                          |
| `DOCKERHUB_TOKEN`    | Docker Hub access token (read/write)                 |
| `EC2_HOST`           | Public IP or DNS of the EC2 instance                 |
| `EC2_USER`           | SSH user (e.g. `ubuntu`, `ec2-user`)                 |
| `EC2_SSH_KEY`        | Full private key for SSH access (PEM, no passphrase) |

These secrets are **deployment secrets** only — they never end up inside Docker images.

---

## EC2 Instance Prerequisites

1. **OS**: Ubuntu 22.04 LTS (recommended)
2. **Docker**: Install Docker Engine + Compose plugin
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER   # log out and back in
   ```
3. **Deployment directory**:
   ```bash
   sudo mkdir -p /opt/recomdash
   sudo chown $USER:$USER /opt/recomdash
   ```
4. **Environment file** (`/opt/recomdash/.env`): Create from `.env.example`. All secrets go here — never commit this file.
   ```bash
   cp .env.example /opt/recomdash/.env
   nano /opt/recomdash/.env   # fill in real values
   ```
5. **Compose file**: Copy `docker-compose.prod.yml` to `/opt/recomdash/`.
   ```bash
   scp docker-compose.prod.yml ubuntu@<EC2_HOST>:/opt/recomdash/
   ```
6. **Security group**: Open inbound TCP port `80` (and `443` if adding TLS later).

---

## First-Time Deploy

```bash
cd /opt/recomdash

# Pull images (replace TAG with a commit SHA or 'latest')
TAG=latest docker compose -f docker-compose.prod.yml pull

# Start all services
TAG=latest docker compose -f docker-compose.prod.yml up -d

# Check health
docker compose -f docker-compose.prod.yml ps
```

After first start the `redwood-api` container runs `prisma migrate deploy` automatically, applying any pending migrations.

---

## Automated Deploy (GitHub Actions)

Every push to `main` triggers the CI workflow. If CI passes, the `deploy` workflow:

1. Builds and pushes all four Docker images to Docker Hub (tagged with commit SHA + `latest`).
2. SSHs into the EC2 instance and runs `docker compose pull && docker compose up -d`.

No manual intervention is required after the first-time setup above.

---

## Key Environment Variables

| Variable            | Where used    | Notes                                                                      |
| ------------------- | ------------- | -------------------------------------------------------------------------- |
| `DATABASE_URL`      | `redwood-api` | Postgres connection string                                                 |
| `SESSION_SECRET`    | `redwood-api` | Random 64-char string                                                      |
| `REDIS_ADDR`        | `go-realtime` | `host:port` of Redis instance                                              |
| `REDIS_PASSWORD`    | `go-realtime` | Leave blank for no-auth Redis                                              |
| `BOOTSTRAP_API_URL` | `go-realtime` | Set automatically in compose: `http://redwood-api:8911/.redwood/functions` |
| `GEMINI_API_KEY`    | `redwood-api` | Optional — AI chat features                                                |

`REDWOOD_ENV_GO_SERVICE_URL` and `REDWOOD_ENV_GO_SERVICE_WS_URL` are intentionally left **empty** in the web image. The browser uses relative URLs (`/ws`, `/.redwood/functions/`) which Nginx routes to the correct internal service — no hostname is baked into the image.

---

## Troubleshooting

**Container keeps restarting**

```bash
docker compose -f docker-compose.prod.yml logs <service-name>
```

**Database migration failed on startup**

```bash
docker compose -f docker-compose.prod.yml run --rm redwood-api yarn rw prisma migrate status
```

**Go service can't reach bootstrap endpoint**

- Verify `redwood-api` is healthy before `go-realtime` starts (handled by `depends_on` with health check).
- The bootstrap URL inside the container is `http://redwood-api:8911/.redwood/functions/dashboardBootstrap` — check `go-realtime` logs for HTTP errors.

**Stale images after deploy**

```bash
docker image prune -f
```
