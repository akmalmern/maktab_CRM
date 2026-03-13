const test = require("node:test");
const assert = require("node:assert/strict");
const {
  recordHttpRequest,
  recordApiError,
  recordAuthEvent,
  recordRateLimitDecision,
  snapshotMetrics,
  renderPrometheusMetrics,
  resetMetrics,
} = require("../src/services/observability/metricsService");

test.beforeEach(() => {
  resetMetrics();
});

test("metrics service records HTTP, error, auth, and rate-limit counters", () => {
  recordHttpRequest({
    method: "GET",
    routeKey: "/api/admin/finance",
    statusCode: 200,
    durationMs: 25,
    slowRequestWarnMs: 100,
  });
  recordHttpRequest({
    method: "POST",
    routeKey: "/api/auth/login",
    statusCode: 503,
    durationMs: 250,
    slowRequestWarnMs: 100,
  });
  recordApiError({ code: "RATE_LIMIT_STORE_UNAVAILABLE", category: "RATE_LIMIT" });
  recordAuthEvent({ action: "AUTH_LOGIN", outcome: "FAILURE" });
  recordRateLimitDecision({
    bucketName: "auth_login",
    outcome: "BLOCKED",
    storeMode: "db",
  });

  const snapshot = snapshotMetrics();

  assert.equal(snapshot.http.total, 2);
  assert.equal(snapshot.http.slowRequests, 1);
  assert.equal(snapshot.http.byStatusClass["2xx"], 1);
  assert.equal(snapshot.http.byStatusClass["5xx"], 1);
  assert.equal(snapshot.http.byRoute["GET /api/admin/finance"], 1);
  assert.equal(snapshot.http.byRoute["POST /api/auth/login"], 1);
  assert.equal(snapshot.errors.byCode.RATE_LIMIT_STORE_UNAVAILABLE, 1);
  assert.equal(snapshot.errors.byCategory.RATE_LIMIT, 1);
  assert.equal(snapshot.auth.byAction["AUTH_LOGIN:FAILURE"], 1);
  assert.equal(snapshot.rateLimit.byBucket["auth_login:BLOCKED:db"], 1);
});

test("prometheus renderer exports counters in text format", () => {
  recordHttpRequest({
    method: "GET",
    routeKey: "/health",
    statusCode: 200,
    durationMs: 15,
    slowRequestWarnMs: 100,
  });
  recordApiError({ code: "MONITORING_DISABLED", category: "AUTH" });
  recordAuthEvent({ action: "AUTH_REFRESH", outcome: "SUCCESS" });
  recordRateLimitDecision({
    bucketName: "auth_refresh",
    outcome: "ALLOWED",
    storeMode: "memory",
  });

  const output = renderPrometheusMetrics();

  assert.match(output, /maktab_crm_http_requests_total 1/);
  assert.match(output, /maktab_crm_error_code_total\{code="MONITORING_DISABLED"\} 1/);
  assert.match(output, /maktab_crm_auth_events_total\{action="AUTH_REFRESH",outcome="SUCCESS"\} 1/);
  assert.match(output, /maktab_crm_rate_limit_total\{bucket="auth_refresh",outcome="ALLOWED",store="memory"\} 1/);
});
