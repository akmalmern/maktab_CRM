const { ApiError } = require("../utils/apiError");
const { mapPrismaError } = require("./prismaError");

function errorHandler(err, req, res, next) {
  const mapped = mapPrismaError(err);
  if (mapped) err = mapped;

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      ok: false,
      error: { code: err.code, message: err.message, meta: err.meta },
    });
  }

  const isProd = process.env.NODE_ENV === "production";
  return res.status(500).json({
    ok: false,
    error: {
      code: "INTERNAL_ERROR",
      message: isProd ? "Server xatoligi" : err?.message || "Unknown error",
      meta: isProd ? null : { stack: err?.stack },
    },
  });
}

module.exports = { errorHandler };
