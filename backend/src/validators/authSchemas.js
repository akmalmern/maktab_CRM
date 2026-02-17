const { z } = require("zod");

const loginSchema = z
  .object({
    username: z.string().trim().min(1, "username majburiy"),
    password: z.string().min(1, "password majburiy"),
  })
  .strict();

module.exports = { loginSchema };
