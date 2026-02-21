const test = require("node:test");
const assert = require("node:assert/strict");
const {
  resolvePaymentMonthCount,
  resolvePaymentAmount,
  resolvePaymentPlan,
} = require("../src/services/financePaymentService");

test("resolvePaymentMonthCount computes monthly oylar soni", () => {
  const oylarSoni = resolvePaymentMonthCount({
    turi: "OYLIK",
    oylarSoniRaw: 2,
  });
  assert.equal(oylarSoni, 2);
});

test("resolvePaymentMonthCount forces 12 for YILLIK", () => {
  const oylarSoni = resolvePaymentMonthCount({
    turi: "YILLIK",
    oylarSoniRaw: undefined,
  });
  assert.equal(oylarSoni, 12);
});

test("resolvePaymentMonthCount rejects invalid YILLIK oylar soni", () => {
  assert.throws(
    () =>
      resolvePaymentMonthCount({
        turi: "YILLIK",
        oylarSoniRaw: 6,
      }),
    { code: "YILLIK_MONTHS_INVALID" },
  );
});

test("resolvePaymentAmount returns expected summa when not provided", () => {
  const amount = resolvePaymentAmount({
    expectedSumma: 600000,
    requestedSumma: null,
  });
  assert.equal(amount, 600000);
});

test("resolvePaymentAmount rejects mismatched summa", () => {
  assert.throws(
    () =>
      resolvePaymentAmount({
        expectedSumma: 600000,
        requestedSumma: 500000,
      }),
    { code: "PAYMENT_AMOUNT_MISMATCH" },
  );
});

test("resolvePaymentPlan builds month rows with per-month amount map", () => {
  const monthAmountByKey = new Map([
    ["2026-01", 200000],
    ["2026-02", 250000],
  ]);
  const result = resolvePaymentPlan({
    turi: "OYLIK",
    startMonth: "2026-01",
    oylarSoniRaw: 2,
    monthAmountByKey,
    defaultMonthAmount: 300000,
  });

  assert.equal(result.oylarSoni, 2);
  assert.deepEqual(result.monthPlans, [
    { key: "2026-01", yil: 2026, oy: 1, oySumma: 200000 },
    { key: "2026-02", yil: 2026, oy: 2, oySumma: 250000 },
  ]);
});
