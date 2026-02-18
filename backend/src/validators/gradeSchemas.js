const { z } = require("zod");

const sanaRegex = /^\d{4}-\d{2}-\d{2}$/;
const bahoTuriEnum = z.enum(["JORIY", "NAZORAT", "ORALIQ", "YAKUNIY"]);

const pageSchema = z.coerce.number().int().min(1).optional();
const limitSchema = z.coerce.number().int().min(1).max(100).optional();

const emptyToUndefined = (value) => {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s === "" ? undefined : s;
};

const dateSchema = z.preprocess(
  emptyToUndefined,
  z.string().trim().regex(sanaRegex, "sana YYYY-MM-DD formatda bo'lishi kerak").optional(),
);

const cuidSchema = z.preprocess(
  emptyToUndefined,
  z.string().cuid("ID noto'g'ri").optional(),
);

const listBaholarQuerySchema = z.object({
  page: pageSchema,
  limit: limitSchema,
  sana: dateSchema,
  sanaFrom: dateSchema,
  sanaTo: dateSchema,
  bahoTuri: z.preprocess(emptyToUndefined, bahoTuriEnum.optional()),
  subjectId: cuidSchema,
  classroomId: cuidSchema,
  studentId: cuidSchema,
  teacherId: cuidSchema,
});

module.exports = {
  listBaholarQuerySchema,
};
