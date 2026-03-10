-- Prevent duplicate RealLesson rows for the same schedule slot/time in one organization.
CREATE UNIQUE INDEX IF NOT EXISTS "RealLesson_organizationId_darsJadvaliId_startAt_key"
ON "RealLesson"("organizationId", "darsJadvaliId", "startAt");
