const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../src/app");

async function withServer(fn) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  const port =
    typeof address === "object" && address
      ? address.port
      : Number.parseInt(String(address || "").split(":").pop(), 10);
  if (!Number.isFinite(Number(port)) || Number(port) <= 0) {
    throw new Error(`Test server port topilmadi: ${String(address)}`);
  }
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    return await fn(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("i18n: lang=en returns english route-not-found message", async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/unknown-endpoint?lang=en`);
    const body = await res.json();

    assert.equal(res.status, 404);
    assert.equal(body.error?.code, "ROUTE_NOT_FOUND");
    assert.match(body.error?.message || "", /^Route not found:/);
    assert.equal(body.error?.lang, "en");
    assert.equal(res.headers.get("content-language"), "en");
  });
});

test("i18n: accept-language ru returns russian message", async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/unknown-endpoint`, {
      headers: { "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8" },
    });
    const body = await res.json();

    assert.equal(res.status, 404);
    assert.equal(body.error?.code, "ROUTE_NOT_FOUND");
    assert.match(body.error?.message || "", /^Маршрут не найден:/);
    assert.equal(body.error?.lang, "ru");
    assert.equal(res.headers.get("content-language"), "ru");
  });
});

test("i18n: unauthorized error translated by lang query", async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/teacher/jadval?lang=en`);
    const body = await res.json();

    assert.equal(res.status, 401);
    assert.equal(body.error?.code, "UNAUTHORIZED");
    assert.equal(body.error?.message, "Authentication is required");
    assert.equal(body.error?.lang, "en");
  });
});
