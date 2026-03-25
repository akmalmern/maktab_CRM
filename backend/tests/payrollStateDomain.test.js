const test = require("node:test");
const assert = require("node:assert/strict");
const { Prisma } = require("@prisma/client");

const { ApiError } = require("../src/utils/apiError");
const { createPayrollStateDomain } = require("../src/services/payroll/shared/payrollStateDomain");

function decimal(value) {
  if (value instanceof Prisma.Decimal) return value;
  if (value === undefined || value === null) return new Prisma.Decimal(0);
  return new Prisma.Decimal(value);
}

function money(value) {
  return decimal(value).toDecimalPlaces(2);
}

function createDomain() {
  return createPayrollStateDomain({
    ApiError,
    money,
    DECIMAL_ZERO: new Prisma.Decimal(0),
  });
}

test("clampPaidAmountToPayable negative va ortiqcha to'lovni normalize qiladi", () => {
  const { clampPaidAmountToPayable } = createDomain();

  assert.equal(String(clampPaidAmountToPayable(-1000, 50000)), "0");
  assert.equal(String(clampPaidAmountToPayable(100000, 50000)), "50000");
  assert.equal(String(clampPaidAmountToPayable(12500, 50000)), "12500");
  assert.equal(String(clampPaidAmountToPayable(1000, 0)), "0");
});

test("getPayrollItemPaymentStatus payable va paid holatiga qarab status qaytaradi", () => {
  const { getPayrollItemPaymentStatus } = createDomain();

  assert.equal(
    getPayrollItemPaymentStatus({
      paidAmount: 0,
      payableAmount: 0,
    }),
    "PAID",
  );
  assert.equal(
    getPayrollItemPaymentStatus({
      paidAmount: 0,
      payableAmount: 50000,
    }),
    "UNPAID",
  );
  assert.equal(
    getPayrollItemPaymentStatus({
      paidAmount: 15000,
      payableAmount: 50000,
    }),
    "PARTIAL",
  );
  assert.equal(
    getPayrollItemPaymentStatus({
      paidAmount: 60000,
      payableAmount: 50000,
    }),
    "PAID",
  );
});

test("assertRunStatus allowed bo'lmagan statusda PAYROLL_INVALID_STATE tashlaydi", () => {
  const { assertRunStatus } = createDomain();

  assert.doesNotThrow(() => assertRunStatus({ status: "DRAFT" }, ["DRAFT", "APPROVED"]));
  assert.throws(
    () => assertRunStatus({ status: "PAID" }, ["DRAFT", "APPROVED"]),
    (error) => {
      assert.equal(error.code, "PAYROLL_INVALID_STATE");
      assert.deepEqual(error.meta, {
        currentStatus: "PAID",
        allowed: ["DRAFT", "APPROVED"],
      });
      return true;
    },
  );
});
