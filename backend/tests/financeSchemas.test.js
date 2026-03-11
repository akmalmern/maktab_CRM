const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createPaymentSchema,
  partialRevertPaymentSchema,
} = require("../src/validators/financeSchemas");

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

test("partialRevertPaymentSchema accepts valid payload", () => {
  const parsed = partialRevertPaymentSchema.safeParse({
    summa: 100000,
    sabab: "Noto'g'ri to'lov",
  });

  assert.equal(parsed.success, true);
});

test("partialRevertPaymentSchema rejects non-positive summa", () => {
  const parsed = partialRevertPaymentSchema.safeParse({
    summa: 0,
    sabab: "xato",
  });

  assert.equal(parsed.success, false);
});
