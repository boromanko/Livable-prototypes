import type { FastifyInstance } from 'fastify';
import { prisma } from '@stripe-integration/db';
import type { Prisma } from '@stripe-integration/db';
import { createProductBodySchema } from '../../schemas/product.js';
import { buildUniqueProductCode, toProductCodeBase } from './products.code.js';

export async function registerAdminProductsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/admin/products', async () => {
    const items = await prisma.product.findMany({
      select: productSelect,
      orderBy: { name: 'asc' }
    });

    return {
      items: items.map(toProductResponse)
    };
  });

  app.post('/api/admin/products', async (request, reply) => {
    const payload = createProductBodySchema.parse(request.body);
    const baseCode = toProductCodeBase(payload.name);
    const existingCodes = await prisma.product.findMany({
      where: {
        code: {
          startsWith: `${baseCode}_`
        }
      },
      select: { code: true }
    });
    const hasBaseCode = await prisma.product.findUnique({
      where: { code: baseCode },
      select: { code: true }
    });
    const nextCode = buildUniqueProductCode(baseCode, [
      ...existingCodes.map((item) => item.code),
      ...(hasBaseCode ? [hasBaseCode.code] : [])
    ]);

    const created = await prisma.product.create({
      data: {
        name: payload.name,
        code: nextCode,
        description: payload.description?.trim() || null,
        isActive: payload.isActive
      },
      select: productSelect
    });

    reply.status(201).send({
      item: toProductResponse(created)
    });
  });
}

const productSelect = {
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
} satisfies Prisma.ProductSelect;

type ProductWithCount = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

function toProductResponse(item: ProductWithCount) {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    description: item.description,
    isActive: item.isActive,
    createdAt: item.createdAt,
    pricingsCount: item._count.pricings
  };
}
