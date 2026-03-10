-- Teacher weekly workload plan (per academic year) for schedule validation.
CREATE TABLE "TeacherWorkloadPlan" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "oquvYili" TEXT NOT NULL,
    "weeklyMinutesLimit" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherWorkloadPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeacherWorkloadPlan_teacherId_oquvYili_key"
ON "TeacherWorkloadPlan"("teacherId", "oquvYili");

CREATE INDEX "TeacherWorkloadPlan_oquvYili_idx"
ON "TeacherWorkloadPlan"("oquvYili");

ALTER TABLE "TeacherWorkloadPlan"
ADD CONSTRAINT "TeacherWorkloadPlan_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
