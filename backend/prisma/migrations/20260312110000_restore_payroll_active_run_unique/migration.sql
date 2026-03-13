-- Restore active payroll run uniqueness invariant per organization and period.
-- This protects against duplicate active runs across concurrent generators.
CREATE UNIQUE INDEX IF NOT EXISTS "ux_payroll_run_active_period"
ON "PayrollRun" ("organizationId", "periodMonth")
WHERE "status" IN ('DRAFT', 'APPROVED', 'PAID');
