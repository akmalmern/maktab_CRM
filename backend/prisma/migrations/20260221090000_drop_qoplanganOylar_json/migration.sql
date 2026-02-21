-- TolovTranzaksiya uses TolovQoplama relation as single source of truth.
-- Remove redundant JSON snapshot column to avoid data drift.
ALTER TABLE "TolovTranzaksiya"
DROP COLUMN "qoplanganOylar";
