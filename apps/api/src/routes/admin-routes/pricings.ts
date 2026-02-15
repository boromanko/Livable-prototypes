import type { FastifyInstance } from 'fastify';
import { PricingType, prisma } from '@stripe-integration/db';
import {
  createPricingBodySchema,
  normalizeTiers,
  pricingListQuerySchema,
  pricingParamsSchema,
  updatePricingBodySchema
} from '../../schemas/pricing.js';
import { validateTierStructure } from '../../services/pricing-calculator.js';
import {
  buildPricingsWhere,
  cleanupUnknownPricingReferences,
  listPricingsWithPagination,
  pricingInclude,
  toPricingResponse
} from './pricings.shared.js';
import { loadResolvedPricingTreeItems } from './pricings.tree.js';

function getTierValidationMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Invalid tiered pricing structure';
}

export async function registerAdminPricingsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/admin/pricings-tree', async () => {
    const items = await loadResolvedPricingTreeItems();
    return { items };
  });

  app.get('/api/admin/pricings', async (request) => {
    const query = pricingListQuerySchema.parse(request.query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where = buildPricingsWhere(query);

    return listPricingsWithPagination({
      page,
      pageSize,
      where
    });
  });

  app.post('/api/admin/pricings', async (request, reply) => {
    const payload = createPricingBodySchema.parse(request.body);
    const normalizedTiers = payload.type === 'TIERED' ? normalizeTiers(payload.tiers ?? []) : [];

    if (payload.type === 'TIERED') {
      try {
        validateTierStructure(normalizedTiers);
      } catch (error) {
        reply.status(400).send({ message: getTierValidationMessage(error) });
        return;
      }
    }

    const createdPricing = await prisma.$transaction(async (tx) => {
      const created = await tx.pricing.create({
        data: {
          productId: payload.productId,
          internalName: payload.internalName,
          type: payload.type,
          fixedAmountCents: payload.type === 'FIXED' ? payload.fixedAmountCents : null,
          minimumPriceCents: payload.minimumPriceCents ?? null,
          currency: payload.currency.toLowerCase(),
          billingInterval: payload.billingInterval,
          isActive: payload.isActive
        }
      });

      if (normalizedTiers.length > 0) {
        await tx.pricingTier.createMany({
          data: normalizedTiers.map((tier) => ({
            pricingId: created.id,
            fromUnit: tier.fromUnit,
            toUnit: tier.toUnit,
            unitAmountCents: tier.unitAmountCents
          }))
        });
      }

      return tx.pricing.findUniqueOrThrow({
        where: { id: created.id },
        include: pricingInclude
      });
    });

    reply.status(201).send({
      item: toPricingResponse(createdPricing)
    });
  });

  app.patch('/api/admin/pricings/:id', async (request, reply) => {
    const { id } = pricingParamsSchema.parse(request.params);
    const payload = updatePricingBodySchema.parse(request.body);

    const existing = await prisma.pricing.findUnique({
      where: { id },
      include: {
        tiers: {
          orderBy: { fromUnit: 'asc' }
        }
      }
    });

    if (!existing) {
      reply.status(404).send({ message: 'Pricing not found' });
      return;
    }

    const targetType = payload.type ?? existing.type;
    const existingTiers = existing.tiers.map((tier) => ({
      fromUnit: tier.fromUnit,
      toUnit: tier.toUnit,
      unitAmountCents: tier.unitAmountCents
    }));

    const candidatePayload = {
      productId: payload.productId ?? existing.productId,
      internalName: payload.internalName ?? existing.internalName,
      type: targetType,
      fixedAmountCents:
        payload.fixedAmountCents !== undefined ? payload.fixedAmountCents : existing.fixedAmountCents,
      minimumPriceCents:
        payload.minimumPriceCents !== undefined
          ? payload.minimumPriceCents
          : existing.minimumPriceCents,
      currency: (payload.currency ?? existing.currency).toLowerCase(),
      billingInterval: payload.billingInterval ?? existing.billingInterval,
      isActive: payload.isActive ?? existing.isActive,
      tiers: targetType === PricingType.FIXED ? [] : payload.tiers ?? existingTiers
    };

    const validated = createPricingBodySchema.parse(candidatePayload);
    const normalizedTiers = validated.type === 'TIERED' ? normalizeTiers(validated.tiers ?? []) : [];

    if (validated.type === 'TIERED') {
      try {
        validateTierStructure(normalizedTiers);
      } catch (error) {
        reply.status(400).send({ message: getTierValidationMessage(error) });
        return;
      }
    }

    const updatedPricing = await prisma.$transaction(async (tx) => {
      await tx.pricing.update({
        where: { id },
        data: {
          productId: validated.productId,
          internalName: validated.internalName,
          type: validated.type,
          fixedAmountCents: validated.type === 'FIXED' ? validated.fixedAmountCents : null,
          minimumPriceCents: validated.minimumPriceCents ?? null,
          currency: validated.currency.toLowerCase(),
          billingInterval: validated.billingInterval,
          isActive: validated.isActive
        }
      });

      await tx.pricingTier.deleteMany({
        where: { pricingId: id }
      });

      if (normalizedTiers.length > 0) {
        await tx.pricingTier.createMany({
          data: normalizedTiers.map((tier) => ({
            pricingId: id,
            fromUnit: tier.fromUnit,
            toUnit: tier.toUnit,
            unitAmountCents: tier.unitAmountCents
          }))
        });
      }

      return tx.pricing.findUniqueOrThrow({
        where: { id },
        include: pricingInclude
      });
    });

    return {
      item: toPricingResponse(updatedPricing)
    };
  });

  app.delete('/api/admin/pricings/:id', async (request) => {
    const { id } = pricingParamsSchema.parse(request.params);

    const deletedPricingCount = await prisma.$transaction(async (tx) => {
      // Defensive cleanup for legacy local DBs that may still contain
      // old tables with FK references to "pricings".
      await cleanupUnknownPricingReferences(tx, id);

      // Be explicit about link cleanup to avoid relying on DB-level cascade behavior.
      await tx.subscriptionPricing.deleteMany({
        where: { pricingId: id }
      });

      await tx.pricingTier.deleteMany({
        where: { pricingId: id }
      });

      const deleted = await tx.pricing.deleteMany({
        where: { id }
      });

      return deleted.count;
    });

    return {
      deleted: deletedPricingCount > 0,
      id
    };
  });
}
