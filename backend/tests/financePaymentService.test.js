const test = require("node:test");
const assert = require("node:assert/strict");
const {
  resolvePaymentMonthCount,
  resolvePaymentAmount,
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
