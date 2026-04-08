# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Realtime E-commerce Dashboard built with RedwoodJS 8.9.0 (full-stack monorepo). Frontend uses React 18 + Vite + Tailwind CSS + shadcn/ui. Backend has two API layers:

- **RedwoodJS GraphQL API** (Apollo + Prisma + PostgreSQL) — standard CRUD and business logic
- **Go service** — external HTTP/WebSocket endpoints for heavy real-time data processing tasks (analytics, streaming, etc.)

## Commands

```bash
# Start development (web on :8910, API on :8911)
yarn rw dev

# Generate scaffold, page, component, service, SDL, etc.
yarn rw generate <type> <name>

# Run all tests
yarn rw test

# Run web tests only
yarn rw test web

# Run API tests only
yarn rw test api

# Run a single test file
yarn rw test web web/src/components/MyComponent/MyComponent.test.tsx

# Lint
yarn rw lint

# Type check
yarn rw type-check

# Prisma migrations
yarn rw prisma migrate dev
yarn rw prisma migrate deploy
yarn rw prisma studio

# Seed database
yarn rw exec seed

# Add a shadcn component
yarn shad <component-name>

# Storybook
yarn rw storybook
```

## Architecture

### Monorepo Structure

- `api/` — GraphQL API (Node.js, Apollo Server, Prisma)
- `web/` — React frontend (Vite, Tailwind, shadcn/ui)
- `scripts/` — Database seed scripts
- `redwood.toml` — Framework configuration (ports, API URL)

### API (`api/src/`)

| Directory     | Purpose                                                           |
| ------------- | ----------------------------------------------------------------- |
| `functions/`  | Serverless functions (e.g., `graphql.ts` — the GraphQL handler)   |
| `graphql/`    | SDL type definitions (`.sdl.ts` files)                            |
| `services/`   | Business logic, resolvers                                         |
| `directives/` | `@requireAuth` / `@skipAuth` GraphQL directives                   |
| `lib/`        | Shared utilities: `db.ts` (Prisma client), `auth.ts`, `logger.ts` |

**Database:** PostgreSQL via Prisma. Schema at `api/db/schema.prisma`. Currently has a placeholder `UserExample` model — replace with real models.

### Web (`web/src/`)

| Directory     | Purpose                                                  |
| ------------- | -------------------------------------------------------- |
| `pages/`      | Route-mapped page components                             |
| `layouts/`    | Shared layout wrappers                                   |
| `components/` | Reusable components; `ui/` holds shadcn primitives       |
| `lib/`        | Client utilities (`cn()` for Tailwind class merging)     |
| `App.tsx`     | Root with `FatalErrorBoundary` + `RedwoodApolloProvider` |
| `Routes.tsx`  | All route definitions                                    |

**Styling:** Tailwind CSS with CSS variable-based theming (see `web/config/tailwind.config.js`). Dark mode uses class strategy. shadcn components live in `web/src/components/ui/`.

### Data Flow

RedwoodJS connects SDL type definitions → services → Prisma. The typical pattern for a new resource:

1. Add model to `api/db/schema.prisma` and migrate
2. Run `yarn rw generate sdl <model>` to scaffold SDL + service
3. Run `yarn rw generate page <name>` for frontend page
4. Cells (`*.Cell.tsx`) handle GraphQL data fetching with built-in loading/empty/failure states

### Go Service Integration

The Go service handles real-time and compute-heavy tasks (stream processing, aggregations, WebSocket feeds). Call it directly from the React frontend — do **not** proxy through the RedwoodJS GraphQL layer for latency-sensitive paths.

Pattern for Go service calls on the frontend:

```ts
// Use fetch/WebSocket directly, not Apollo, for Go service endpoints
const response = await fetch(`${GO_SERVICE_URL}/api/analytics/realtime`, {
  headers: { Authorization: `Bearer ${token}` },
})

// For streaming data, use WebSocket or EventSource
const ws = new WebSocket(`${GO_SERVICE_WS_URL}/ws/orders`)
```

Keep Go service base URLs in environment variables (`VITE_GO_SERVICE_URL`, `VITE_GO_SERVICE_WS_URL`). Create thin custom hooks (e.g., `useRealtimeOrders`) that encapsulate the transport details — components should not know whether data comes from GraphQL or the Go service.

### UI Components

**Always prefer shadcn/ui components** over building from scratch. Before creating any UI element, check `web/src/components/ui/` for existing shadcn components, and add missing ones with:

```bash
yarn shad <component-name>   # e.g. yarn shad card, yarn shad data-table
```

shadcn components are the foundation; compose them using the patterns in `.agents/skills/vercel-composition-patterns/`.

### Key Conventions

- RedwoodJS CLI (`yarn rw`) is the primary tool — prefer generators over manual file creation
- Auth directives must be applied to every SDL field: `@requireAuth` or `@skipAuth`
- Cells are the RedwoodJS pattern for data-fetching components (export `QUERY`, `Loading`, `Empty`, `Failure`, `Success`)
- Path aliases: `src/` maps to `web/src/`, `$api` maps to `api/src/`

## Frontend Best Practices

The `.agents/skills/` directory contains engineering rules that **must be followed** when writing React code. The three skill documents are authoritative:

### `.agents/skills/vercel-react-best-practices/AGENTS.md`

40+ performance rules. The highest-priority ones for this real-time dashboard:

- **Eliminate waterfalls (CRITICAL):** Fetch independent data in parallel with `Promise.all()`. Defer `await` until the result is actually needed. Use strategic `<Suspense>` boundaries to unblock rendering.
- **Bundle size (CRITICAL):** Import from specific files, not barrel files. Use dynamic imports (`React.lazy`) for heavy components (charts, editors). Defer non-critical third-party libs.
- **Re-renders (MEDIUM):** Derive state during render — no `useEffect` to sync derived values. Use `useRef` for transient/non-visual values. Use `useTransition`/`useDeferredValue` for non-urgent updates (e.g., filtering large datasets). Never define components inside other components.
- **Client data fetching:** Use passive event listeners for scroll handlers. Deduplicate global event listeners.

### `.agents/skills/vercel-composition-patterns/AGENTS.md`

Component architecture rules:

- **No boolean prop proliferation (CRITICAL):** Never add `isX`, `hasY`, `showZ` boolean props to customize behavior. Create explicit variant components instead.
- **Compound components (HIGH):** Complex UI should use compound component pattern with shared context (`state`, `actions`, `meta` interface). UI components consume the context — they don't know the state implementation.
- **Lift state to providers (HIGH):** State needed by sibling components goes in a provider, not passed via props or synced with `useEffect`.
- **Prefer `children` over render props** for static composition. Use render props only when the parent must pass data to the child.
- **React 18 note:** This project is on React 18 — do **not** apply React 19 API changes (`ref` as prop, `use()` instead of `useContext`). Use `forwardRef` and `useContext` as appropriate.

### `.agents/skills/vercel-react-view-transitions/AGENTS.md`

View Transition API guidance for smooth animations. Key rules:

- Every `<ViewTransition>` must communicate a spatial relationship — if you can't articulate what it communicates, don't add it.
- Use `default="none"` on all VTs and explicitly enable only desired triggers to prevent competing animations.
- Directional slides (`nav-forward`/`nav-back`) for hierarchical navigation only. Lateral tabs use cross-fade.
- Always include reduced-motion CSS in global stylesheet.
- **Note:** `<ViewTransition>` requires React canary — not available in stable React 18. Defer view transitions until the project upgrades.
