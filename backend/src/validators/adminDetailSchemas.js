const { z } = require("zod");

const resetPasswordBodySchema = z.object({
  newPassword: z
    .string()
    .min(10, "Parol kamida 10 ta belgidan iborat bo'lishi kerak")
    .max(128, "Parol juda uzun")
    .regex(/[A-Z]/, "Parolda kamida 1 ta katta harf bo'lishi kerak")
    .regex(/[a-z]/, "Parolda kamida 1 ta kichik harf bo'lishi kerak")
    .regex(/[0-9]/, "Parolda kamida 1 ta raqam bo'lishi kerak")
    .regex(/[^A-Za-z0-9]/, "Parolda kamida 1 ta maxsus belgi bo'lishi kerak"),
});

module.exports = {
  resetPasswordBodySchema,
};
