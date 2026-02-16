import Fastify from 'fastify';
import cors from '@fastify/cors';
import { prisma } from '@stripe-integration/db';
import { ZodError } from 'zod';
import { registerAdminRoutes } from './routes/admin.js';
import { ensureDbInvariants } from './services/db-invariants.js';

const app = Fastify({ logger: true });
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
const demoAccessPassword = process.env.DEMO_ACCESS_PASSWORD?.trim() ?? '';
const REQUIRED_TABLES = [
  'accounts',
  'properties',
  'products',
  'pricings',
  'pricing_tiers',
  'subscriptions',
  'subscription_properties',
  'subscription_pricings',
  'payment_methods'
] as const;

type SqliteTable = { name: string };

async function assertDatabaseIsInitialized(): Promise<void> {
  const tables = await prisma.$queryRawUnsafe<SqliteTable[]>(
    "SELECT name FROM sqlite_master WHERE type = 'table';"
  );
  const tableNames = new Set(tables.map((table) => table.name));
  const missing = REQUIRED_TABLES.filter((table) => !tableNames.has(table));

  if (missing.length === 0) {
    return;
  }

  throw new Error(
    [
      `Database is not initialized. Missing tables: ${missing.join(', ')}.`,
      'Run `pnpm db:push` to create schema, or `pnpm setup:demo` for schema + seed data.'
    ].join(' ')
  );
}

await app.register(cors, {
  origin: corsOrigin.split(',').map((origin) => origin.trim()).filter(Boolean),
  allowedHeaders: ['content-type', 'x-demo-password']
});

app.get('/health', async () => ({ status: 'ok' }));
app.get('/api/health', async () => ({ status: 'ok' }));
app.get('/api/auth/validate', async () => ({ status: 'ok' }));

app.addHook('preHandler', async (request, reply) => {
  if (!demoAccessPassword || request.method === 'OPTIONS') {
    return;
  }

  if (request.url === '/health' || request.url === '/api/health') {
    return;
  }

  const rawHeader = request.headers['x-demo-password'];
  const requestPassword = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

  if (requestPassword === demoAccessPassword) {
    return;
  }

  reply.status(401).send({ message: 'Unauthorized' });
});

await registerAdminRoutes(app);

app.setErrorHandler((error, request, reply) => {
  request.log.error({ err: error }, 'Unhandled request error');

  if (error instanceof ZodError) {
    reply.status(400).send({
      message: 'Validation error',
      issues: error.issues
    });
    return;
  }

  const statusCode =
    typeof (error as { statusCode?: unknown }).statusCode === 'number'
      ? (error as { statusCode: number }).statusCode
      : 500;

  const message =
    statusCode >= 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error instanceof Error
        ? error.message
        : 'Internal server error';

  reply.status(statusCode).send({ message });
});

const shutdown = async (): Promise<void> => {
  await prisma.$disconnect();
  await app.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const port = Number(process.env.PORT ?? 4000);
try {
  await assertDatabaseIsInitialized();
  await ensureDbInvariants();
} catch (error) {
  app.log.error({ err: error }, 'Startup database check failed');
  await prisma.$disconnect();
  process.exit(1);
}

await app.listen({ port, host: '0.0.0.0' });
