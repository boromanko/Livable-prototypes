import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const prismaClient = require('@prisma/client') as typeof import('@prisma/client');
const { PrismaClient, PricingType, BillingScope, SubscriptionStatus, PaymentMethodType } = prismaClient;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export { BillingScope, PaymentMethodType, PricingType, SubscriptionStatus };
export type { Prisma } from '@prisma/client';
