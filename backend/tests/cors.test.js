const test = require("node:test");
const assert = require("node:assert/strict");
const { parseOrigins, buildCorsOptions } = require("../src/config/cors");

test("parseOrigins splits and trims origins", () => {
  const origins = parseOrigins("http://a.com, http://b.com ,,");
  assert.deepEqual(origins, ["http://a.com", "http://b.com"]);
});

test("buildCorsOptions allows configured origins", async () => {
  process.env.CORS_ORIGINS = "http://localhost:5173";
  const options = buildCorsOptions();

  const allowed = await new Promise((resolve) => {
    options.origin("http://localhost:5173", (_err, ok) => resolve(ok));
  });
  const denied = await new Promise((resolve) => {
    options.origin("http://evil.com", (_err, ok) => resolve(ok));
  });

  assert.equal(allowed, true);
  assert.equal(denied, false);
});
