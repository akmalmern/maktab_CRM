const test = require("node:test");
const assert = require("node:assert/strict");
const { resolvePaymentPlan } = require("../src/services/financePaymentService");

const settings = {
  oylikSumma: 300000,
  yillikSumma: 3000000,
};

test("resolvePaymentPlan computes default monthly amount", () => {
  const plan = resolvePaymentPlan({
    turi: "OYLIK",
    oylarSoniRaw: 2,
    summaRaw: undefined,
    settings,
  });

  assert.equal(plan.oylarSoni, 2);
  assert.equal(plan.summa, 600000);
});

test("resolvePaymentPlan rejects mismatched amount", () => {
  assert.throws(
    () =>
      resolvePaymentPlan({
        turi: "OYLIK",
        oylarSoniRaw: 2,
        summaRaw: 500000,
        settings,
      }),
    { code: "PAYMENT_AMOUNT_MISMATCH" },
  );
});

test("resolvePaymentPlan infers IXTIYORIY months from summa", () => {
  const plan = resolvePaymentPlan({
    turi: "IXTIYORIY",
    oylarSoniRaw: undefined,
    summaRaw: 900000,
    settings,
  });

  assert.equal(plan.oylarSoni, 3);
  assert.equal(plan.summa, 900000);
});
