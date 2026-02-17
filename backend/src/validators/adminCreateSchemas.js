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

const createClassroomSchema = z
  .object({
    name: requiredText("name"),
    academicYear: requiredText("academicYear"),
  })
  .strict();

module.exports = {
  createTeacherSchema,
  createStudentSchema,
  createSubjectSchema,
  createClassroomSchema,
};
