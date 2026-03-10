const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createDarsJadvaliSchema,
  updateDarsJadvaliSchema,
  listDarsJadvaliQuerySchema,
} = require("../src/validators/jadvalSchemas");

const validPayload = {
  sinfId: "ckh7x7x7x0001qv0h0w0w0w0w",
  oqituvchiId: "ckh7x7x7x0002qv0h0w0w0w0w",
  fanId: "ckh7x7x7x0003qv0h0w0w0w0w",
  haftaKuni: "DUSHANBA",
  vaqtOraliqId: "ckh7x7x7x0004qv0h0w0w0w0w",
  oquvYili: "2025-2026",
};

test("createDarsJadvaliSchema rejects invalid academic year format", () => {
  const result = createDarsJadvaliSchema.safeParse({
    ...validPayload,
    oquvYili: "2025/2026",
  });
  assert.equal(result.success, false);
});

test("createDarsJadvaliSchema normalizes academic year with spaces", () => {
  const result = createDarsJadvaliSchema.safeParse({
    ...validPayload,
    oquvYili: "2025 - 2026",
  });
  assert.equal(result.success, true);
  assert.equal(result.data.oquvYili, "2025-2026");
});

test("updateDarsJadvaliSchema validates optional oquvYili", () => {
  const result = updateDarsJadvaliSchema.safeParse({
    oquvYili: "2026-2027",
  });
  assert.equal(result.success, true);
  assert.equal(result.data.oquvYili, "2026-2027");
});

test("listDarsJadvaliQuerySchema validates oquvYili format", () => {
  const result = listDarsJadvaliQuerySchema.safeParse({
    oquvYili: "2026_2027",
  });
  assert.equal(result.success, false);
});
