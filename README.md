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

## Quick Recipes (Copy/Paste)

### I just want to run everything with demo data

```bash
pnpm demo
```

### I want to reset demo data and run again

```bash
pnpm demo:refresh
pnpm dev
```

### I want to run without demo data

```bash
pnpm db:generate
pnpm db:push
pnpm dev
```

### I ran `git clean -fdX` and now app does not start

```bash
pnpm install
pnpm setup:demo
pnpm dev
```

Why: `git clean -fdX` removes ignored files, including `node_modules` and local DB files.

## Refresh Demo Data

Use this when you want to reset local runtime data back to the standard demo dataset:

```bash
pnpm demo:refresh
pnpm dev
```

Note: seeding clears and recreates data in local `packages/db/dev.db`.

## Run Without Demo Data

Use this if you want to run the prototype with an empty/local-only dataset:

```bash
pnpm db:generate
pnpm db:push
pnpm dev
```

Important: do not run `pnpm demo`, `pnpm setup:demo`, or `pnpm db:seed` if you want to avoid demo data.

## Troubleshooting

- Error: `spawn ENOENT` or `vite not found`
  - Run: `pnpm install`
- Warning: `node_modules missing`
  - Run: `pnpm install`
- DB looks empty or broken
  - Run: `pnpm setup:demo`

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
