const test = require("node:test");
const assert = require("node:assert/strict");
const { createMemoryRateLimiter } = require("../src/middlewares/rateLimit");

test("rate limiter blocks after max requests in window", () => {
  const limiter = createMemoryRateLimiter({
    windowMs: 60_000,
    max: 2,
    code: "RATE_LIMITED",
    message: "Too many requests",
  });

  const req = { ip: "127.0.0.1", headers: {} };
  const res = { setHeader() {} };

  let firstPassed = false;
  let secondPassed = false;
  let thirdError = null;

  limiter(req, res, (err) => {
    firstPassed = !err;
  });
  limiter(req, res, (err) => {
    secondPassed = !err;
  });
  limiter(req, res, (err) => {
    thirdError = err;
  });

  assert.equal(firstPassed, true);
  assert.equal(secondPassed, true);
  assert.equal(Boolean(thirdError), true);
  assert.equal(thirdError?.statusCode, 429);
});
