const test = require("node:test");
const assert = require("node:assert/strict");
const { env } = require("../src/config/env");
const { createMemoryRateLimiter, createRateLimiter } = require("../src/middlewares/rateLimit");

function createResponse() {
  const headers = {};
  return {
    headers,
    setHeader(name, value) {
      headers[name] = value;
    },
  };
}

function runMiddleware(middleware, req, res) {
  return new Promise((resolve) => {
    middleware(req, res, (err) => resolve(err || null));
  });
}

test("rate limiter blocks after max requests in window", async () => {
  const limiter = createMemoryRateLimiter({
    windowMs: 60_000,
    max: 2,
    code: "RATE_LIMITED",
    message: "Too many requests",
  });

  const req = { ip: "127.0.0.1", headers: {} };
  const res = createResponse();

  const firstError = await runMiddleware(limiter, req, res);
  const secondError = await runMiddleware(limiter, req, res);
  const thirdError = await runMiddleware(limiter, req, res);

  assert.equal(firstError, null);
  assert.equal(secondError, null);
  assert.equal(Boolean(thirdError), true);
  assert.equal(thirdError?.statusCode, 429);
  assert.equal(thirdError?.code, "RATE_LIMITED");
  assert.equal(res.headers["RateLimit-Limit"], "2");
  assert.equal(res.headers["RateLimit-Remaining"], "0");
  assert.ok(Number(res.headers["Retry-After"]) >= 59);
  assert.match(String(res.headers["RateLimit-Policy"] || ""), /^2;w=60$/);
});

test("rate limiter fails open outside production when store is unavailable", async () => {
  const previousNodeEnv = env.NODE_ENV;
  env.NODE_ENV = "development";

  try {
    const limiter = createRateLimiter({
      bucketName: "failing_dev_store",
      windowMs: 1_000,
      max: 1,
      store: {
        mode: "db",
        async consume() {
          throw new Error("store down");
        },
      },
    });

    const error = await runMiddleware(limiter, { ip: "127.0.0.1", headers: {} }, createResponse());
    assert.equal(error, null);
  } finally {
    env.NODE_ENV = previousNodeEnv;
  }
});

test("rate limiter fails closed in production when store is unavailable", async () => {
  const previousNodeEnv = env.NODE_ENV;
  env.NODE_ENV = "production";

  try {
    const limiter = createRateLimiter({
      bucketName: "failing_prod_store",
      windowMs: 1_000,
      max: 1,
      store: {
        mode: "db",
        async consume() {
          throw new Error("store down");
        },
      },
    });

    const error = await runMiddleware(limiter, { ip: "127.0.0.1", headers: {} }, createResponse());
    assert.equal(error?.statusCode, 503);
    assert.equal(error?.code, "RATE_LIMIT_STORE_UNAVAILABLE");
  } finally {
    env.NODE_ENV = previousNodeEnv;
  }
});
