-- CreateEnum
CREATE TYPE "RealLessonStatus" AS ENUM ('DONE', 'CANCELED', 'REPLACED');

-- CreateEnum
CREATE TYPE "PayrollRunStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID', 'REVERSED');

-- CreateEnum
CREATE TYPE "PayrollLineType" AS ENUM ('LESSON', 'BONUS', 'PENALTY', 'MANUAL');

-- CreateEnum
CREATE TYPE "PayrollPaymentMethod" AS ENUM ('CASH', 'BANK', 'CLICK', 'PAYME');

-- CreateEnum
CREATE TYPE "PayrollRateSource" AS ENUM ('TEACHER_RATE', 'SUBJECT_DEFAULT_RATE');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RealLesson" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "darsJadvaliId" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "status" "RealLessonStatus" NOT NULL DEFAULT 'DONE',
    "replacedByTeacherId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RealLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherRate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "ratePerHour" DECIMAL(14,2) NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'UZS',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectDefaultRate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "ratePerHour" DECIMAL(14,2) NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'UZS',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubjectDefaultRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "periodMonth" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tashkent',
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
    "calcVersion" INTEGER NOT NULL DEFAULT 1,
    "generatedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "paidByUserId" TEXT,
    "reversedByUserId" TEXT,
    "paymentMethod" "PayrollPaymentMethod",
    "externalRef" TEXT,
    "paymentNote" TEXT,
    "reverseReason" TEXT,
    "sourceLessonsCount" INTEGER NOT NULL DEFAULT 0,
    "teacherCount" INTEGER NOT NULL DEFAULT 0,
    "grossAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "adjustmentAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "payableAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "generationSummary" JSONB,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "totalMinutes" INTEGER NOT NULL DEFAULT 0,
    "totalHours" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "grossAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "bonusAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "penaltyAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "manualAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "adjustmentAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "payableAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "lessonLineCount" INTEGER NOT NULL DEFAULT 0,
    "lineCount" INTEGER NOT NULL DEFAULT 0,
    "teacherFirstNameSnapshot" TEXT,
    "teacherLastNameSnapshot" TEXT,
    "teacherUsernameSnapshot" TEXT,
    "summarySnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollLine" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "payrollItemId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "type" "PayrollLineType" NOT NULL,
    "realLessonId" TEXT,
    "subjectId" TEXT,
    "classroomId" TEXT,
    "lessonStartAt" TIMESTAMP(3),
    "minutes" INTEGER,
    "ratePerHour" DECIMAL(14,2),
    "amount" DECIMAL(14,2) NOT NULL,
    "rateSource" "PayrollRateSource",
    "teacherRateId" TEXT,
    "subjectDefaultRateId" TEXT,
    "description" TEXT,
    "meta" JSONB,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "payrollRunId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_key_key" ON "Organization"("key");

-- CreateIndex
CREATE INDEX "RealLesson_organizationId_startAt_idx" ON "RealLesson"("organizationId", "startAt");

-- CreateIndex
CREATE INDEX "RealLesson_organizationId_status_startAt_idx" ON "RealLesson"("organizationId", "status", "startAt");

-- CreateIndex
CREATE INDEX "RealLesson_teacherId_startAt_idx" ON "RealLesson"("teacherId", "startAt");

-- CreateIndex
CREATE INDEX "RealLesson_subjectId_startAt_idx" ON "RealLesson"("subjectId", "startAt");

-- CreateIndex
CREATE INDEX "RealLesson_classroomId_startAt_idx" ON "RealLesson"("classroomId", "startAt");

-- CreateIndex
CREATE INDEX "RealLesson_replacedByTeacherId_startAt_idx" ON "RealLesson"("replacedByTeacherId", "startAt");

-- CreateIndex
CREATE INDEX "RealLesson_darsJadvaliId_idx" ON "RealLesson"("darsJadvaliId");

