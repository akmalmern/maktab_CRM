-- Payroll: per-item partial payment, advance deductions, fixed salary lines, and cashbox ledger.

-- CreateEnum
CREATE TYPE "PayrollItemPaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PayrollLineType' AND e.enumlabel = 'FIXED_SALARY'
  ) THEN
    ALTER TYPE "PayrollLineType" ADD VALUE 'FIXED_SALARY';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PayrollLineType' AND e.enumlabel = 'ADVANCE_DEDUCTION'
  ) THEN
    ALTER TYPE "PayrollLineType" ADD VALUE 'ADVANCE_DEDUCTION';
  END IF;
END
$$;

ALTER TABLE "Employee"
  ADD COLUMN IF NOT EXISTS "fixedSalaryAmount" DECIMAL(14,2);

ALTER TABLE "PayrollItem"
  ADD COLUMN IF NOT EXISTS "fixedSalaryAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "advanceDeductionAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "paymentStatus" "PayrollItemPaymentStatus" NOT NULL DEFAULT 'UNPAID';

ALTER TABLE "PayrollLine"
  ADD COLUMN IF NOT EXISTS "advancePaymentId" TEXT;

CREATE TABLE IF NOT EXISTS "AdvancePayment" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "teacherId" TEXT,
  "periodMonth" TEXT NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AdvancePayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PayrollItemPayment" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "payrollRunId" TEXT NOT NULL,
  "payrollItemId" TEXT NOT NULL,
  "employeeId" TEXT,
  "teacherId" TEXT,
  "amount" DECIMAL(14,2) NOT NULL,
  "paymentMethod" "PayrollPaymentMethod" NOT NULL,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "externalRef" TEXT,
  "note" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PayrollItemPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PayrollCashEntry" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "payrollRunId" TEXT,
  "payrollItemId" TEXT,
  "payrollItemPaymentId" TEXT,
  "amount" DECIMAL(14,2) NOT NULL,
  "paymentMethod" "PayrollPaymentMethod" NOT NULL,
  "entryType" TEXT NOT NULL DEFAULT 'PAYROLL_PAYOUT',
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "externalRef" TEXT,
  "note" TEXT,
  "meta" JSONB,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PayrollCashEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdvancePayment_organizationId_periodMonth_paidAt_idx"
ON "AdvancePayment"("organizationId", "periodMonth", "paidAt");

CREATE INDEX IF NOT EXISTS "AdvancePayment_organizationId_employeeId_createdAt_idx"
ON "AdvancePayment"("organizationId", "employeeId", "createdAt");

CREATE INDEX IF NOT EXISTS "AdvancePayment_organizationId_teacherId_createdAt_idx"
ON "AdvancePayment"("organizationId", "teacherId", "createdAt");

CREATE INDEX IF NOT EXISTS "PayrollItemPayment_organizationId_payrollRunId_paidAt_idx"
ON "PayrollItemPayment"("organizationId", "payrollRunId", "paidAt");

CREATE INDEX IF NOT EXISTS "PayrollItemPayment_organizationId_payrollItemId_paidAt_idx"
ON "PayrollItemPayment"("organizationId", "payrollItemId", "paidAt");

CREATE INDEX IF NOT EXISTS "PayrollItemPayment_employeeId_paidAt_idx"
ON "PayrollItemPayment"("employeeId", "paidAt");

CREATE INDEX IF NOT EXISTS "PayrollItemPayment_teacherId_paidAt_idx"
ON "PayrollItemPayment"("teacherId", "paidAt");

CREATE INDEX IF NOT EXISTS "PayrollCashEntry_organizationId_occurredAt_idx"
ON "PayrollCashEntry"("organizationId", "occurredAt");

CREATE INDEX IF NOT EXISTS "PayrollCashEntry_organizationId_entryType_occurredAt_idx"
ON "PayrollCashEntry"("organizationId", "entryType", "occurredAt");

CREATE INDEX IF NOT EXISTS "PayrollCashEntry_payrollRunId_idx"
ON "PayrollCashEntry"("payrollRunId");

