-- Align DB constraints with admin create validation without forcing all User roles to have phone.
-- TEACHER/STUDENT users must have a non-empty phone.
-- STUDENT profile must have a non-empty parentPhone.

ALTER TABLE "User"
ADD CONSTRAINT "User_teacher_student_phone_required_chk"
CHECK (
  "role" NOT IN ('TEACHER', 'STUDENT')
  OR ("phone" IS NOT NULL AND LENGTH(BTRIM("phone")) > 0)
);

ALTER TABLE "Student"
ADD CONSTRAINT "Student_parent_phone_required_chk"
CHECK ("parentPhone" IS NOT NULL AND LENGTH(BTRIM("parentPhone")) > 0);
