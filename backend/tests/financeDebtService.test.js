const test = require("node:test");
const assert = require("node:assert/strict");
const { buildDebtInfo, buildMonthRange } = require("../src/services/financeDebtService");

test("buildMonthRange creates sequential months", () => {
  const months = buildMonthRange("2026-01", 3);
  assert.deepEqual(months, [
    { yil: 2026, oy: 1 },
    { yil: 2026, oy: 2 },
    { yil: 2026, oy: 3 },
  ]);
});

test("buildDebtInfo computes debt by uncovered months", () => {
  const paidMonthSet = new Set(["2026-01"]);
  const result = buildDebtInfo({
    startDate: new Date("2026-01-05T00:00:00.000Z"),
    paidMonthSet,
    oylikSumma: 300000,
    now: new Date("2026-03-20T00:00:00.000Z"),
  });

  assert.equal(result.dueMonthsCount, 3);
  assert.equal(result.qarzOylarSoni, 2);
  assert.equal(result.jamiQarzSumma, 600000);
  assert.equal(result.holat, "QARZDOR");
});
