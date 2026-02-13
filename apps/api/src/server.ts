import Fastify from 'fastify';
import cors from '@fastify/cors';
import { prisma } from '@stripe-integration/db';
import { ZodError } from 'zod';
import { registerAdminRoutes } from './routes/admin.js';

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: ['http://localhost:5173']
});

app.get('/health', async () => ({ status: 'ok' }));
app.get('/api/health', async () => ({ status: 'ok' }));

await registerAdminRoutes(app);

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof ZodError) {
    reply.status(400).send({
      message: 'Validation error',
      issues: error.issues
    });
    return;
  }

  reply.status(500).send({ message: 'Internal server error' });
});

const shutdown = async (): Promise<void> => {
  await prisma.$disconnect();
  await app.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const port = Number(process.env.PORT ?? 4000);
await app.listen({ port, host: '0.0.0.0' });
