const baseUrl = String(process.env.RELEASE_BASE_URL || "").trim();
const monitoringToken = String(process.env.MONITORING_TOKEN || "").trim();

if (!baseUrl) {
  console.error("RELEASE_BASE_URL majburiy. Masalan: http://localhost:5000");
  process.exit(1);
}

async function assertJsonEndpoint(url, { headers = {}, expectedStatus = 200, label }) {
  const response = await fetch(url, { headers });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (response.status !== expectedStatus) {
    console.error(`[FAIL] ${label}: status=${response.status}`, payload);
    process.exit(1);
  }

  console.log(`[OK] ${label}: status=${response.status}`);
  return payload;
}

await assertJsonEndpoint(`${baseUrl}/health`, {
  label: "health",
});

await assertJsonEndpoint(`${baseUrl}/ready`, {
  label: "ready",
});

if (monitoringToken) {
  await assertJsonEndpoint(`${baseUrl}/metrics`, {
    label: "metrics",
    headers: {
      "x-monitoring-token": monitoringToken,
    },
  });
} else {
  console.log("[SKIP] metrics: MONITORING_TOKEN berilmagan");
}

console.log("[DONE] read-only release smoke tugadi");
