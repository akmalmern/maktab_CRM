-- Add partial payment support fields
ALTER TABLE "TolovQoplama"
  ADD COLUMN "summa" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "StudentOyMajburiyat"
  ADD COLUMN "tolanganSumma" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "qoldiqSumma" INTEGER NOT NULL DEFAULT 0;

-- Prisma enum extension for partial status
ALTER TYPE "StudentOyMajburiyatHolati" ADD VALUE IF NOT EXISTS 'QISMAN_TOLANGAN';

-- Backfill legacy qoplama sums using existing monthly obligations (full-cover legacy rows)
UPDATE "TolovQoplama" q
SET "summa" = COALESCE(m."netSumma", 0)
FROM "StudentOyMajburiyat" m
WHERE m."studentId" = q."studentId"
  AND m."yil" = q."yil"
  AND m."oy" = q."oy";

-- Backfill obligation paid/remaining fields from qoplama sums
WITH q_sum AS (
  SELECT "studentId", "yil", "oy", SUM(COALESCE("summa", 0))::INTEGER AS "jamiTolangan"
  FROM "TolovQoplama"
  GROUP BY "studentId", "yil", "oy"
)
UPDATE "StudentOyMajburiyat" m
SET
  "tolanganSumma" = LEAST(COALESCE(q."jamiTolangan", 0), COALESCE(m."netSumma", 0)),
  "qoldiqSumma" = GREATEST(COALESCE(m."netSumma", 0) - COALESCE(q."jamiTolangan", 0), 0),
  "holat" = CASE
    WHEN COALESCE(m."netSumma", 0) <= 0 THEN 'TOLANGAN'::"StudentOyMajburiyatHolati"
    WHEN COALESCE(q."jamiTolangan", 0) <= 0 THEN 'BELGILANDI'::"StudentOyMajburiyatHolati"
    -- Legacy ma'lumotlarda partial qoplama bo'lmagan (oldingi model full-cover edi),
    -- shu sabab migration ichida yangi enum qiymatini ishlatmaymiz.
    -- Agar istisno holatda qisman summa uchrasa, keyingi sync service uni QISMAN_TOLANGAN ga to'g'rilaydi.
    WHEN COALESCE(q."jamiTolangan", 0) < COALESCE(m."netSumma", 0) THEN 'BELGILANDI'::"StudentOyMajburiyatHolati"
    ELSE 'TOLANGAN'::"StudentOyMajburiyatHolati"
  END
FROM q_sum q
WHERE q."studentId" = m."studentId"
  AND q."yil" = m."yil"
  AND q."oy" = m."oy";

-- For rows with no qoplama, qoldiq = net
UPDATE "StudentOyMajburiyat"
SET
  "tolanganSumma" = 0,
  "qoldiqSumma" = GREATEST(COALESCE("netSumma", 0), 0),
  "holat" = CASE
    WHEN COALESCE("netSumma", 0) <= 0 THEN 'TOLANGAN'::"StudentOyMajburiyatHolati"
    ELSE 'BELGILANDI'::"StudentOyMajburiyatHolati"
  END
WHERE "id" NOT IN (
  SELECT m."id"
  FROM "StudentOyMajburiyat" m
  JOIN "TolovQoplama" q
    ON q."studentId" = m."studentId"
   AND q."yil" = m."yil"
   AND q."oy" = m."oy"
);

-- Replace legacy single-row-per-month uniqueness with per-transaction uniqueness
ALTER TABLE "TolovQoplama" DROP CONSTRAINT IF EXISTS "TolovQoplama_studentId_yil_oy_key";
CREATE UNIQUE INDEX "TolovQoplama_tranzaksiyaId_yil_oy_key" ON "TolovQoplama"("tranzaksiyaId", "yil", "oy");
