# ReComDash

A realtime e-commerce admin dashboard built with **RedwoodJS 8.9**, a **Go WebSocket service**, and **Redis Pub/Sub**. Provides live order tracking, sales analytics, product and user management, and an AI-powered chatbot assistant.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Running the Services](#running-the-services)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [CI/CD Pipeline](#cicd-pipeline)

---

## Architecture Overview

```
┌──────────────────────────────────────────────┐
│                Browser Client                │
│  React 18 + Vite + Tailwind + shadcn/ui      │
└──────┬──────────────┬───────────────┬────────┘
       │ GraphQL      │ REST          │ WebSocket
       ▼              ▼               ▼
┌─────────────┐  ┌───────────────────────────┐
│ RedwoodJS   │  │      Go Realtime Service  │
│ GraphQL API │  │  WebSocket + Redis Sub    │
│ (Port 8911) │  │  (Port 8080)              │
└──────┬──────┘  └─────────────┬─────────────┘
       │ Prisma                │ Subscribe
       ▼                       ▼
┌────────────┐          ┌─────────────┐
│ PostgreSQL │          │    Redis    │
└────────────┘          └─────────────┘
       ▲                       ▲
       └───── Order events ────┘
              (Pub/Sub)
```

The RedwoodJS API handles standard CRUD operations and publishes order events to Redis. The Go service subscribes to Redis, processes those events into live metrics, and streams updates to connected clients over WebSocket.

---

## Tech Stack

| Layer        | Technology                                |
| ------------ | ----------------------------------------- |
| Frontend     | React 18, Vite, Tailwind CSS, shadcn/ui   |
| Framework    | RedwoodJS 8.9 (monorepo)                  |
| GraphQL      | Apollo Client, GraphQL Yoga               |
| ORM          | Prisma + PostgreSQL                       |
| Realtime     | Go 1.26, gorilla/websocket, Redis Pub/Sub |
| Auth         | RedwoodJS dbAuth (PBKDF2)                 |
| AI Chatbot   | Google Gemini API                         |
| Image Upload | Cloudinary                                |
| Deployment   | Docker, Docker Compose, AWS EC2           |
| CI/CD        | GitHub Actions                            |

---

## Prerequisites

| Tool                    | Version              |
| ----------------------- | -------------------- |
| Node.js                 | 20.x                 |
| Yarn                    | 4.6.0 (via Corepack) |
| Go                      | 1.26+                |
| PostgreSQL              | 14+                  |
| Redis                   | 6+                   |
| Docker + Docker Compose | Latest               |

Enable Corepack to get the correct Yarn version automatically:

```bash
corepack enable
```

---

## Local Development Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd recomdash-redwood
```

### 2. Install dependencies

```bash
yarn install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your local credentials. See [Environment Variables](#environment-variables) for details.

### 4. Set up the database

```bash
# Apply all migrations and generate the Prisma client
yarn rw prisma migrate dev

# Seed the database with sample data
yarn rw exec seed
```

### 5. Start the Go realtime service

```bash
cd go-realtime
go mod download
go run ./cmd/server/main.go
```

The service starts on `http://localhost:8080`. It connects to Redis on startup and bootstraps its in-memory state from the RedwoodJS API.

### 6. Start the RedwoodJS dev server

```bash
# From the project root
yarn rw dev
```

| Service      | URL                                              |
| ------------ | ------------------------------------------------ |
| Web (React)  | http://localhost:8910                            |
| GraphQL API  | http://localhost:8911/.redwood/functions/graphql |
| Go WebSocket | ws://localhost:8080/ws                           |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values below.

### Database

```env
DATABASE_URL=postgres://<user>:<password>@localhost:5432/recomdash
```

### Auth

```env
SESSION_SECRET=<random-secret-min-32-chars>
SEED_ACCOUNT_PASSWORD=<password-for-seeded-admin-account>
```

### Redis

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_USERNAME=default
REDIS_ADDR=localhost:6379
REDIS_DB=0
```

### Go Realtime Service (exposed to the browser via `REDWOOD_ENV_` prefix)

```env
REDWOOD_ENV_GO_SERVICE_URL=http://localhost:8080
REDWOOD_ENV_GO_SERVICE_WS_URL=ws://localhost:8080
```

### Go Service Bootstrap (used by the Go service to hydrate state on startup)

```env
BOOTSTRAP_API_URL=http://localhost:8911
```

### Cloudinary (avatar and product image uploads)

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### Google Gemini (AI chatbot)

```env
GEMINI_API_KEY=
```

### Order Generator (load testing utility)

```env
GENERATOR_EMAIL=admin@example.com
GENERATOR_PASSWORD=<your-admin-password>
GENERATOR_API_URL=http://localhost:8911
```

---

## Database

The schema is defined in `api/db/schema.prisma`. Core models:

| Model       | Description                                         |
| ----------- | --------------------------------------------------- |
| `User`      | Admin, seller, staff, and customer accounts         |
| `Product`   | Product catalog with stock and status tracking      |
| `Order`     | Customer orders with payment and fulfillment status |
| `OrderItem` | Line items linking orders to products               |

### Common Prisma commands

```bash
# Create and apply a new migration after schema changes
yarn rw prisma migrate dev --name <migration-name>

# Apply migrations in production (no prompts)
yarn rw prisma migrate deploy

# Open Prisma Studio (visual DB browser)
yarn rw prisma studio

# Regenerate Prisma client after schema changes
yarn rw prisma generate
```

---

## Running the Services

### Development (all services separately)

```bash
# Terminal 1: RedwoodJS (web + api)
yarn rw dev

# Terminal 2: Go realtime service
cd go-realtime && go run ./cmd/server/main.go
```

### Production (Docker Compose)

```bash
# Build and start all services
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Stop all services
docker compose -f docker-compose.prod.yml down
```

The production stack includes:

| Container     | Role                         | Port            |
| ------------- | ---------------------------- | --------------- |
| `nginx`       | Reverse proxy, SPA serving   | 80              |
| `redwood-web` | React SPA (static files)     | 3000 (internal) |
| `redwood-api` | GraphQL API                  | 8911 (internal) |
| `go-realtime` | WebSocket + Redis subscriber | 8080 (internal) |

Nginx routes:

- `/` — React SPA
- `/.redwood/functions/` — RedwoodJS API
- `/api/realtime/` — Go REST endpoints
- `/ws` — Go WebSocket

---

## Available Scripts

```bash
# Start dev server (web :8910, api :8911)
yarn rw dev

# Run all tests
yarn rw test

# Run web tests only
yarn rw test web

# Run API tests only
yarn rw test api

# Lint all code
yarn rw lint

# Type check
yarn rw type-check

# Generate a new scaffold/page/component/service/SDL
yarn rw generate <type> <name>

# Add a shadcn/ui component
yarn shad <component-name>   # e.g. yarn shad card

# Seed the database
yarn rw exec seed

# Generate test orders (load testing)
yarn gen:orders              # default speed
yarn gen:orders:fast         # fast mode
yarn gen:orders:slow         # slow mode

# Open Storybook
yarn rw storybook
```

---

## Project Structure

```
recomdash-redwood/
├── api/                        # RedwoodJS backend
│   ├── db/
│   │   ├── schema.prisma       # Database schema
│   │   └── migrations/         # Prisma migration history
│   └── src/
│       ├── functions/          # Serverless function handlers
│       │   ├── graphql.ts      # GraphQL endpoint
│       │   ├── auth.ts         # Auth handler (login/logout/signup)
│       │   ├── dashboardBootstrap.ts
│       │   └── uploadAvatar.ts
│       ├── graphql/            # SDL type definitions
│       │   ├── orders.sdl.ts
│       │   ├── products.sdl.ts
│       │   ├── users.sdl.ts
│       │   ├── dashboard.sdl.ts
│       │   ├── chat.sdl.ts
│       │   └── globalSearch.sdl.ts
│       ├── services/           # Business logic & resolvers
│       │   ├── orders/
│       │   ├── products/
│       │   ├── users/
│       │   ├── dashboard/
│       │   ├── chat/           # Gemini AI integration
│       │   └── globalSearch/
│       └── lib/
│           ├── db.ts           # Prisma client singleton
│           ├── auth.ts         # Auth configuration
│           └── logger.ts       # Structured logger
│
├── web/                        # React frontend
│   └── src/
│       ├── pages/
│       │   ├── Admin/          # Dashboard, Orders, Products, Users, Settings
│       │   └── LoginPage/
│       ├── components/
│       │   ├── ui/             # shadcn/ui primitives
│       │   ├── Dashboard/
│       │   ├── Orders/
│       │   ├── Products/
│       │   ├── Users/
│       │   ├── AdminChatbot/
│       │   ├── GlobalSearch/
│       │   ├── Header/
│       │   └── Sidebar/
│       ├── App.tsx
│       └── Routes.tsx
│
├── go-realtime/                # Go WebSocket service
│   ├── cmd/server/main.go      # Entry point
│   └── internal/
│       ├── bootstrap/          # Hydrates Redis on startup
│       ├── config/             # Env config
│       ├── events/             # Event type definitions
│       ├── handlers/           # Redis event handlers
│       ├── processors/         # Metrics aggregation
│       ├── redis/              # Redis client + subscriber
│       ├── repository/         # Dashboard state in Redis
│       └── websocket/          # WS hub + connection mgmt
│
├── scripts/
│   ├── seed.ts                 # Database seeder
│   └── order-generator.ts      # Load test order generator
│
├── nginx/                      # Nginx reverse proxy config
├── docker-compose.prod.yml     # Production Docker Compose
├── redwood.toml                # RedwoodJS configuration
└── .env.example                # Environment variable template
```

---

## API Reference

### GraphQL API

**Endpoint:** `/.redwood/functions/graphql`

All queries and mutations require a session cookie (set by `/.redwood/functions/auth`). Fields are protected by `@requireAuth` or `@skipAuth` directives defined in each SDL file.

Key operations:

```graphql
# Dashboard metrics
query DashboardStats($timeRange: TimeRange!) {
  dashboardStats(timeRange: $timeRange) { ... }
}

# Orders
query Orders { orders { id orderNumber status totalAmount ... } }
mutation CreateOrder($input: CreateOrderInput!) { createOrder(input: $input) { id } }
mutation UpdateOrder($id: String!, $input: UpdateOrderInput!) { updateOrder(id: $id, input: $input) { id } }

# Products
query Products { products { id name sku price stock status } }

# AI Chatbot
mutation Chat($message: String!) { chat(message: $message) { response } }

# Global search
query GlobalSearch($query: String!) { globalSearch(query: $query) { ... } }
```

### Go Realtime Service

| Endpoint            | Method    | Description                              |
| ------------------- | --------- | ---------------------------------------- |
| `/health`           | GET       | Health check — returns `{"status":"ok"}` |
| `/metrics/snapshot` | GET       | Current dashboard metrics snapshot       |
| `/ws`               | WebSocket | Realtime event stream                    |

#### WebSocket Events

Connect to `ws://<host>/ws`. Messages are JSON-encoded:

```json
{
  "type": "order_created",
  "payload": { "orderId": "...", "totalAmount": 99.99 }
}
```

Common event types: `order_created`, `order_updated`, `metrics_updated`.

### Authentication

```
POST /.redwood/functions/auth
```

Uses RedwoodJS dbAuth cookie-based sessions:

```json
// Login request body
{ "method": "login", "username": "admin@example.com", "password": "..." }


// Response sets an HttpOnly session cookie used by all subsequent requests
```

---

## Deployment

### Required Secrets

Configure these as GitHub Actions secrets and ensure they are available on the EC2 host:

| Secret               | Description                    |
| -------------------- | ------------------------------ |
| `DOCKERHUB_USERNAME` | Docker Hub username            |
| `DOCKERHUB_TOKEN`    | Docker Hub access token        |
| `EC2_HOST`           | EC2 public hostname or IP      |
| `EC2_USER`           | SSH user (e.g. `ubuntu`)       |
| `EC2_SSH_KEY`        | Private SSH key for EC2 access |

### Manual Deployment

```bash
# 1. Build and push images
docker build -t <user>/recomdash-api:latest     -f api/Dockerfile .
docker build -t <user>/recomdash-web:latest     -f web/Dockerfile .
docker build -t <user>/recomdash-go-realtime:latest -f go-realtime/Dockerfile go-realtime/
docker build -t <user>/recomdash-nginx:latest   -f nginx/Dockerfile nginx/
docker push <user>/recomdash-api:latest
docker push <user>/recomdash-web:latest
docker push <user>/recomdash-go-realtime:latest
docker push <user>/recomdash-nginx:latest

# 2. Copy compose file and deploy on EC2
scp docker-compose.prod.yml user@<ec2-host>:~/
ssh user@<ec2-host> "TAG=latest docker compose -f docker-compose.prod.yml up -d --remove-orphans"
```

### Production Environment Variables

All environment variables must be present on the EC2 host (e.g. in an `.env` file alongside `docker-compose.prod.yml`). At minimum:

```env
DOCKERHUB_USERNAME=
TAG=latest
DATABASE_URL=
SESSION_SECRET=
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
GEMINI_API_KEY=
COOKIE_SECURE=true
```

---

## CI/CD Pipeline

The GitHub Actions pipeline runs on every push to `main` and on pull requests.

### CI (`ci.yml`)

Three jobs run in parallel:

1. **Node.js** — install deps, generate Prisma client, lint, type-check, build
2. **Go** — `go vet`, `gofmt`, `staticcheck`, tests with `-race`, build
3. **Docker** — validates all four Docker image builds (on `main` and PRs to `main`)

### Deploy (`deploy.yml`)

Triggers automatically after CI passes on `main`:

1. Builds and pushes all four Docker images to Docker Hub tagged with the git SHA
2. SCPs `docker-compose.prod.yml` to the EC2 instance
3. SSH deploys: pulls new images, restarts containers, prunes dangling images

```
push to main
    │
    ├─► CI (lint + type-check + build + tests)
    │        │
    │        └─► Deploy (build images → push to Docker Hub → EC2 rolling update)
```

---

## Development Tips

**Adding a new resource (full scaffold):**

```bash
# 1. Add model to api/db/schema.prisma, then:
yarn rw prisma migrate dev --name add-<model>

# 2. Scaffold SDL + service + cells + pages
yarn rw generate sdl <ModelName>
yarn rw generate page <Name>
```

**Adding a shadcn/ui component:**

```bash
yarn shad button
yarn shad data-table
yarn shad dialog
```

**Browsing the database visually:**

```bash
yarn rw prisma studio
# Opens at http://localhost:5555
```

**Generating load test orders:**

```bash
# Streams orders continuously against the local API
yarn gen:orders
```
