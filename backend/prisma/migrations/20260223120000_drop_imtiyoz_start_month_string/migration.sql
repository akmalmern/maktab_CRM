-- Backfill new month/year columns from legacy "boshlanishOy" (YYYY-MM)
UPDATE "TolovImtiyozi"
SET
  "boshlanishYil" = COALESCE(
    "boshlanishYil",
    CASE
      WHEN "boshlanishOy" ~ '^\d{4}-(0[1-9]|1[0-2])$'
        THEN CAST(SPLIT_PART("boshlanishOy", '-', 1) AS INTEGER)
      ELSE NULL
    END
  ),
  "boshlanishOyRaqam" = COALESCE(
    "boshlanishOyRaqam",
    CASE
      WHEN "boshlanishOy" ~ '^\d{4}-(0[1-9]|1[0-2])$'
        THEN CAST(SPLIT_PART("boshlanishOy", '-', 2) AS INTEGER)
      ELSE NULL
    END
  )
WHERE "boshlanishOy" IS NOT NULL;

-- Drop legacy string field after cutover to month/year columns
ALTER TABLE "TolovImtiyozi" DROP COLUMN "boshlanishOy";
