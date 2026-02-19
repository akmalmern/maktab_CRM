const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildDebtInfo,
  buildMonthRange,
  buildImtiyozMonthMap,
} = require("../src/services/financeDebtService");

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

test("buildImtiyozMonthMap keeps historical snapshot after deactivation", () => {
  const map = buildImtiyozMonthMap({
    oylikSumma: 300000,
    imtiyozlar: [
      {
        turi: "SUMMA",
        qiymat: 100000,
        boshlanishOy: "2026-01",
        oylarSoni: 3,
        isActive: false,
        bekorQilinganAt: new Date("2026-03-05T00:00:00.000Z"),
        oylarSnapshot: [
          { key: "2026-01", oySumma: 200000 },
          { key: "2026-02", oySumma: 200000 },
        ],
      },
    ],
  });

  assert.equal(map.get("2026-01"), 200000);
  assert.equal(map.get("2026-02"), 200000);
  assert.equal(map.has("2026-03"), false);
});

test("buildImtiyozMonthMap legacy inactive record ignores future months", () => {
  const map = buildImtiyozMonthMap({
    oylikSumma: 300000,
    imtiyozlar: [
      {
        turi: "FOIZ",
        qiymat: 50,
        boshlanishOy: "2026-01",
        oylarSoni: 4,
        isActive: false,
        bekorQilinganAt: new Date("2026-03-10T00:00:00.000Z"),
      },
    ],
  });

  assert.equal(map.get("2026-01"), 150000);
  assert.equal(map.get("2026-02"), 150000);
  assert.equal(map.has("2026-03"), false);
  assert.equal(map.has("2026-04"), false);
});
