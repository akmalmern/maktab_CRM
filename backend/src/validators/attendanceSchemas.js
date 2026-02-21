const { z } = require("zod");

const sanaRegex = /^\d{4}-\d{2}-\d{2}$/;
const academicYearRegex = /^\d{4}\s*-\s*\d{4}$/;
const periodTypeEnum = z.enum(["KUNLIK", "HAFTALIK", "OYLIK", "CHORAKLIK", "YILLIK"]);
const bahoTuriEnum = z.enum(["JORIY", "NAZORAT", "ORALIQ", "YAKUNIY"]);
const pageSchema = z.coerce.number().int().min(1).optional();
const limitSchema = z.coerce.number().int().min(1).max(100).optional();

const davomatHolatiEnum = z.enum(["KELDI", "KECHIKDI", "SABABLI", "SABABSIZ"]);

const sanaQuerySchema = z.object({
  sana: z.string().trim().regex(sanaRegex, "sana YYYY-MM-DD formatda bo'lishi kerak").optional(),
});

const oquvYiliSchema = z
  .string()
  .trim()
  .regex(academicYearRegex, "oquvYili formati 2025-2026 bo'lishi kerak")
  .transform((value) => value.replace(/\s+/g, ""))
  .refine((value) => {
    const [startRaw, endRaw] = value.split("-");
    const start = Number.parseInt(startRaw, 10);
    const end = Number.parseInt(endRaw, 10);
    return Number.isFinite(start) && Number.isFinite(end) && end === start + 1;
  }, "oquvYili noto'g'ri: ikkinchi yil birinchisidan 1 ga katta bo'lishi kerak");

const teacherDarslarQuerySchema = z.object({
  sana: z.string().trim().regex(sanaRegex, "sana YYYY-MM-DD formatda bo'lishi kerak").optional(),
  oquvYili: oquvYiliSchema.optional(),
});

const davomatTarixQuerySchema = z.object({
  sana: z.string().trim().regex(sanaRegex, "sana YYYY-MM-DD formatda bo'lishi kerak").optional(),
  periodType: periodTypeEnum.optional(),
  classroomId: z.string().cuid("classroomId noto'g'ri").optional(),
  holat: davomatHolatiEnum.optional(),
  page: pageSchema,
  limit: limitSchema,
});

const darsIdParamSchema = z.object({
  darsId: z.string().cuid("darsId noto'g'ri"),
});

const davomatSaqlashSchema = z
  .object({
    sana: z.string().trim().regex(sanaRegex, "sana YYYY-MM-DD formatda bo'lishi kerak"),
    davomatlar: z
      .array(
        z
          .object({
            studentId: z.string().cuid("studentId noto'g'ri"),
            holat: davomatHolatiEnum,
            izoh: z.string().trim().max(300, "izoh juda uzun").optional(),
            bahoBall: z.number().int().min(0).max(100).optional(),
            bahoMaxBall: z.number().int().min(1).max(100).optional(),
            bahoTuri: bahoTuriEnum.optional(),
            bahoIzoh: z.string().trim().max(300, "baho izohi juda uzun").optional(),
          })
          .strict(),
      )
      .min(1, "Kamida bitta davomat yozuvi kerak"),
  })
  .superRefine((data, ctx) => {
    data.davomatlar.forEach((row, index) => {
      const hasAnyBahoField =
        row.bahoBall !== undefined ||
        row.bahoMaxBall !== undefined ||
        row.bahoTuri !== undefined ||
        row.bahoIzoh !== undefined;

      if (!hasAnyBahoField) return;

      if (row.bahoBall === undefined || row.bahoMaxBall === undefined || row.bahoTuri === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["davomatlar", index],
          message: "Baho kiritilganda bahoBall, bahoMaxBall va bahoTuri majburiy",
        });
        return;
      }

      if (row.bahoBall > row.bahoMaxBall) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["davomatlar", index, "bahoBall"],
          message: "bahoBall bahoMaxBall dan katta bo'lishi mumkin emas",
        });
      }
    });
  })
  .strict();

const adminHisobotQuerySchema = z.object({
  sana: z.string().trim().regex(sanaRegex, "sana YYYY-MM-DD formatda bo'lishi kerak").optional(),
  periodType: periodTypeEnum.optional(),
  classroomId: z.string().cuid("classroomId noto'g'ri").optional(),
  studentId: z.string().cuid("studentId noto'g'ri").optional(),
});

module.exports = {
  sanaQuerySchema,
  teacherDarslarQuerySchema,
  davomatTarixQuerySchema,
  darsIdParamSchema,
  davomatSaqlashSchema,
  adminHisobotQuerySchema,
};
