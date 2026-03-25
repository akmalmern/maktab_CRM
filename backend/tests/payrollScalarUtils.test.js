const test = require("node:test");
const assert = require("node:assert/strict");
const { Prisma } = require("@prisma/client");

const { createPayrollScalarUtils } = require("../src/services/payroll/shared/payrollScalarUtils");

function createUtils() {
  return createPayrollScalarUtils({
    Prisma,
    DECIMAL_ZERO: new Prisma.Decimal(0),
  });
}

test("cleanOptional trim qiladi va bo'sh qiymatni undefined ga aylantiradi", () => {
  const { cleanOptional } = createUtils();

  assert.equal(cleanOptional("  hello  "), "hello");
  assert.equal(cleanOptional("   "), undefined);
  assert.equal(cleanOptional(null), undefined);
});

test("decimal va money Decimal qiymatlarni normalize qiladi", () => {
  const { decimal, money } = createUtils();

  assert.equal(String(decimal(null)), "0");
  assert.equal(String(decimal("12.345")), "12.345");
  assert.equal(String(money("12.345")), "12.35");
  assert.equal(String(money(new Prisma.Decimal("99.994"))), "99.99");
});
