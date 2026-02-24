ALTER TABLE "MoliyaSozlama"
ADD COLUMN "tolovOylarSoni" INTEGER NOT NULL DEFAULT 10;

ALTER TABLE "MoliyaTarifVersion"
ADD COLUMN "tolovOylarSoni" INTEGER NOT NULL DEFAULT 10;

UPDATE "MoliyaSozlama"
SET "tolovOylarSoni" = GREATEST(
  1,
  LEAST(
    12,
    ROUND("yillikSumma"::numeric / NULLIF("oylikSumma", 0))::int
  )
)
WHERE "oylikSumma" > 0 AND "yillikSumma" > 0;

UPDATE "MoliyaTarifVersion"
SET "tolovOylarSoni" = GREATEST(
  1,
  LEAST(
    12,
    ROUND("yillikSumma"::numeric / NULLIF("oylikSumma", 0))::int
  )
)
WHERE "oylikSumma" > 0 AND "yillikSumma" > 0;

ALTER TABLE "MoliyaSozlama"
ADD CONSTRAINT "MoliyaSozlama_tolovOylarSoni_chk"
CHECK ("tolovOylarSoni" >= 1 AND "tolovOylarSoni" <= 12);

ALTER TABLE "MoliyaTarifVersion"
ADD CONSTRAINT "MoliyaTarifVersion_tolovOylarSoni_chk"
CHECK ("tolovOylarSoni" >= 1 AND "tolovOylarSoni" <= 12);
