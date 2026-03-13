const startedAt = Date.now();

const state = {
  httpTotal: 0,
  httpByStatusClass: new Map(),
  httpByRoute: new Map(),
  slowRequests: 0,
  errorByCode: new Map(),
  errorByCategory: new Map(),
  authByAction: new Map(),
  rateLimitByBucket: new Map(),
};

function resetMetrics() {
  state.httpTotal = 0;
  state.httpByStatusClass.clear();
  state.httpByRoute.clear();
  state.slowRequests = 0;
  state.errorByCode.clear();
  state.errorByCategory.clear();
  state.authByAction.clear();
  state.rateLimitByBucket.clear();
}

function incrementCounter(map, key, amount = 1) {
  map.set(key, Number(map.get(key) || 0) + amount);
}

function mapToSortedObject(map) {
  return Object.fromEntries(
    [...map.entries()].sort(([left], [right]) => String(left).localeCompare(String(right))),
  );
}

function buildRouteMetricKey({ method, routeKey }) {
  return `${String(method || "GET").toUpperCase()} ${routeKey || "unmatched"}`;
}

function recordHttpRequest({ method, routeKey, statusCode, durationMs, slowRequestWarnMs = 1500 }) {
  state.httpTotal += 1;
  const statusClass = `${Math.floor(Number(statusCode || 0) / 100) || 0}xx`;
  incrementCounter(state.httpByStatusClass, statusClass);
  incrementCounter(state.httpByRoute, buildRouteMetricKey({ method, routeKey }));
  if (Number(durationMs || 0) >= Number(slowRequestWarnMs || 1500)) {
    state.slowRequests += 1;
  }
}

function recordApiError({ code, category }) {
  incrementCounter(state.errorByCode, code || "UNKNOWN");
  incrementCounter(state.errorByCategory, category || "APPLICATION");
}

function recordAuthEvent({ action, outcome }) {
  incrementCounter(state.authByAction, `${action || "AUTH"}:${outcome || "UNKNOWN"}`);
}

function recordRateLimitDecision({ bucketName, outcome, storeMode }) {
  incrementCounter(
    state.rateLimitByBucket,
    `${bucketName || "default"}:${outcome || "UNKNOWN"}:${storeMode || "unknown"}`,
  );
}

function snapshotMetrics() {
  const memory = process.memoryUsage();
  return {
    generatedAt: new Date().toISOString(),
    uptimeSec: Number(process.uptime().toFixed(0)),
    process: {
      pid: process.pid,
      rssMb: Number((memory.rss / 1024 / 1024).toFixed(1)),
      heapUsedMb: Number((memory.heapUsed / 1024 / 1024).toFixed(1)),
      heapTotalMb: Number((memory.heapTotal / 1024 / 1024).toFixed(1)),
      startedAt: new Date(startedAt).toISOString(),
    },
    http: {
      total: state.httpTotal,
      slowRequests: state.slowRequests,
      byStatusClass: mapToSortedObject(state.httpByStatusClass),
      byRoute: mapToSortedObject(state.httpByRoute),
    },
    errors: {
      byCode: mapToSortedObject(state.errorByCode),
      byCategory: mapToSortedObject(state.errorByCategory),
    },
    auth: {
      byAction: mapToSortedObject(state.authByAction),
    },
    rateLimit: {
      byBucket: mapToSortedObject(state.rateLimitByBucket),
    },
  };
}

function escapePrometheusLabelValue(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function renderPrometheusMetrics() {
  const snapshot = snapshotMetrics();
  const lines = [
    "# HELP maktab_crm_uptime_seconds Process uptime in seconds",
    "# TYPE maktab_crm_uptime_seconds gauge",
    `maktab_crm_uptime_seconds ${snapshot.uptimeSec}`,
    "# HELP maktab_crm_http_requests_total HTTP requests total",
    "# TYPE maktab_crm_http_requests_total counter",
    `maktab_crm_http_requests_total ${snapshot.http.total}`,
    "# HELP maktab_crm_http_slow_requests_total Slow HTTP requests total",
    "# TYPE maktab_crm_http_slow_requests_total counter",
    `maktab_crm_http_slow_requests_total ${snapshot.http.slowRequests}`,
  ];

  Object.entries(snapshot.http.byStatusClass).forEach(([statusClass, value]) => {
    lines.push(`maktab_crm_http_status_class_total{status_class="${escapePrometheusLabelValue(statusClass)}"} ${value}`);
  });

  Object.entries(snapshot.errors.byCode).forEach(([code, value]) => {
    lines.push(`maktab_crm_error_code_total{code="${escapePrometheusLabelValue(code)}"} ${value}`);
  });

  Object.entries(snapshot.errors.byCategory).forEach(([category, value]) => {
    lines.push(`maktab_crm_error_category_total{category="${escapePrometheusLabelValue(category)}"} ${value}`);
  });

  Object.entries(snapshot.auth.byAction).forEach(([key, value]) => {
    const [action, outcome] = String(key).split(":");
    lines.push(
      `maktab_crm_auth_events_total{action="${escapePrometheusLabelValue(action)}",outcome="${escapePrometheusLabelValue(outcome)}"} ${value}`,
    );
  });

  Object.entries(snapshot.rateLimit.byBucket).forEach(([key, value]) => {
    const [bucketName, outcome, storeMode] = String(key).split(":");
    lines.push(
      `maktab_crm_rate_limit_total{bucket="${escapePrometheusLabelValue(bucketName)}",outcome="${escapePrometheusLabelValue(outcome)}",store="${escapePrometheusLabelValue(storeMode)}"} ${value}`,
    );
  });

  return `${lines.join("\n")}\n`;
}

module.exports = {
  recordHttpRequest,
  recordApiError,
  recordAuthEvent,
  recordRateLimitDecision,
  snapshotMetrics,
  renderPrometheusMetrics,
  resetMetrics,
};