-- CreateIndex
CREATE INDEX "TeacherRate_organizationId_teacherId_subjectId_effectiveFro_idx" ON "TeacherRate"("organizationId", "teacherId", "subjectId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "TeacherRate_organizationId_teacherId_subjectId_effectiveTo_idx" ON "TeacherRate"("organizationId", "teacherId", "subjectId", "effectiveTo");

-- CreateIndex
CREATE INDEX "SubjectDefaultRate_organizationId_subjectId_effectiveFrom_idx" ON "SubjectDefaultRate"("organizationId", "subjectId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "SubjectDefaultRate_organizationId_subjectId_effectiveTo_idx" ON "SubjectDefaultRate"("organizationId", "subjectId", "effectiveTo");

-- CreateIndex
CREATE INDEX "PayrollRun_organizationId_periodMonth_idx" ON "PayrollRun"("organizationId", "periodMonth");

-- CreateIndex
CREATE INDEX "PayrollRun_organizationId_status_periodStart_idx" ON "PayrollRun"("organizationId", "status", "periodStart");

-- CreateIndex
CREATE INDEX "PayrollRun_status_createdAt_idx" ON "PayrollRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PayrollItem_organizationId_payrollRunId_idx" ON "PayrollItem"("organizationId", "payrollRunId");

-- CreateIndex
CREATE INDEX "PayrollItem_organizationId_teacherId_createdAt_idx" ON "PayrollItem"("organizationId", "teacherId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollItem_payrollRunId_teacherId_key" ON "PayrollItem"("payrollRunId", "teacherId");

-- CreateIndex
CREATE INDEX "PayrollLine_organizationId_payrollRunId_teacherId_idx" ON "PayrollLine"("organizationId", "payrollRunId", "teacherId");

-- CreateIndex
CREATE INDEX "PayrollLine_payrollItemId_type_idx" ON "PayrollLine"("payrollItemId", "type");

-- CreateIndex
CREATE INDEX "PayrollLine_realLessonId_idx" ON "PayrollLine"("realLessonId");

-- CreateIndex
CREATE INDEX "PayrollLine_type_createdAt_idx" ON "PayrollLine"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollLine_payrollRunId_realLessonId_key" ON "PayrollLine"("payrollRunId", "realLessonId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_payrollRunId_createdAt_idx" ON "AuditLog"("payrollRunId", "createdAt");

-- AddForeignKey
ALTER TABLE "RealLesson" ADD CONSTRAINT "RealLesson_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealLesson" ADD CONSTRAINT "RealLesson_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealLesson" ADD CONSTRAINT "RealLesson_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealLesson" ADD CONSTRAINT "RealLesson_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealLesson" ADD CONSTRAINT "RealLesson_darsJadvaliId_fkey" FOREIGN KEY ("darsJadvaliId") REFERENCES "DarsJadvali"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealLesson" ADD CONSTRAINT "RealLesson_replacedByTeacherId_fkey" FOREIGN KEY ("replacedByTeacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherRate" ADD CONSTRAINT "TeacherRate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherRate" ADD CONSTRAINT "TeacherRate_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherRate" ADD CONSTRAINT "TeacherRate_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherRate" ADD CONSTRAINT "TeacherRate_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectDefaultRate" ADD CONSTRAINT "SubjectDefaultRate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectDefaultRate" ADD CONSTRAINT "SubjectDefaultRate_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectDefaultRate" ADD CONSTRAINT "SubjectDefaultRate_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_paidByUserId_fkey" FOREIGN KEY ("paidByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_reversedByUserId_fkey" FOREIGN KEY ("reversedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_payrollItemId_fkey" FOREIGN KEY ("payrollItemId") REFERENCES "PayrollItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_realLessonId_fkey" FOREIGN KEY ("realLessonId") REFERENCES "RealLesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_teacherRateId_fkey" FOREIGN KEY ("teacherRateId") REFERENCES "TeacherRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_subjectDefaultRateId_fkey" FOREIGN KEY ("subjectDefaultRateId") REFERENCES "SubjectDefaultRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Payroll hardening constraints (PostgreSQL-specific)
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE UNIQUE INDEX IF NOT EXISTS ux_payroll_run_active_period
ON "PayrollRun" ("organizationId", "periodMonth")
WHERE "status" IN ('DRAFT', 'APPROVED', 'PAID');

ALTER TABLE "RealLesson"
  ADD CONSTRAINT "RealLesson_duration_positive_chk"
  CHECK ("durationMinutes" > 0);

ALTER TABLE "RealLesson"
  ADD CONSTRAINT "RealLesson_time_order_chk"
  CHECK ("endAt" > "startAt");

ALTER TABLE "RealLesson"
  ADD CONSTRAINT "RealLesson_replaced_status_chk"
  CHECK (
    ("status" <> 'REPLACED' AND "replacedByTeacherId" IS NULL)
    OR ("status" = 'REPLACED' AND "replacedByTeacherId" IS NOT NULL)
  );

ALTER TABLE "TeacherRate"
  ADD CONSTRAINT "TeacherRate_no_overlap_excl"
  EXCLUDE USING gist (
    "organizationId" WITH =,
    "teacherId" WITH =,
    "subjectId" WITH =,
    tsrange("effectiveFrom", COALESCE("effectiveTo", 'infinity'::timestamp), '[)') WITH &&
  );

ALTER TABLE "SubjectDefaultRate"
  ADD CONSTRAINT "SubjectDefaultRate_no_overlap_excl"
  EXCLUDE USING gist (
    "organizationId" WITH =,
    "subjectId" WITH =,
    tsrange("effectiveFrom", COALESCE("effectiveTo", 'infinity'::timestamp), '[)') WITH &&
  );

ALTER TABLE "PayrollLine"
  ADD CONSTRAINT "PayrollLine_type_shape_chk"
  CHECK (
    (
      "type" = 'LESSON'
      AND "realLessonId" IS NOT NULL
      AND "minutes" IS NOT NULL
      AND "ratePerHour" IS NOT NULL
      AND "amount" >= 0
    )
    OR (
      "type" IN ('BONUS', 'MANUAL')
      AND "realLessonId" IS NULL
      AND "amount" >= 0
    )
    OR (
      "type" = 'PENALTY'
      AND "realLessonId" IS NULL
      AND "amount" <= 0
    )
  );
