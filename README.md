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

## Run From Scratch

1. Ensure Node.js 20+ and pnpm are installed.
2. Install dependencies:

```bash
pnpm install
```

3. Generate Prisma client:

```bash
pnpm db:generate
```

4. Create/update SQLite schema:

```bash
pnpm db:push
```

5. Seed data:

```bash
pnpm db:seed
```

6. Start both web and api in dev mode:

```bash
pnpm dev
```

## Useful Commands

```bash
pnpm dev:web
pnpm dev:api
pnpm db:migrate
pnpm db:studio
pnpm typecheck
pnpm lint
```

## Current Scope

This repository intentionally contains only scaffolding, placeholders, and seed data.
No production business logic is implemented yet.
