const { z } = require("zod");

const phoneSchema = z.preprocess(
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

const selfProfileUpdateSchema = z
  .object({
    phone: phoneSchema,
  })
  .strict();

const selfPasswordChangeSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Joriy parol majburiy")
      .max(256, "Joriy parol juda uzun"),
    newPassword: z
      .string()
      .min(8, "Yangi parol kamida 8 ta belgi bo'lishi kerak")
      .max(256, "Yangi parol juda uzun"),
  })
  .strict();

module.exports = {
  selfProfileUpdateSchema,
  selfPasswordChangeSchema,
};
