const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../src/app");
const { env } = require("../src/config/env");
const { resetMetrics } = require("../src/services/observability/metricsService");

async function withServer(fn) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  const port =
    typeof address === "object" && address
      ? address.port
      : Number.parseInt(String(address || "").split(":").pop(), 10);
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    return await fn(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test.beforeEach(() => {
  resetMetrics();
});

test("monitoring routes require a token when MONITORING_TOKEN is configured", async () => {
  const previousToken = env.MONITORING_TOKEN;
  env.MONITORING_TOKEN = "test-monitoring-token-123";

  try {
    await withServer(async (baseUrl) => {
      const denied = await fetch(`${baseUrl}/metrics`);
      const deniedBody = await denied.json();
      assert.equal(denied.status, 401);
      assert.equal(deniedBody.error?.code, "MONITORING_ACCESS_DENIED");

      const allowed = await fetch(`${baseUrl}/metrics`, {
        headers: { Authorization: `Bearer ${env.MONITORING_TOKEN}` },
      });
      const allowedBody = await allowed.json();
      assert.equal(allowed.status, 200);
      assert.equal(allowedBody.ok, true);
      assert.ok(allowedBody.metrics);
    });
  } finally {
    env.MONITORING_TOKEN = previousToken;
  }
});

test("monitoring routes stay operational when HTTP access logs are disabled", async () => {
  const previousToken = env.MONITORING_TOKEN;
  const previousAccessLogs = process.env.HTTP_ACCESS_LOGS;
  env.MONITORING_TOKEN = "test-monitoring-token-123";
  process.env.HTTP_ACCESS_LOGS = "false";

  try {
    await withServer(async (baseUrl) => {
      const health = await fetch(`${baseUrl}/health`);
      assert.equal(health.status, 200);

      const metricsRes = await fetch(`${baseUrl}/metrics`, {
        headers: { "x-monitoring-token": env.MONITORING_TOKEN },
      });
      const metricsBody = await metricsRes.json();
      assert.equal(metricsRes.status, 200);
      assert.equal(metricsBody.metrics.http.total, 1);
      assert.equal(metricsBody.metrics.http.byRoute["GET /health"], 1);
    });
  } finally {
    env.MONITORING_TOKEN = previousToken;
    if (previousAccessLogs === undefined) {
      delete process.env.HTTP_ACCESS_LOGS;
    } else {
      process.env.HTTP_ACCESS_LOGS = previousAccessLogs;
    }
  }
});

test("production mode without monitoring token returns MONITORING_DISABLED", async () => {
  const previousToken = env.MONITORING_TOKEN;
  const previousNodeEnv = env.NODE_ENV;
  env.MONITORING_TOKEN = undefined;
  env.NODE_ENV = "production";

  try {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/metrics`);
      const body = await response.json();

      assert.equal(response.status, 503);
      assert.equal(body.error?.code, "MONITORING_DISABLED");
      assert.equal(response.headers.get("x-error-code"), "MONITORING_DISABLED");
    });
  } finally {
    env.MONITORING_TOKEN = previousToken;
    env.NODE_ENV = previousNodeEnv;
  }
});
