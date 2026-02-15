# Stripe Integration V2.1 (UX Prototype)

Monorepo for the Stripe Integration UX prototype (web, API, and local DB).

## Tech Stack

- Monorepo: pnpm workspaces
- Frontend: Vite + React + MUI + React Router + TanStack Query
- Backend: Node 22 LTS + Fastify + Zod
- Database: SQLite + Prisma

## Project Structure

- `apps/web` - React app (prototype UI)
- `apps/api` - Fastify API
- `packages/db` - Prisma schema, migrations, seed data
- `packages/shared` - shared package placeholder
- `docs/agent-notes` - product and prototype notes

## How to run

Prerequisites:
- Node.js 22 LTS
- pnpm

If you use `nvm`:

```bash
source ~/.zshrc
nvm use
```

Install dependencies (first time or after cleanup):

```bash
pnpm install
```

### Daily run

```bash
pnpm dev
```

Open:
- Web: `http://localhost:5173`
- API: `http://localhost:4000/api/health`

### Run with demo data

```bash
pnpm setup:demo
pnpm dev
```

### Refresh demo data

```bash
pnpm demo:refresh
pnpm dev
```

### Run without demo data (empty DB)

```bash
pnpm db:generate
pnpm db:push
pnpm dev
```

### CI-equivalent local check

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm typecheck
pnpm lint
pnpm --filter @stripe-integration/api test
```

### Full cleanup and recovery

`git clean -fdX` removes ignored files (including `node_modules`, local DB, caches).
Local transpile artifacts (`apps/web/src/App.js`, `apps/web/src/main.js`) and ad-hoc SQLite snapshots (for example `packages/db/dev 2.db`) are ignored and removed by this command.

```bash
git clean -fdX
pnpm install
pnpm setup:demo
pnpm dev
```

### If port is already in use (`EADDRINUSE`)

```bash
lsof -nP -iTCP:4000 -sTCP:LISTEN -t | xargs kill -9
lsof -nP -iTCP:5173 -sTCP:LISTEN -t | xargs kill -9
pnpm dev
```

## Scope

This repository is a prototype-focused implementation with seed data and non-production flows.
