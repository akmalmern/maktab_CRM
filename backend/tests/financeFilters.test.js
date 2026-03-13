const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeClassroomFilterInput,
  normalizeClassroomFilterList,
} = require("../src/controllers/admin/finance/shared/filters");

test("normalizeClassroomFilterInput converts all sentinel values to null", () => {
  assert.equal(normalizeClassroomFilterInput("all"), null);
  assert.equal(normalizeClassroomFilterInput(" ALL "), null);
  assert.equal(normalizeClassroomFilterInput("barcha"), null);
  assert.equal(normalizeClassroomFilterInput("hammasi"), null);
  assert.equal(normalizeClassroomFilterInput("class_10a"), "class_10a");
});

test("normalizeClassroomFilterList keeps unique valid classroom ids", () => {
  const result = normalizeClassroomFilterList([
    "all",
    "class_10a",
    " class_10a ",
    "BARCHA",
    "",
    null,
    "class_9b",
  ]);

  assert.deepEqual(result, ["class_10a", "class_9b"]);
});
