const { z } = require("zod");

const oyKeyRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

const financeSettingsSchema = z.object({
  oylikSumma: z.coerce.number().int().positive("oylikSumma musbat bo'lishi kerak"),
  yillikSumma: z.coerce.number().int().positive("yillikSumma musbat bo'lishi kerak"),
});

const financeStudentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().optional(),
  classroomId: z.string().cuid("classroomId noto'g'ri").optional(),
  status: z.enum(["ALL", "QARZDOR", "TOLAGAN"]).optional(),
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
      message: "Ixtiyoriy to'lov uchun summa majburiy",
    });
  }
});

const financeExportQuerySchema = z.object({
  search: z.string().trim().optional(),
  classroomId: z.string().cuid("classroomId noto'g'ri").optional(),
});

module.exports = {
  financeSettingsSchema,
  financeStudentsQuerySchema,
  studentIdParamSchema,
  tolovIdParamSchema,
  createPaymentSchema,
  financeExportQuerySchema,
};
