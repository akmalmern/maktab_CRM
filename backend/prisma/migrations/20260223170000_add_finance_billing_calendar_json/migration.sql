ALTER TABLE "MoliyaSozlama"
ADD COLUMN IF NOT EXISTS "billingCalendar" JSONB;

ALTER TABLE "MoliyaTarifVersion"
ADD COLUMN IF NOT EXISTS "billingCalendar" JSONB;

UPDATE "MoliyaSozlama"
SET "billingCalendar" = CASE COALESCE("tolovOylarSoni", 10)
  WHEN 9 THEN '{"chargeableMonths":[9,10,11,12,1,2,3,4,5]}'::jsonb
  WHEN 10 THEN '{"chargeableMonths":[9,10,11,12,1,2,3,4,5,6]}'::jsonb
  WHEN 11 THEN '{"chargeableMonths":[9,10,11,12,1,2,3,4,5,6,7]}'::jsonb
  WHEN 12 THEN '{"chargeableMonths":[9,10,11,12,1,2,3,4,5,6,7,8]}'::jsonb
  ELSE '{"chargeableMonths":[9,10,11,12,1,2,3,4,5,6]}'::jsonb
END
WHERE "billingCalendar" IS NULL;

UPDATE "MoliyaTarifVersion"
SET "billingCalendar" = CASE COALESCE("tolovOylarSoni", 10)
  WHEN 9 THEN '{"chargeableMonths":[9,10,11,12,1,2,3,4,5]}'::jsonb
  WHEN 10 THEN '{"chargeableMonths":[9,10,11,12,1,2,3,4,5,6]}'::jsonb
  WHEN 11 THEN '{"chargeableMonths":[9,10,11,12,1,2,3,4,5,6,7]}'::jsonb
  WHEN 12 THEN '{"chargeableMonths":[9,10,11,12,1,2,3,4,5,6,7,8]}'::jsonb
  ELSE '{"chargeableMonths":[9,10,11,12,1,2,3,4,5,6]}'::jsonb
END
WHERE "billingCalendar" IS NULL;
