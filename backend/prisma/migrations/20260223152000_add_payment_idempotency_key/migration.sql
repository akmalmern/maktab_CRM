-- Add idempotency key for payment request deduplication (double-submit protection)
ALTER TABLE "TolovTranzaksiya"
ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "TolovTranzaksiya_studentId_idempotencyKey_key"
ON "TolovTranzaksiya"("studentId", "idempotencyKey");
