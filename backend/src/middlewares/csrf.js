const { ApiError } = require("../utils/apiError");

function readHeaderCsrf(req) {
  const direct = req.headers["x-csrf-token"];
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const alt = req.headers["x-xsrf-token"];
  if (typeof alt === "string" && alt.trim()) return alt.trim();
  return null;
}

function requireCsrfToken(req, _res, next) {
  const method = String(req.method || "GET").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return next();
  }

  const cookieToken = req.cookies?.csrfToken ? String(req.cookies.csrfToken) : null;
  const headerToken = readHeaderCsrf(req);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(
      new ApiError(403, "CSRF_TOKEN_INVALID", "CSRF token noto'g'ri yoki topilmadi"),
    );
  }

  return next();
}

module.exports = {
  requireCsrfToken,
};
