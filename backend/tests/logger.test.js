const test = require("node:test");
const assert = require("node:assert/strict");
const { createLogger, serializeError } = require("../src/utils/logger");

test("serializeError keeps operational fields", () => {
  const error = new Error("boom");
  error.code = "TEST_ERROR";
  error.statusCode = 500;

  const serialized = serializeError(error);

  assert.equal(serialized.name, "Error");
  assert.equal(serialized.message, "boom");
  assert.equal(serialized.code, "TEST_ERROR");
  assert.equal(serialized.statusCode, 500);
  assert.match(serialized.stack || "", /boom/);
});

test("logger writes structured json with base context", () => {
  const originalLog = console.log;
  const originalLevel = process.env.LOG_LEVEL;
  const output = [];

  process.env.LOG_LEVEL = "debug";
  console.log = (line) => output.push(line);

  try {
    const testLogger = createLogger({ component: "test_logger" });
    testLogger.info("sample_message", {
      requestId: "req-1",
      nested: { ok: true },
    });
  } finally {
    console.log = originalLog;
    if (originalLevel === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = originalLevel;
    }
  }

  assert.equal(output.length, 1);
  const payload = JSON.parse(output[0]);
  assert.equal(payload.level, "info");
  assert.equal(payload.message, "sample_message");
  assert.equal(payload.component, "test_logger");
  assert.equal(payload.requestId, "req-1");
  assert.deepEqual(payload.nested, { ok: true });
});
