-- PayrollLine type shape constraint needs to support new line types:
-- FIXED_SALARY and ADVANCE_DEDUCTION.

ALTER TABLE "PayrollLine"
  DROP CONSTRAINT IF EXISTS "PayrollLine_type_shape_chk";

ALTER TABLE "PayrollLine"
  ADD CONSTRAINT "PayrollLine_type_shape_chk"
  CHECK (
    (
      "type" = 'LESSON'
      AND "realLessonId" IS NOT NULL
      AND "minutes" IS NOT NULL
      AND "ratePerHour" IS NOT NULL
      AND "advancePaymentId" IS NULL
      AND "amount" >= 0
    )
    OR (
      "type" IN ('BONUS', 'MANUAL')
      AND "realLessonId" IS NULL
      AND "advancePaymentId" IS NULL
      AND "amount" >= 0
    )
    OR (
      "type" = 'PENALTY'
      AND "realLessonId" IS NULL
      AND "advancePaymentId" IS NULL
      AND "amount" <= 0
    )
    OR (
      "type" = 'FIXED_SALARY'
      AND "realLessonId" IS NULL
      AND "minutes" IS NULL
      AND "ratePerHour" IS NULL
      AND "advancePaymentId" IS NULL
      AND "amount" >= 0
    )
    OR (
      "type" = 'ADVANCE_DEDUCTION'
      AND "realLessonId" IS NULL
      AND "minutes" IS NULL
      AND "ratePerHour" IS NULL
      AND "advancePaymentId" IS NOT NULL
      AND "amount" <= 0
    )
  );