CREATE INDEX IF NOT EXISTS "PayrollCashEntry_payrollItemId_idx"
ON "PayrollCashEntry"("payrollItemId");

CREATE INDEX IF NOT EXISTS "PayrollCashEntry_payrollItemPaymentId_idx"
ON "PayrollCashEntry"("payrollItemPaymentId");

CREATE INDEX IF NOT EXISTS "PayrollLine_advancePaymentId_idx"
ON "PayrollLine"("advancePaymentId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PayrollLine_advancePaymentId_fkey'
  ) THEN
    ALTER TABLE "PayrollLine"
      ADD CONSTRAINT "PayrollLine_advancePaymentId_fkey"
      FOREIGN KEY ("advancePaymentId") REFERENCES "AdvancePayment"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AdvancePayment_organizationId_fkey'
  ) THEN
    ALTER TABLE "AdvancePayment"
      ADD CONSTRAINT "AdvancePayment_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AdvancePayment_employeeId_fkey'
  ) THEN
    ALTER TABLE "AdvancePayment"
      ADD CONSTRAINT "AdvancePayment_employeeId_fkey"
      FOREIGN KEY ("employeeId") REFERENCES "Employee"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AdvancePayment_teacherId_fkey'
  ) THEN
    ALTER TABLE "AdvancePayment"
      ADD CONSTRAINT "AdvancePayment_teacherId_fkey"
      FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AdvancePayment_createdByUserId_fkey'
  ) THEN
    ALTER TABLE "AdvancePayment"
      ADD CONSTRAINT "AdvancePayment_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PayrollItemPayment_organizationId_fkey'
  ) THEN
    ALTER TABLE "PayrollItemPayment"
      ADD CONSTRAINT "PayrollItemPayment_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PayrollItemPayment_payrollRunId_fkey'
  ) THEN
    ALTER TABLE "PayrollItemPayment"
      ADD CONSTRAINT "PayrollItemPayment_payrollRunId_fkey"
      FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PayrollItemPayment_payrollItemId_fkey'
  ) THEN
    ALTER TABLE "PayrollItemPayment"
      ADD CONSTRAINT "PayrollItemPayment_payrollItemId_fkey"
      FOREIGN KEY ("payrollItemId") REFERENCES "PayrollItem"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PayrollItemPayment_employeeId_fkey'
  ) THEN
    ALTER TABLE "PayrollItemPayment"
      ADD CONSTRAINT "PayrollItemPayment_employeeId_fkey"
      FOREIGN KEY ("employeeId") REFERENCES "Employee"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PayrollItemPayment_teacherId_fkey'
  ) THEN
    ALTER TABLE "PayrollItemPayment"
      ADD CONSTRAINT "PayrollItemPayment_teacherId_fkey"
      FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PayrollItemPayment_createdByUserId_fkey'
  ) THEN
    ALTER TABLE "PayrollItemPayment"
      ADD CONSTRAINT "PayrollItemPayment_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PayrollCashEntry_organizationId_fkey'
  ) THEN
    ALTER TABLE "PayrollCashEntry"
      ADD CONSTRAINT "PayrollCashEntry_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PayrollCashEntry_payrollRunId_fkey'
  ) THEN
    ALTER TABLE "PayrollCashEntry"
      ADD CONSTRAINT "PayrollCashEntry_payrollRunId_fkey"
      FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PayrollCashEntry_payrollItemId_fkey'
  ) THEN
    ALTER TABLE "PayrollCashEntry"
      ADD CONSTRAINT "PayrollCashEntry_payrollItemId_fkey"
      FOREIGN KEY ("payrollItemId") REFERENCES "PayrollItem"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PayrollCashEntry_payrollItemPaymentId_fkey'
  ) THEN
    ALTER TABLE "PayrollCashEntry"
      ADD CONSTRAINT "PayrollCashEntry_payrollItemPaymentId_fkey"
      FOREIGN KEY ("payrollItemPaymentId") REFERENCES "PayrollItemPayment"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PayrollCashEntry_createdByUserId_fkey'
  ) THEN
    ALTER TABLE "PayrollCashEntry"
      ADD CONSTRAINT "PayrollCashEntry_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
