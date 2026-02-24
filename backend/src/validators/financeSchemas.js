const { z } = require("zod");

const oyKeyRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
const academicYearRegex = /^(\d{4})-(\d{4})$/;

const MIN_SUMMA = 50_000;
const MAX_SUMMA = 50_000_000;

const financeSettingsSchema = z
  .object({
    oylikSumma: z
      .coerce.number()
      .int()
      .min(MIN_SUMMA, `oylikSumma kamida ${MIN_SUMMA} bo'lishi kerak`)
      .max(MAX_SUMMA, `oylikSumma ko'pi bilan ${MAX_SUMMA} bo'lishi kerak`),
    tolovOylarSoni: z
      .coerce.number()
      .int()
      .min(1, "tolovOylarSoni kamida 1 bo'lishi kerak")
      .max(12, "tolovOylarSoni ko'pi bilan 12 bo'lishi kerak"),
    billingCalendar: z
      .object({
        academicYear: z.string().trim().regex(academicYearRegex, "academicYear formati YYYY-YYYY bo'lishi kerak").optional(),
        chargeableMonths: z
          .array(
            z.coerce.number().int().min(1, "Oy 1-12 bo'lishi kerak").max(12, "Oy 1-12 bo'lishi kerak"),
          )
          .min(1, "Kamida 1 ta to'lov oyi tanlanishi kerak")
          .max(12, "Ko'pi bilan 12 ta oy tanlanadi"),
      })
      .optional(),
    yillikSumma: z.coerce.number().int().optional(),
    boshlanishTuri: z.literal("KELASI_OY").optional().default("KELASI_OY"),
    izoh: z.string().trim().max(300).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.billingCalendar?.academicYear) {
      const match = String(value.billingCalendar.academicYear).match(academicYearRegex);
      if (match) {
        const start = Number(match[1]);
        const end = Number(match[2]);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end !== start + 1) {
          ctx.addIssue({
            code: "custom",
            path: ["billingCalendar", "academicYear"],
            message: "academicYear ketma-ket yil bo'lishi kerak (masalan 2025-2026)",
          });
        }
      }
    }
    const chargeableMonths = Array.isArray(value.billingCalendar?.chargeableMonths)
      ? [...new Set(value.billingCalendar.chargeableMonths.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n >= 1 && n <= 12))]
      : [];
    if (chargeableMonths.length && chargeableMonths.length !== value.tolovOylarSoni) {
      ctx.addIssue({
        code: "custom",
        path: ["tolovOylarSoni"],
        message: "tolovOylarSoni billingCalendar chargeableMonths soniga teng bo'lishi kerak",
      });
    }
    const effectiveOylar = chargeableMonths.length || value.tolovOylarSoni;
    const hisoblanganYillik = value.oylikSumma * effectiveOylar;
    if (hisoblanganYillik < MIN_SUMMA || hisoblanganYillik > MAX_SUMMA) {
      ctx.addIssue({
        code: "custom",
        path: ["oylikSumma"],
        message: "Hisoblangan yillik summa ruxsat etilgan oraliqdan tashqariga chiqmoqda",
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
  idempotencyKey: z.string().trim().uuid("idempotencyKey UUID bo'lishi kerak").optional(),
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
