const { z } = require("zod");
const {
  normalizeClassroomName,
  parseClassName,
} = require("./domain/classroomNaming");
const { parseAcademicYear } = require("./domain/academicYear");

const requiredText = (field) =>
  z
    .string({
      required_error: `${field} majburiy`,
      invalid_type_error: `${field} matn bo'lishi kerak`,
    })
    .trim()
    .min(1, `${field} majburiy`);

const emptyToUndefined = (value) => {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s === "" ? undefined : s;
};

const pageSchema = z.coerce.number().int().min(1).optional();
const limitSchema = z.coerce.number().int().min(1).max(100).optional();
const searchSchema = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1).max(100).optional(),
);

const classroomNameSchema = requiredText("name")
  .regex(/^\d{1,2}\s*-\s*.+$/u, "name formati 7-A yoki 10-FizMat bo'lishi kerak")
  .transform((value) => normalizeClassroomName(value))
  .refine((value) => Boolean(parseClassName(value)), {
    message: "name noto'g'ri: sinf darajasi 1 dan 11 gacha bo'lishi kerak",
  });

const academicYearSchema = requiredText("academicYear")
  .transform((value) => value.replace(/\s+/g, ""))
  .refine((value) => Boolean(parseAcademicYear(value)), {
    message:
      "academicYear noto'g'ri: format 2025-2026 bo'lishi va ikkinchi yil 1 ga katta bo'lishi kerak",
  });

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

const listClassroomStudentsQuerySchema = z
  .object({
    page: pageSchema,
    limit: limitSchema,
    search: searchSchema,
  })
  .strict();

const ClassroomIdParamSchema = z.object({ id: z.string().cuid("id noto'g'ri") }).strict();

const ClassroomStudentParamsSchema = z
  .object({
    classroomId: z.string().cuid("classroomId noto'g'ri"),
    studentId: z.string().cuid("studentId noto'g'ri"),
  })
  .strict();

module.exports = {
  createClassroomSchema,
  promoteClassroomSchema,
  annualClassPromotionSchema,
  listClassroomStudentsQuerySchema,
  ClassroomIdParamSchema,
  ClassroomStudentParamsSchema,
};
