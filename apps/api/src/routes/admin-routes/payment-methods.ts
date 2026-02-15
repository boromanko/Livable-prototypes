import type { FastifyInstance } from 'fastify';
import { prisma } from '@stripe-integration/db';
import { paymentMethodsLookupQuerySchema } from '../../schemas/lookup.js';

export async function registerAdminPaymentMethodsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/admin/payment-methods', async (request, reply) => {
    const query = paymentMethodsLookupQuerySchema.parse(request.query);

    const account = await prisma.account.findUnique({
      where: { id: query.accountId },
      select: { id: true }
    });

    if (!account) {
      reply.status(404).send({ message: 'Account not found' });
      return;
    }

    const items = await prisma.paymentMethod.findMany({
      where: {
        accountId: query.accountId
      },
      select: {
        id: true,
        accountId: true,
        type: true,
        label: true,
        last4: true,
        isDefault: true,
        createdAt: true
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
    });

    return {
      items
    };
  });
}
