CREATE TABLE "subscription_properties" (
  "subscription_id" TEXT NOT NULL,
  "property_id" TEXT NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscription_properties_subscription_id_fkey"
    FOREIGN KEY ("subscription_id") REFERENCES "subscriptions" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "subscription_properties_property_id_fkey"
    FOREIGN KEY ("property_id") REFERENCES "properties" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY ("subscription_id", "property_id")
);

CREATE INDEX "subscription_properties_property_id_idx"
  ON "subscription_properties"("property_id");

INSERT INTO "subscription_properties" ("subscription_id", "property_id")
SELECT "id", "property_id"
FROM "subscriptions"
WHERE "scope" = 'PROPERTY'
  AND "property_id" IS NOT NULL;
