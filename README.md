# Stripe Integration V2.1 (UX Prototype)

Monorepo for the Stripe Integration UX prototype (web, API, and local DB).

## Tech Stack

- Monorepo: pnpm workspaces
- Frontend: Vite + React + MUI + React Router + TanStack Query
- Backend: Node 20 + Fastify + Zod
- Database: SQLite + Prisma

## Project Structure

- `apps/web` - React app (prototype UI)
- `apps/api` - Fastify API
- `packages/db` - Prisma schema, migrations, seed data
- `packages/shared` - shared package placeholder
- `docs/agent-notes` - product and prototype notes

## Demo Run (One Command)

Prerequisites:
- Node.js 20+
- pnpm

From the repository root:

```bash
pnpm demo
```

What this does:
1. Installs dependencies.
2. Generates Prisma client.
3. Syncs DB schema.
4. Seeds demo data.
5. Starts web + API in dev mode.

Open after start:
- Web: `http://localhost:5173`
- API: `http://localhost:3001`

## Refresh Demo Data

Use this when you want to reset local runtime data back to the standard demo dataset:

```bash
pnpm demo:refresh
pnpm dev
```

Note: seeding clears and recreates data in local `packages/db/dev.db`.

## Useful Commands

```bash
pnpm dev
pnpm dev:web
pnpm dev:api
pnpm setup:demo
pnpm db:studio
pnpm typecheck
pnpm lint
```

## Scope

This repository is a prototype-focused implementation with seed data and non-production flows.
