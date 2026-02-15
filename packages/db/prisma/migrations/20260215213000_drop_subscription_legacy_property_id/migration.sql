PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_subscriptions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "account_id" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "start_date" DATETIME NOT NULL,
  "end_date" DATETIME,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "payment_method_id" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscriptions_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "subscriptions_payment_method_id_fkey"
    FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_subscriptions" (
  "id",
  "account_id",
  "scope",
  "start_date",
  "end_date",
  "status",
  "payment_method_id",
  "created_at"
)
SELECT
  "id",
  "account_id",
  "scope",
  "start_date",
  "end_date",
  "status",
  "payment_method_id",
  "created_at"
FROM "subscriptions";

DROP TABLE "subscriptions";
ALTER TABLE "new_subscriptions" RENAME TO "subscriptions";

CREATE INDEX "subscriptions_account_id_idx" ON "subscriptions"("account_id");
CREATE INDEX "subscriptions_payment_method_id_idx" ON "subscriptions"("payment_method_id");
CREATE INDEX "subscriptions_scope_idx" ON "subscriptions"("scope");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
