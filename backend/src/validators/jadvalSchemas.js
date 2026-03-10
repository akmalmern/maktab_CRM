const { z } = require("zod");

const vaqtRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const createVaqtOraliqSchema = z
  .object({
    nomi: z.string().trim().min(1, "nomi majburiy"),
    boshlanishVaqti: z
      .string()
      .trim()
      .regex(vaqtRegex, "boshlanishVaqti HH:MM formatda bo'lishi kerak"),
    tugashVaqti: z
      .string()
      .trim()
      .regex(vaqtRegex, "tugashVaqti HH:MM formatda bo'lishi kerak"),
    tartib: z.number().int().min(1, "tartib 1 yoki undan katta bo'lishi kerak"),
  })
  .strict();

const haftaKuniEnum = z.enum([
  "DUSHANBA",
  "SESHANBA",
  "CHORSHANBA",
  "PAYSHANBA",
  "JUMA",
  "SHANBA",
]);

const academicYearRegex = /^\d{4}\s*-\s*\d{4}$/;
const academicYearSchema = z
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

const createDarsJadvaliSchema = z
  .object({
    sinfId: z.string().cuid("sinfId noto'g'ri"),
    oqituvchiId: z.string().cuid("oqituvchiId noto'g'ri"),
    fanId: z.string().cuid("fanId noto'g'ri"),
    haftaKuni: haftaKuniEnum,
    vaqtOraliqId: z.string().cuid("vaqtOraliqId noto'g'ri"),
    oquvYili: academicYearSchema,
  })
  .strict();

const updateDarsJadvaliSchema = z
  .object({
    sinfId: z.string().cuid("sinfId noto'g'ri").optional(),
    oqituvchiId: z.string().cuid("oqituvchiId noto'g'ri").optional(),
    fanId: z.string().cuid("fanId noto'g'ri").optional(),
    haftaKuni: haftaKuniEnum.optional(),
    vaqtOraliqId: z.string().cuid("vaqtOraliqId noto'g'ri").optional(),
    oquvYili: academicYearSchema.optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: "Yangilash uchun kamida bitta maydon yuboring",
  });

const listDarsJadvaliQuerySchema = z.object({
  sinfId: z.string().cuid().optional(),
  oqituvchiId: z.string().cuid().optional(),
  oquvYili: academicYearSchema.optional(),
});

const studentJadvalQuerySchema = z
  .object({
    oquvYili: academicYearSchema.optional(),
  })
  .strict();

const listTeacherWorkloadPlansQuerySchema = z
  .object({
    oqituvchiId: z.string().cuid().optional(),
    oquvYili: academicYearSchema.optional(),
  })
  .strict();

const upsertTeacherWorkloadPlanSchema = z
  .object({
    oqituvchiId: z.string().cuid("oqituvchiId noto'g'ri"),
    oquvYili: academicYearSchema,
    weeklyHoursLimit: z.coerce
      .number()
      .min(0.25, "weeklyHoursLimit kamida 0.25 bo'lishi kerak")
      .max(72, "weeklyHoursLimit 72 soatdan oshmasligi kerak"),
    note: z.string().trim().max(300).optional(),
  })
  .strict();

const idParamSchema = z.object({
  id: z.string().cuid(),
});

module.exports = {
  createVaqtOraliqSchema,
  createDarsJadvaliSchema,
  updateDarsJadvaliSchema,
  listDarsJadvaliQuerySchema,
  studentJadvalQuerySchema,
  listTeacherWorkloadPlansQuerySchema,
  upsertTeacherWorkloadPlanSchema,
  idParamSchema,
};
