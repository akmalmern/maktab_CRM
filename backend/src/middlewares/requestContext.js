const { randomUUID } = require("crypto");
const { logger } = require("../utils/logger");
const { env } = require("../config/env");
const { recordHttpRequest } = require("../services/observability/metricsService");

function toBool(value, fallback = true) {
  if (value === undefined || value === null || value === "") return fallback;
  const raw = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(raw)) return true;
  if (["0", "false", "no", "n", "off"].includes(raw)) return false;
  return fallback;
}

function isTestRuntime() {
  return (
    process.argv.includes("--test") ||
    process.execArgv.includes("--test") ||
    Boolean(process.env.NODE_TEST_CONTEXT)
  );
}

function accessLogsEnabled() {
  return toBool(
    process.env.HTTP_ACCESS_LOGS,
    process.env.NODE_ENV !== "test" && !isTestRuntime(),
  );
}

function slowRequestWarnMs() {
  const raw = Number(env.SLOW_REQUEST_WARN_MS || 1500);
  return Number.isFinite(raw) && raw >= 0 ? raw : 1500;
}

function buildRouteKey(req) {
  if (req?.route?.path) {
    return `${req.baseUrl || ""}${req.route.path}`;
  }
  const rawPath = String(req?.originalUrl || req?.url || "").split("?")[0];
  return rawPath || "unmatched";
}

function buildRequestLogger(req, requestId) {
  return logger.child({
    requestId,
    method: req.method,
    path: req.originalUrl || req.url,
    ip: req.ip || req.socket?.remoteAddress || null,
  });
}

function requestContext(req, res, next) {
  const forwardedRequestId = req.headers["x-request-id"];
  const requestId =
    typeof forwardedRequestId === "string" && forwardedRequestId.trim()
      ? forwardedRequestId.trim().slice(0, 128)
      : randomUUID();

  const startedAt = process.hrtime.bigint();
  req.requestId = requestId;
  req.log = buildRequestLogger(req, requestId);
  res.locals.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const durationRounded = Number(durationMs.toFixed(1));
    const routeKey = buildRouteKey(req);

    recordHttpRequest({
      method: req.method,
      routeKey,
      statusCode: res.statusCode,
      durationMs: durationRounded,
      slowRequestWarnMs: slowRequestWarnMs(),
    });

    if (!accessLogsEnabled()) return;
    const level =
      res.statusCode >= 500
        ? "error"
        : res.statusCode >= 400 || durationMs >= slowRequestWarnMs()
          ? "warn"
          : "info";

    req.log[level]("http_request_completed", {
      statusCode: res.statusCode,
      durationMs: durationRounded,
      userId: req.user?.sub || null,
      routeKey,
    });
  });

  next();
}

module.exports = {
  requestContext,
};
