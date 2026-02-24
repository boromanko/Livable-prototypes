-- Normalize existing pricing type values after enum rename in application layer.
UPDATE "pricings"
SET "type" = 'METERED'
WHERE "type" = 'TIERED';
