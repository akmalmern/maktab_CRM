const { ApiError } = require("../utils/apiError");
const { mapPrismaError } = require("./prismaError");
const { tError } = require("../i18n");

function buildRouteNotFoundMessage(localized, meta) {
  if (!meta?.method || !meta?.path) return localized;
  return `${localized}: ${meta.method} ${meta.path}`;
}

function errorHandler(err, req, res, next) {
  const mapped = mapPrismaError(err);
  if (mapped) err = mapped;
  const lang = req?.lang || "uz";

  if (err instanceof ApiError) {
    let message = tError({
      code: err.code,
      req,
      locale: lang,
      fallbackMessage: err.message,
    });
    if (err.code === "ROUTE_NOT_FOUND") {
      message = buildRouteNotFoundMessage(message, err.meta);
    }

    return res.status(err.statusCode).json({
      ok: false,
      error: {
        code: err.code,
        message,
        lang,
        meta: err.meta,
      },
    });
  }

  const isProd = process.env.NODE_ENV === "production";
  const internalFallback = isProd ? "" : err?.message || "Unknown error";
  return res.status(500).json({
    ok: false,
    error: {
      code: "INTERNAL_ERROR",
      message: tError({
        code: "INTERNAL_ERROR",
        req,
        locale: lang,
        fallbackMessage: internalFallback,
      }),
      lang,
      meta: isProd ? null : { stack: err?.stack },
    },
  });
}

module.exports = { errorHandler };
