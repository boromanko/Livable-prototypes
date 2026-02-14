# Stripe Integration V2.1 (UX Prototype Scaffold)

Local monorepo scaffold for web + api + db packages with TypeScript everywhere.

## Stack

- Monorepo: pnpm workspaces
- Frontend: Vite + React + MUI + React Router + TanStack Query
- Backend: Node 20 + Fastify + @fastify/cors + Zod
- Database: SQLite + Prisma ORM

## Repository Layout

- `apps/web` - React + Vite app
- `apps/api` - Fastify API
- `packages/db` - Prisma schema, SQLite, seed, Prisma client export
- `packages/shared` - shared workspace package placeholder
- `docs/agent-notes` - empty placeholder docs

## Quick Start (Designer-Friendly)

1. Ensure Node.js 20+ and pnpm are installed.
2. Run one command from repo root:

```bash
pnpm demo
```

This command will:
- install dependencies,
- prepare DB schema,
- fill DB with demo data,
- start web + api.

Open:
- Web UI: `http://localhost:5173`
- API: `http://localhost:3001`

## If You Need Fresh Demo Data

```bash
pnpm demo:refresh
```

Then start app:

```bash
pnpm dev
```

## Useful Commands

```bash
pnpm dev:web
pnpm dev:api
pnpm setup:demo
pnpm db:migrate
pnpm db:studio
pnpm typecheck
pnpm lint
```

## Current Scope

This repository intentionally contains only scaffolding, placeholders, and seed data.
No production business logic is implemented yet.
