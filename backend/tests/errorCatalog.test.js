const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeErrorCode, getErrorCodeMeta } = require("../src/utils/errorCatalog");

test("normalizeErrorCode converts mixed-case codes into uppercase snake case", () => {
  assert.equal(normalizeErrorCode("paymentPartialRevertFailed"), "PAYMENT_PARTIAL_REVERT_FAILED");
  assert.equal(normalizeErrorCode(" monitoring-disabled "), "MONITORING_DISABLED");
});

test("getErrorCodeMeta infers category and retryability", () => {
  assert.deepEqual(getErrorCodeMeta("LOGIN_RATE_LIMIT", 429), {
    code: "LOGIN_RATE_LIMIT",
    category: "RATE_LIMIT",
    retryable: true,
    severity: "warn",
  });

  assert.deepEqual(getErrorCodeMeta("MONITORING_ACCESS_DENIED", 401), {
    code: "MONITORING_ACCESS_DENIED",
    category: "AUTH",
    retryable: false,
    severity: "warn",
  });

  assert.deepEqual(getErrorCodeMeta("PAYMENT_NOT_FOUND", 404), {
    code: "PAYMENT_NOT_FOUND",
    category: "FINANCE",
    retryable: false,
    severity: "warn",
  });
});
