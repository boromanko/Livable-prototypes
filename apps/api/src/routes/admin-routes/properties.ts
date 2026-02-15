import type { FastifyInstance } from 'fastify';
import { prisma } from '@stripe-integration/db';
import type { Prisma } from '@stripe-integration/db';
import {
  propertiesLookupQuerySchema,
  propertyParamsSchema,
  updatePropertyUnitsBodySchema
} from '../../schemas/lookup.js';

export async function registerAdminPropertiesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/admin/properties', async (request, reply) => {
    const query = propertiesLookupQuerySchema.parse(request.query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const skip = (page - 1) * pageSize;

    const account = await prisma.account.findUnique({
      where: { id: query.accountId },
      select: { id: true }
    });

    if (!account) {
      reply.status(404).send({ message: 'Account not found' });
      return;
    }

    const where: Prisma.PropertyWhereInput = {
      accountId: query.accountId
    };

    if (query.search) {
      where.address = { contains: query.search };
    }

    const [items, total] = await prisma.$transaction([
      prisma.property.findMany({
        where,
        select: {
          id: true,
          accountId: true,
          address: true,
          billableUnits: true,
          createdAt: true,
          _count: {
            select: {
              subscriptionTargets: true
            }
          }
        },
        orderBy: { address: 'asc' },
        skip,
        take: pageSize
      }),
      prisma.property.count({ where })
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        accountId: item.accountId,
        address: item.address,
        billableUnits: item.billableUnits,
        createdAt: item.createdAt,
        subscriptionsCount: item._count.subscriptionTargets
      })),
      page,
      pageSize,
      total
    };
  });

  app.patch('/api/admin/properties/:id/units', async (request, reply) => {
    const { id } = propertyParamsSchema.parse(request.params);
    const payload = updatePropertyUnitsBodySchema.parse(request.body);

    const existing = await prisma.property.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existing) {
      reply.status(404).send({ message: 'Property not found' });
      return;
    }

    const updated = await prisma.property.update({
      where: { id },
      data: {
        billableUnits: payload.billableUnits
      },
      select: {
        id: true,
        accountId: true,
        address: true,
        billableUnits: true,
        createdAt: true,
        _count: {
          select: {
            subscriptionTargets: true
          }
        }
      }
    });

    return {
      item: {
        id: updated.id,
        accountId: updated.accountId,
        address: updated.address,
        billableUnits: updated.billableUnits,
        createdAt: updated.createdAt,
        subscriptionsCount: updated._count.subscriptionTargets
      }
    };
  });
}
