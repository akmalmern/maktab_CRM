const { z } = require("zod");

const resetPasswordBodySchema = z.object({
  newPassword: z.string().min(8).max(64),
});

module.exports = {
  resetPasswordBodySchema,
};
