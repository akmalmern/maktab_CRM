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

const createDarsJadvaliSchema = z
  .object({
    sinfId: z.string().cuid("sinfId noto'g'ri"),
    oqituvchiId: z.string().cuid("oqituvchiId noto'g'ri"),
    fanId: z.string().cuid("fanId noto'g'ri"),
    haftaKuni: haftaKuniEnum,
    vaqtOraliqId: z.string().cuid("vaqtOraliqId noto'g'ri"),
    oquvYili: z.string().trim().min(1, "oquvYili majburiy"),
  })
  .strict();

const updateDarsJadvaliSchema = z
  .object({
    sinfId: z.string().cuid("sinfId noto'g'ri").optional(),
    oqituvchiId: z.string().cuid("oqituvchiId noto'g'ri").optional(),
    fanId: z.string().cuid("fanId noto'g'ri").optional(),
    haftaKuni: haftaKuniEnum.optional(),
    vaqtOraliqId: z.string().cuid("vaqtOraliqId noto'g'ri").optional(),
    oquvYili: z.string().trim().min(1, "oquvYili majburiy").optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: "Yangilash uchun kamida bitta maydon yuboring",
  });

const listDarsJadvaliQuerySchema = z.object({
  sinfId: z.string().cuid().optional(),
  oqituvchiId: z.string().cuid().optional(),
  oquvYili: z.string().trim().min(1).optional(),
});

const idParamSchema = z.object({
  id: z.string().cuid(),
});

module.exports = {
  createVaqtOraliqSchema,
  createDarsJadvaliSchema,
  updateDarsJadvaliSchema,
  listDarsJadvaliQuerySchema,
  idParamSchema,
};
