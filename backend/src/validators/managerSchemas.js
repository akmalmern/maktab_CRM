const { z } = require("zod");

const emptyToUndefined = (value) => {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text === "" ? undefined : text;
};

const managerDebtorsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(500).optional(),
    search: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
    classroomId: z.preprocess(
      emptyToUndefined,
      z.string().cuid("classroomId noto'g'ri").optional(),
    ),
  })
  .strict();

const managerNotesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

const studentIdParamSchema = z.object({
  studentId: z.string().cuid("studentId noto'g'ri"),
});

const createDebtorNoteSchema = z
  .object({
    izoh: z
      .string()
      .trim()
      .min(3, "Izoh kamida 3 ta belgidan iborat bo'lishi kerak")
      .max(500, "Izoh 500 ta belgidan oshmasligi kerak"),
    promisedPayDate: z.preprocess(
      emptyToUndefined,
      z.coerce.date().optional(),
    ),
  })
  .strict();

module.exports = {
  managerDebtorsQuerySchema,
  managerNotesQuerySchema,
  studentIdParamSchema,
  createDebtorNoteSchema,
};
