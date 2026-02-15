import type { FastifyInstance } from 'fastify';
import { registerAdminAccountsRoutes } from './admin-routes/accounts.js';
import { registerAdminPaymentMethodsRoutes } from './admin-routes/payment-methods.js';
import { registerAdminPricingsRoutes } from './admin-routes/pricings.js';
import { registerAdminProductsRoutes } from './admin-routes/products.js';
import { registerAdminPropertiesRoutes } from './admin-routes/properties.js';
import { registerAdminSubscriptionsRoutes } from './admin-routes/subscriptions.js';

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
  await registerAdminAccountsRoutes(app);
  await registerAdminPropertiesRoutes(app);
  await registerAdminProductsRoutes(app);
  await registerAdminPaymentMethodsRoutes(app);
  await registerAdminSubscriptionsRoutes(app);
  await registerAdminPricingsRoutes(app);
}
