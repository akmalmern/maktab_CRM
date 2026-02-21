const { z } = require("zod");

const requiredText = (field) =>
  z
    .string({
      required_error: `${field} majburiy`,
      invalid_type_error: `${field} matn bo'lishi kerak`,
    })
    .trim()
    .min(1, `${field} majburiy`);

const phoneRequired = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return "";
    return String(value).trim();
  },
  z
    .string()
    .min(1, "Telefon majburiy")
    .min(7, "Telefon juda qisqa")
    .max(30, "Telefon juda uzun")
    .regex(/^[+\d][\d\s\-()]+$/, "Telefon formati noto'g'ri"),
);

const birthDateAsDate = z
  .string({
    required_error: "birthDate majburiy",
    invalid_type_error: "birthDate matn bo'lishi kerak",
  })
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "birthDate formati YYYY-MM-DD bo'lishi kerak")
  .transform((value) => new Date(value))
  .refine((d) => !Number.isNaN(d.getTime()), "birthDate noto'g'ri sana");

const birthDatePast = birthDateAsDate.refine(
  (d) => d.getTime() <= Date.now(),
  "birthDate kelajak sana bo'lishi mumkin emas",
);

const createTeacherSchema = z
  .object({
    firstName: requiredText("firstName"),
    lastName: requiredText("lastName"),
    birthDate: birthDatePast,
    yashashManzili: requiredText("yashashManzili"),
    subjectId: z.string().cuid("subjectId noto'g'ri"),
    phone: phoneRequired,
  })
  .strict();

const createStudentSchema = z
  .object({
    firstName: requiredText("firstName"),
    lastName: requiredText("lastName"),
    birthDate: birthDatePast,
    yashashManzili: requiredText("yashashManzili"),
    classroomId: z.string().cuid("classroomId noto'g'ri"),
    phone: phoneRequired,
    parentPhone: phoneRequired,
  })
  .strict();

const createSubjectSchema = z
  .object({
    name: requiredText("name"),
  })
  .strict();

const classroomNameSchema = requiredText("name")
  .regex(/^\d{1,2}\s*-\s*[A-Za-z]$/, "name formati 7-A bo'lishi kerak")
  .transform((value) => {
    const [gradeRaw, suffixRaw] = value.split("-");
    const grade = Number.parseInt(String(gradeRaw).trim(), 10);
    const suffix = String(suffixRaw || "")
      .trim()
      .toUpperCase();
    return `${grade}-${suffix}`;
  })
  .refine(
    (value) => {
      const grade = Number.parseInt(value.split("-")[0], 10);
      return Number.isFinite(grade) && grade >= 1 && grade <= 11;
    },
    "name noto'g'ri: sinf darajasi 1 dan 11 gacha bo'lishi kerak",
  );

const academicYearSchema = requiredText("academicYear")
  .regex(
    /^\d{4}\s*-\s*\d{4}$/,
    "academicYear formati 2025-2026 bo'lishi kerak",
  )
  .transform((value) => value.replace(/\s+/g, ""))
  .refine((value) => {
    const [startRaw, endRaw] = value.split("-");
    const start = Number.parseInt(startRaw, 10);
    const end = Number.parseInt(endRaw, 10);
    return Number.isFinite(start) && Number.isFinite(end) && end === start + 1;
  }, "academicYear noto'g'ri: ikkinchi yil birinchisidan 1 ga katta bo'lishi kerak");

const createClassroomSchema = z
  .object({
    name: classroomNameSchema,
    academicYear: academicYearSchema,
  })
  .strict();

const promoteClassroomSchema = z
  .object({
    targetClassroomId: z.string().cuid("targetClassroomId noto'g'ri"),
  })
  .strict();

const annualClassPromotionSchema = z
  .object({
    force: z.coerce.boolean().optional().default(false),
  })
  .strict();

module.exports = {
  createTeacherSchema,
  createStudentSchema,
  createSubjectSchema,
  createClassroomSchema,
  promoteClassroomSchema,
  annualClassPromotionSchema,
};
