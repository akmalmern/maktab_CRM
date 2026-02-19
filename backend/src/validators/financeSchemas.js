const { z } = require("zod");

const oyKeyRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

const MIN_SUMMA = 50_000;
const MAX_SUMMA = 50_000_000;

const financeSettingsSchema = z
  .object({
    oylikSumma: z
      .coerce.number()
      .int()
      .min(MIN_SUMMA, `oylikSumma kamida ${MIN_SUMMA} bo'lishi kerak`)
      .max(MAX_SUMMA, `oylikSumma ko'pi bilan ${MAX_SUMMA} bo'lishi kerak`),
    yillikSumma: z
      .coerce.number()
      .int()
      .min(MIN_SUMMA, `yillikSumma kamida ${MIN_SUMMA} bo'lishi kerak`)
      .max(MAX_SUMMA, `yillikSumma ko'pi bilan ${MAX_SUMMA} bo'lishi kerak`),
    boshlanishTuri: z.literal("KELASI_OY").optional().default("KELASI_OY"),
    izoh: z.string().trim().max(300).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.yillikSumma > value.oylikSumma * 12) {
      ctx.addIssue({
        code: "custom",
        path: ["yillikSumma"],
        message: "yillikSumma oylikSumma * 12 dan katta bo'lmasligi kerak",
      });
    }
  });

const financeStudentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().optional(),
  classroomId: z.string().cuid("classroomId noto'g'ri").optional(),
  status: z.enum(["ALL", "QARZDOR", "TOLAGAN"]).optional(),
  debtMonth: z.enum(["ALL", "CURRENT", "PREVIOUS"]).optional(),
  debtTargetMonth: z.string().trim().regex(oyKeyRegex, "debtTargetMonth formati YYYY-MM bo'lishi kerak").optional(),
  cashflowMonth: z.string().trim().regex(oyKeyRegex, "cashflowMonth formati YYYY-MM bo'lishi kerak").optional(),
});

const studentIdParamSchema = z.object({
  studentId: z.string().cuid("studentId noto'g'ri"),
});

const tolovIdParamSchema = z.object({
  tolovId: z.string().cuid("tolovId noto'g'ri"),
});

const createPaymentSchema = z.object({
  turi: z.enum(["OYLIK", "YILLIK", "IXTIYORIY"]),
  startMonth: z.string().trim().regex(oyKeyRegex, "startMonth formati YYYY-MM bo'lishi kerak"),
  oylarSoni: z.coerce.number().int().min(1).max(36).optional(),
  summa: z.coerce.number().int().positive().optional(),
  izoh: z.string().trim().max(300).optional(),
}).superRefine((value, ctx) => {
  if (value.turi === "YILLIK" && value.oylarSoni !== undefined && value.oylarSoni !== 12) {
    ctx.addIssue({
      code: "custom",
      path: ["oylarSoni"],
      message: "Yillik to'lovda oylar soni 12 bo'lishi kerak",
    });
  }
  if (value.turi === "IXTIYORIY" && value.summa === undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["summa"],
      message: "Ixtiyoriy to'lovda summa majburiy",
    });
  }
});

const createImtiyozSchema = z
  .object({
    turi: z.enum(["FOIZ", "SUMMA", "TOLIQ_OZOD"]),
    qiymat: z.coerce.number().int().positive().optional(),
    boshlanishOy: z.string().trim().regex(oyKeyRegex, "boshlanishOy formati YYYY-MM bo'lishi kerak"),
    oylarSoni: z.coerce.number().int().min(1).max(36).default(1),
    sabab: z.string().trim().min(3).max(120),
    izoh: z.string().trim().max(300).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.turi === "TOLIQ_OZOD" && value.qiymat !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["qiymat"],
        message: "TOLIQ_OZOD turida qiymat yuborilmaydi",
      });
    }
    if (value.turi === "FOIZ") {
      if (value.qiymat === undefined || value.qiymat < 1 || value.qiymat > 99) {
        ctx.addIssue({
          code: "custom",
          path: ["qiymat"],
          message: "FOIZ turi uchun qiymat 1-99 oralig'ida bo'lishi kerak",
        });
      }
    }
    if (value.turi === "SUMMA" && value.qiymat === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["qiymat"],
        message: "SUMMA turi uchun qiymat majburiy",
      });
    }
  });

const imtiyozIdParamSchema = z.object({
  imtiyozId: z.string().cuid("imtiyozId noto'g'ri"),
});

const deactivateImtiyozSchema = z.object({
  sabab: z.string().trim().min(3).max(200).optional(),
});

const financeExportQuerySchema = z.object({
  search: z.string().trim().optional(),
  classroomId: z.string().cuid("classroomId noto'g'ri").optional(),
});

const financeTarifIdParamSchema = z.object({
  tarifId: z.string().cuid("tarifId noto'g'ri"),
});

const financeTarifRollbackSchema = z.object({
  boshlanishTuri: z.literal("KELASI_OY").optional().default("KELASI_OY"),
  izoh: z.string().trim().max(300).optional(),
});

module.exports = {
  financeSettingsSchema,
  financeStudentsQuerySchema,
  studentIdParamSchema,
  tolovIdParamSchema,
  createPaymentSchema,
  createImtiyozSchema,
  imtiyozIdParamSchema,
  deactivateImtiyozSchema,
  financeExportQuerySchema,
  financeTarifIdParamSchema,
  financeTarifRollbackSchema,
};
