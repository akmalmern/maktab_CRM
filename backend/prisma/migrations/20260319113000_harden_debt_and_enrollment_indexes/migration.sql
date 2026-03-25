CREATE INDEX IF NOT EXISTS "Enrollment_studentId_isActive_createdAt_desc_idx"
ON "Enrollment" ("studentId", "isActive", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Enrollment_classroomId_isActive_createdAt_desc_idx"
ON "Enrollment" ("classroomId", "isActive", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "StudentOyMajburiyat_open_debt_student_period_idx"
ON "StudentOyMajburiyat" ("studentId", "yil", "oy")
WHERE "qoldiqSumma" > 0 AND "holat" IN ('BELGILANDI', 'QISMAN_TOLANGAN');

CREATE INDEX IF NOT EXISTS "StudentOyMajburiyat_open_debt_period_student_idx"
ON "StudentOyMajburiyat" ("yil", "oy", "studentId")
WHERE "qoldiqSumma" > 0 AND "holat" IN ('BELGILANDI', 'QISMAN_TOLANGAN');
