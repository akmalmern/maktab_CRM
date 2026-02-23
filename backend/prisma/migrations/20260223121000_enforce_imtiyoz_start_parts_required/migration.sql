DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "TolovImtiyozi"
    WHERE "boshlanishYil" IS NULL
       OR "boshlanishOyRaqam" IS NULL
  ) THEN
    RAISE EXCEPTION 'TolovImtiyozi rows with NULL boshlanishYil/boshlanishOyRaqam remain after cutover';
  END IF;
END $$;

ALTER TABLE "TolovImtiyozi"
  ALTER COLUMN "boshlanishYil" SET NOT NULL,
  ALTER COLUMN "boshlanishOyRaqam" SET NOT NULL;

ALTER TABLE "TolovImtiyozi"
  ADD CONSTRAINT "TolovImtiyozi_boshlanishOyRaqam_check"
  CHECK ("boshlanishOyRaqam" >= 1 AND "boshlanishOyRaqam" <= 12);
