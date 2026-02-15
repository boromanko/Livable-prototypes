import { prisma } from '@stripe-integration/db';

const ACCOUNT_MATCH_ERROR = 'subscription_properties account mismatch';

const CREATE_INSERT_GUARD_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS "subscription_properties_account_guard_insert"
BEFORE INSERT ON "subscription_properties"
FOR EACH ROW
WHEN (
  (SELECT "account_id" FROM "subscriptions" WHERE "id" = NEW."subscription_id")
  <> (SELECT "account_id" FROM "properties" WHERE "id" = NEW."property_id")
)
BEGIN
  SELECT RAISE(ABORT, '${ACCOUNT_MATCH_ERROR}');
END;
`;

const CREATE_UPDATE_GUARD_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS "subscription_properties_account_guard_update"
BEFORE UPDATE OF "subscription_id", "property_id" ON "subscription_properties"
FOR EACH ROW
WHEN (
  (SELECT "account_id" FROM "subscriptions" WHERE "id" = NEW."subscription_id")
  <> (SELECT "account_id" FROM "properties" WHERE "id" = NEW."property_id")
)
BEGIN
  SELECT RAISE(ABORT, '${ACCOUNT_MATCH_ERROR}');
END;
`;

export async function ensureDbInvariants(): Promise<void> {
  await prisma.$executeRawUnsafe(CREATE_INSERT_GUARD_TRIGGER_SQL);
  await prisma.$executeRawUnsafe(CREATE_UPDATE_GUARD_TRIGGER_SQL);

  const mismatches = await prisma.$queryRawUnsafe<Array<{ count: number }>>(`
    SELECT COUNT(1) AS "count"
    FROM "subscription_properties" AS "sp"
    INNER JOIN "subscriptions" AS "s"
      ON "s"."id" = "sp"."subscription_id"
    INNER JOIN "properties" AS "p"
      ON "p"."id" = "sp"."property_id"
    WHERE "s"."account_id" <> "p"."account_id";
  `);

  const mismatchCountRaw = mismatches[0]?.count ?? 0;
  const mismatchCount =
    typeof mismatchCountRaw === 'bigint'
      ? Number(mismatchCountRaw)
      : mismatchCountRaw;
  if (mismatchCount > 0) {
    throw new Error(
      `Detected ${mismatchCount} invalid rows in subscription_properties (${ACCOUNT_MATCH_ERROR})`
    );
  }
}
