const test = require("node:test");
const assert = require("node:assert/strict");
const {
  upsertTeacherWorkloadPlanSchema,
  listTeacherWorkloadPlansQuerySchema,
} = require("../src/validators/jadvalSchemas");

test("upsertTeacherWorkloadPlanSchema normalizes oquvYili and accepts weeklyHoursLimit", () => {
  const parsed = upsertTeacherWorkloadPlanSchema.parse({
    oqituvchiId: "ckgv6m6l20000y4y1n6f1a2b3",
    oquvYili: " 2025 - 2026 ",
    weeklyHoursLimit: 12,
  });

  assert.equal(parsed.oquvYili, "2025-2026");
  assert.equal(parsed.weeklyHoursLimit, 12);
});

test("upsertTeacherWorkloadPlanSchema rejects too small weeklyHoursLimit", () => {
  assert.throws(
    () =>
      upsertTeacherWorkloadPlanSchema.parse({
        oqituvchiId: "ckgv6m6l20000y4y1n6f1a2b3",
        oquvYili: "2025-2026",
        weeklyHoursLimit: 0,
      }),
    /weeklyHoursLimit/i,
  );
});

test("listTeacherWorkloadPlansQuerySchema accepts valid filters", () => {
  const parsed = listTeacherWorkloadPlansQuerySchema.parse({
    oqituvchiId: "ckgv6m6l20000y4y1n6f1a2b3",
    oquvYili: "2026-2027",
  });

  assert.equal(parsed.oqituvchiId, "ckgv6m6l20000y4y1n6f1a2b3");
  assert.equal(parsed.oquvYili, "2026-2027");
});

test("listTeacherWorkloadPlansQuerySchema rejects invalid oquvYili", () => {
  const result = listTeacherWorkloadPlansQuerySchema.safeParse({
    oquvYili: "2026-2028",
  });

  assert.equal(result.success, false);
});
