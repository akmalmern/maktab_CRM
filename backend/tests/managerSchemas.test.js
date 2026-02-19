const test = require("node:test");
const assert = require("node:assert/strict");
const {
  managerDebtorsQuerySchema,
  createDebtorNoteSchema,
} = require("../src/validators/managerSchemas");

test("managerDebtorsQuerySchema accepts valid query", () => {
  const result = managerDebtorsQuerySchema.safeParse({
    page: "1",
    limit: "20",
    search: "akmal",
  });

  assert.equal(result.success, true);
  assert.equal(result.data.page, 1);
  assert.equal(result.data.limit, 20);
  assert.equal(result.data.search, "akmal");
});

test("createDebtorNoteSchema rejects too short note", () => {
  const result = createDebtorNoteSchema.safeParse({
    izoh: "ok",
  });

  assert.equal(result.success, false);
});

test("createDebtorNoteSchema accepts optional promisedPayDate", () => {
  const result = createDebtorNoteSchema.safeParse({
    izoh: "Keyingi haftaga to'lov qilishini aytdi",
    promisedPayDate: "2026-02-25",
  });

  assert.equal(result.success, true);
  assert.ok(result.data.promisedPayDate instanceof Date);
});
