PRAGMA foreign_keys=OFF;

CREATE TABLE "new_properties" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "account_id" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "billable_units" INTEGER NOT NULL DEFAULT 0,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "properties_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_properties" ("id", "account_id", "address", "billable_units", "created_at")
SELECT "id", "account_id", "address", "billable_units", "created_at"
FROM "properties";

DROP TABLE "properties";
ALTER TABLE "new_properties" RENAME TO "properties";

CREATE INDEX "properties_account_id_idx" ON "properties"("account_id");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
