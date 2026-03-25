const test = require("node:test");
const assert = require("node:assert/strict");

const { buildCsv, toIsoOrEmpty } = require("../src/services/payroll/shared/payrollQueryFormatters");

test("buildCsv quotes commas, quotes and newlines correctly", () => {
  const csv = buildCsv([
    ["name", "note"],
    ['Ali "Valiyev"', "hello,world"],
    ["Line", "first\nsecond"],
  ]);

  assert.equal(
    csv,
    'name,note\r\n"Ali ""Valiyev""","hello,world"\r\nLine,"first\nsecond"',
  );
});

test("toIsoOrEmpty valid date uchun ISO qaytaradi, invalid bo'lsa bo'sh string", () => {
  assert.equal(toIsoOrEmpty("2026-03-10T08:00:00.000Z"), "2026-03-10T08:00:00.000Z");
  assert.equal(toIsoOrEmpty("not-a-date"), "");
  assert.equal(toIsoOrEmpty(null), "");
});
