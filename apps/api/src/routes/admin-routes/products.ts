import type { FastifyInstance } from 'fastify';
import { prisma } from '@stripe-integration/db';

export async function registerAdminProductsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/admin/products', async () => {
    const items = await prisma.product.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            pricings: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        description: item.description,
        isActive: item.isActive,
        createdAt: item.createdAt,
        pricingsCount: item._count.pricings
      }))
    };
  });
}
