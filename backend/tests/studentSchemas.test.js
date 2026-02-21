const test = require("node:test");
const assert = require("node:assert/strict");
const { studentJadvalQuerySchema } = require("../src/validators/jadvalSchemas");
const { davomatTarixQuerySchema } = require("../src/validators/attendanceSchemas");

test("studentJadvalQuerySchema accepts valid academic year", () => {
  const parsed = studentJadvalQuerySchema.safeParse({
    oquvYili: "2025-2026",
  });

  assert.equal(parsed.success, true);
  assert.equal(parsed.data.oquvYili, "2025-2026");
});

test("studentJadvalQuerySchema rejects invalid academic year range", () => {
  const parsed = studentJadvalQuerySchema.safeParse({
    oquvYili: "2025-2028",
  });

  assert.equal(parsed.success, false);
});

test("davomatTarixQuerySchema supports page and limit", () => {
  const parsed = davomatTarixQuerySchema.safeParse({
    periodType: "OYLIK",
    page: "2",
    limit: "50",
  });

  assert.equal(parsed.success, true);
  assert.equal(parsed.data.page, 2);
  assert.equal(parsed.data.limit, 50);
});

test("davomatTarixQuerySchema rejects too big limit", () => {
  const parsed = davomatTarixQuerySchema.safeParse({
    periodType: "OYLIK",
    page: "1",
    limit: "500",
  });

  assert.equal(parsed.success, false);
});
