CREATE UNIQUE INDEX IF NOT EXISTS "Enrollment_studentId_active_unique"
ON "Enrollment" ("studentId")
WHERE "isActive" = true;
