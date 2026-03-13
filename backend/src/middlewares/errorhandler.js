const { ApiError } = require("../utils/apiError");
const { getErrorCodeMeta } = require("../utils/errorCatalog");
const { mapPrismaError } = require("./prismaError");
const { tError } = require("../i18n");
const { logger, serializeError } = require("../utils/logger");
const { recordApiError } = require("../services/observability/metricsService");

function buildRouteNotFoundMessage(localized, meta) {
  if (!meta?.method || !meta?.path) return localized;
  return `${localized}: ${meta.method} ${meta.path}`;
}

function errorHandler(err, req, res, next) {
  const mapped = mapPrismaError(err);
  if (mapped) err = mapped;
  const lang = req?.lang || "uz";
  const requestId = req?.requestId || null;
  const requestLogger = req?.log || logger.child({
    requestId,
    method: req?.method,
    path: req?.originalUrl || req?.url,
  });

  if (err instanceof ApiError) {
    const codeMeta = getErrorCodeMeta(err.code, err.statusCode);
    let message = tError({
      code: err.code,
      req,
      locale: lang,
      fallbackMessage: err.message,
    });
    if (err.code === "ROUTE_NOT_FOUND") {
      message = buildRouteNotFoundMessage(message, err.meta);
    }
    const logLevel = codeMeta.severity;
    recordApiError({
      code: err.code,
      category: codeMeta.category,
    });
    res.setHeader("X-Error-Code", err.code);
    requestLogger[logLevel]("api_error", {
      code: err.code,
      statusCode: err.statusCode,
      category: codeMeta.category,
      retryable: codeMeta.retryable,
      meta: err.meta || null,
      error: err.statusCode >= 500 ? serializeError(err) : null,
    });

    return res.status(err.statusCode).json({
      ok: false,
      error: {
        code: err.code,
        category: codeMeta.category,
        retryable: codeMeta.retryable,
        severity: codeMeta.severity,
        message,
        lang,
        requestId,
        meta: err.meta,
      },
    });
  }

  const isProd = process.env.NODE_ENV === "production";
  const internalFallback = isProd ? "" : err?.message || "Unknown error";
  const internalMeta = getErrorCodeMeta("INTERNAL_ERROR", 500);
  recordApiError({
    code: internalMeta.code,
    category: internalMeta.category,
  });
  res.setHeader("X-Error-Code", internalMeta.code);
  requestLogger.error("unhandled_error", {
    error: serializeError(err),
  });
  return res.status(500).json({
    ok: false,
    error: {
      code: "INTERNAL_ERROR",
      category: internalMeta.category,
      retryable: internalMeta.retryable,
      severity: internalMeta.severity,
      message: tError({
        code: "INTERNAL_ERROR",
        req,
        locale: lang,
        fallbackMessage: internalFallback,
      }),
      lang,
      requestId,
      meta: isProd ? null : { stack: err?.stack },
    },
  });
}

module.exports = { errorHandler };
