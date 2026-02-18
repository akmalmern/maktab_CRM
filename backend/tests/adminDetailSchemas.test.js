const test = require("node:test");
const assert = require("node:assert/strict");
const { resetPasswordBodySchema } = require("../src/validators/adminDetailSchemas");

test("resetPasswordBodySchema requires at least 8 chars", () => {
  const parsed = resetPasswordBodySchema.safeParse({ newPassword: "1234567" });
  assert.equal(parsed.success, false);
});

test("resetPasswordBodySchema accepts valid password", () => {
  const parsed = resetPasswordBodySchema.safeParse({ newPassword: "StrongPass123" });
  assert.equal(parsed.success, true);
});
