const { z } = require("zod");

const loginSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(1, "username majburiy")
      .max(100, "username juda uzun"),
    password: z
      .string()
      .min(1, "password majburiy")
      .max(256, "password juda uzun"),
  })
  .strict();

module.exports = { loginSchema };
