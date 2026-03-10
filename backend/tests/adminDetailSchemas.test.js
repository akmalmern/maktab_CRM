const test = require("node:test");
const assert = require("node:assert/strict");
const { resetPasswordBodySchema } = require("../src/validators/adminDetailSchemas");

test("resetPasswordBodySchema requires strong password policy", () => {
  const parsed = resetPasswordBodySchema.safeParse({ newPassword: "Abc12345!" });
  assert.equal(parsed.success, false);
});

test("resetPasswordBodySchema accepts valid password", () => {
  const parsed = resetPasswordBodySchema.safeParse({ newPassword: "StrongPass123!" });
  assert.equal(parsed.success, true);
});
