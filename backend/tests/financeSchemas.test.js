const test = require("node:test");
const assert = require("node:assert/strict");
const { createPaymentSchema } = require("../src/validators/financeSchemas");

test("createPaymentSchema rejects yearly payment with oylarSoni != 12", () => {
  const parsed = createPaymentSchema.safeParse({
    turi: "YILLIK",
    startMonth: "2026-01",
    oylarSoni: 6,
  });

  assert.equal(parsed.success, false);
});

test("createPaymentSchema requires summa for IXTIYORIY", () => {
  const parsed = createPaymentSchema.safeParse({
    turi: "IXTIYORIY",
    startMonth: "2026-01",
    oylarSoni: 1,
  });

  assert.equal(parsed.success, false);
});
