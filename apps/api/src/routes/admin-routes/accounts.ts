import type { FastifyInstance } from 'fastify';
import { prisma } from '@stripe-integration/db';
import type { Prisma } from '@stripe-integration/db';
import { accountsLookupQuerySchema } from '../../schemas/lookup.js';

export async function registerAdminAccountsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/admin/accounts', async (request) => {
    const query = accountsLookupQuerySchema.parse(request.query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const skip = (page - 1) * pageSize;

    const where: Prisma.AccountWhereInput = {};

    if (query.search) {
      where.OR = [
        { companyName: { contains: query.search } },
        { email: { contains: query.search } }
      ];
    }

    const [items, total] = await prisma.$transaction([
      prisma.account.findMany({
        where,
        select: {
          id: true,
          companyName: true,
          email: true,
          createdAt: true,
          properties: {
            select: {
              billableUnits: true
            }
          },
          _count: {
            select: {
              properties: true,
              subscriptions: true
            }
          }
        },
        orderBy: { companyName: 'asc' },
        skip,
        take: pageSize
      }),
      prisma.account.count({ where })
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        companyName: item.companyName,
        email: item.email,
        createdAt: item.createdAt,
        propertiesCount: item._count.properties,
        subscriptionsCount: item._count.subscriptions,
        totalBillableUnits: item.properties.reduce(
          (sum, property) => sum + property.billableUnits,
          0
        )
      })),
      page,
      pageSize,
      total
    };
  });
}
