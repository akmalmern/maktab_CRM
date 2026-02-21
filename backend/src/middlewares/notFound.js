const { ApiError } = require("../utils/apiError");

function notFound(req, res, next) {
  next(
    new ApiError(
      404,
      "ROUTE_NOT_FOUND",
      `Route topilmadi: ${req.method} ${req.originalUrl}`,
      { method: req.method, path: req.originalUrl },
    ),
  );
}
module.exports = { notFound };
