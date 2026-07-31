# Worker — Agent Guide

## Tech Stack

- **Runtime:** Bun 1.3
- **Framework:** Hono v4
- **Language:** TypeScript (strict, NodeNext modules)
- **Database:** PostgreSQL + Drizzle ORM + `postgres` driver
- **Auth:** JWT (HS256) + HttpOnly refresh cookie + argon2 hashing
- **Comm:** PostgreSQL LISTEN/NOTIFY (event bus)

## Dual Database

| DB | Env | Scope | Data |
|----|-----|-------|------|
| **Shared** | `DATABASE_URL` | Semua worker | Auth, sessions, worker registry, event bus |
| **Local** | `LOCAL_DATABASE_URL` | Per worker | Monitoring results (tiap server punya sendiri) |

## Project Structure

```
src/
├── config/env.ts           — validated env config (throws on missing required)
├── common/
│   ├── errors/http-error.ts   — HttpError class (extends Error, has statusCode)
│   └── middleware/
│       ├── error-handler.ts   — global error handler (catches HttpError)
│       └── rate-limit.ts      — in-memory sliding-window rate limiter
├── database/
│   ├── shared.ts              — drizzle PG client (shared DB)
│   ├── local.ts               — drizzle PG client (local DB)
│   └── schema/
│       ├── shared.ts          — re-export shared schemas
│       └── local.ts           — re-export local schemas
├── modules/
│   ├── auth/                  — authentication module
│   │   ├── auth.controller.ts — route handlers (parse input → json response)
│   │   ├── auth.service.ts    — business logic (throws HttpError)
│   │   ├── auth.repository.ts — drizzle queries (pure data access)
│   │   ├── auth.guard.ts      — JWT verify middleware (c.set('userId'))
│   │   ├── auth.validation.ts — validateRegister / validateLogin
│   │   ├── auth.schema.ts     — users + sessions tables
│   │   └── auth.types.ts      — User, Session, AuthTokens, etc.
│   ├── bus/                   — event bus module
│   │   ├── bus.service.ts     — pub/sub via PG LISTEN/NOTIFY (shared DB)
│   │   └── bus.types.ts       — BusEvent, BusHandler
│   ├── leader/                — leader election + worker registry
│   │   ├── leader.service.ts  — register, heartbeat, elect
│   │   ├── leader.schema.ts   — workers table (shared DB)
│   │   ├── worker.service.ts  — list workers, online status, me
│   │   ├── worker.controller.ts — GET /workers endpoints
│   │   └── leader.types.ts    — Worker type
│   ├── target/                — target configuration (shared DB)
│   │   ├── target.controller.ts — CRUD /targets endpoints
│   │   ├── target.service.ts  — business logic
│   │   ├── target.repository.ts — queries
│   │   ├── target.validation.ts — validateTarget
│   │   ├── target.schema.ts   — targets table
│   │   └── target.types.ts    — Target, TargetInput
│   ├── monitor/               — monitoring loop + results (local DB)
│   │   ├── monitor.controller.ts — dashboard endpoints (/monitoring/*)
│   │   ├── monitor.service.ts — checkTarget, runLoop, stats, timeline
│   │   ├── monitor.repository.ts — insert, stats, latestByTarget, timeline
│   │   ├── monitor.schema.ts  — monitoring table
│   │   └── monitor.types.ts   — Monitoring, MonitorStats, TargetStatus
│   ├── dashboard/             — dashboard aggregation + live events
│   │   ├── dashboard.controller.ts — overview, health, SSE /events
│   │   └── dashboard.service.ts — aggregate workers + monitoring data
│   └── health/                — health check
├── app.ts                     — createApp() factory
└── main.ts                    — entry point (serve)
```

## Layers (strict ordering)

```
Controller (HTTP) → Validation → Service (logic) → Repository (DB)
                                            ↘ throws HttpError
                                                    ↘ caught by global error-handler
```

## Coding Conventions

- **Imports:** Always include `.js` extension for relative imports
- **Exports:** Prefer `export const foo` / `export function foo`; use `export default` only for Hono routers
- **Errors:** Throw `HttpError.badRequest()`, `.unauthorized()`, `.notFound()`, `.conflict()`, `.tooMany()`, `.internal()`
- **No classes** (except EventBus, HttpError) — use const objects with function properties
- **Naming:** `module.layer.ts` (e.g. `auth.controller.ts`, `auth.service.ts`)
- **Types:** Colocate types with the module, export from `module.types.ts`
- **Context vars:** `c.get('userId')`, `c.get('userEmail')` set by `authGuard`
- **Env vars:** Access via `env.X` from `config/env.ts` (not `process.env.X`)
- **DB:** `dbShared` for shared data, `dbLocal` for per-worker data

## Commands

| Command | Description |
|---------|-------------|
| `bun dev` | Start dev server with watch |
| `bun run build` | TypeScript compilation check |
| `bun run db:generate` | Generate migration from shared schema |
| `bun run db:migrate` | Apply migrations to shared DB |
| `bun run db:push` | Push shared schema directly (dev only) |
| `bun run db:studio` | Open Drizzle Studio GUI |

## Auth API

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| POST | `/auth/register` | — | 10/60s | Register, returns accessToken + sets refresh cookie |
| POST | `/auth/login` | — | 10/60s | Login, returns accessToken + sets refresh cookie |
| POST | `/auth/refresh` | Cookie | — | Rotate refresh token, returns new accessToken |
| POST | `/auth/logout` | Cookie | — | Delete current session |
| POST | `/auth/logout-all` | Bearer | — | Delete all user sessions |
| GET | `/auth/me` | Bearer | — | Get current user profile |
| PATCH | `/auth/profile` | Bearer | — | Update name |
| POST | `/auth/change-password` | Bearer | — | Change password, invalidates all sessions |

## Dashboard API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/workers` | Bearer | List all workers + leader + online status |
| GET | `/workers/me` | Bearer | Current worker info |
| GET | `/targets` | Bearer | List monitored targets |
| POST | `/targets` | Bearer | Create target |
| GET/PATCH/DELETE | `/targets/:id` | Bearer | Get / update / delete target |
| GET | `/monitoring/stats` | Bearer | This worker's stats (total, up, down, uptime, avg) |
| GET | `/monitoring` | Bearer | Recent monitoring results |
| GET | `/monitoring/targets` | Bearer | Latest status per target |
| GET | `/monitoring/timeline/:targetId` | Bearer | History timeline for a target |
| POST | `/monitoring/check/:targetId` | Bearer | Trigger a check now |
| GET | `/dashboard` | Bearer | Aggregated overview (leader aggregates all workers) |
| GET | `/dashboard/health` | Bearer | Health summary |
| GET | `/dashboard/events` | Bearer | SSE stream (live monitoring events) |

## Monitoring Loop

- Runs every `CHECK_INTERVAL` seconds (default 60)
- Fetches enabled targets from shared DB
- Pings each target with timeout (per-target), saves result to local DB
- Emits `monitoring.result` event on the bus (drives SSE dashboard)
- `INTERNAL_TOKEN` lets the leader proxy data from other workers (same value on all workers)

## Adding a New Module

1. Create `src/modules/<name>/` directory
2. Create `<name>.controller.ts` (Hono router)
3. Create `<name>.service.ts` (business logic, throw HttpError)
4. Create `<name>.repository.ts` (drizzle queries) if DB access needed
5. Create `<name>.types.ts`, `<name>.validation.ts` as needed
6. Register in `src/modules/index.ts` via `app.route()`
