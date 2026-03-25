const test = require("node:test");
const assert = require("node:assert/strict");
const {
  davomatSaqlashSchema,
  adminHisobotQuerySchema,
} = require("../src/validators/attendanceSchemas");

test("davomatSaqlashSchema rejects duplicate student rows", () => {
  const parsed = davomatSaqlashSchema.safeParse({
    sana: "2026-03-10",
    davomatlar: [
      { studentId: "cmr0000000000000000000001", holat: "KELDI" },
      { studentId: "cmr0000000000000000000001", holat: "SABABSIZ" },
    ],
  });
  assert.equal(parsed.success, false);
  const issues = parsed.success ? [] : parsed.error.issues || [];
  assert.ok(
    issues.some(
      (issue) =>
        String(issue.path?.join(".")) === "davomatlar.1.studentId" &&
        String(issue.message || "").includes("faqat bitta"),
    ),
  );
});

test("davomatSaqlashSchema rejects removed izoh fields", () => {
  const parsed = davomatSaqlashSchema.safeParse({
    sana: "2026-03-10",
    davomatlar: [
      {
        studentId: "cmr0000000000000000000001",
        holat: "KELDI",
        izoh: "legacy note",
        bahoIzoh: "legacy grade note",
      },
    ],
  });
  assert.equal(parsed.success, false);
});

test("adminHisobotQuerySchema supports holat + pagination", () => {
  const parsed = adminHisobotQuerySchema.safeParse({
    sana: "2026-03-10",
    periodType: "OYLIK",
    holat: "SABABSIZ",
    page: "2",
    limit: "50",
  });
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.page, 2);
  assert.equal(parsed.data.limit, 50);
  assert.equal(parsed.data.holat, "SABABSIZ");
});
