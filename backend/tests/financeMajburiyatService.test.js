const test = require("node:test");
const assert = require("node:assert/strict");
const {
  summarizeDebtFromMajburiyatRows,
} = require("../src/services/financeMajburiyatService");

test("summarizeDebtFromMajburiyatRows calculates debt and paid counts", () => {
  const result = summarizeDebtFromMajburiyatRows([
    { yil: 2026, oy: 1, netSumma: 300000, holat: "TOLANGAN" },
    { yil: 2026, oy: 2, netSumma: 300000, holat: "BELGILANDI" },
    { yil: 2026, oy: 3, netSumma: 0, holat: "TOLANGAN" },
  ]);

  assert.equal(result.qarzOylarSoni, 1);
  assert.equal(result.tolanganOylarSoni, 2);
  assert.equal(result.jamiQarzSumma, 300000);
  assert.equal(result.holat, "QARZDOR");
  assert.deepEqual(
    result.qarzOylar.map((m) => m.key),
    ["2026-02"],
  );
});
